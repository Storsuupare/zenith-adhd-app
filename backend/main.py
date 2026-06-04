from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from auth import get_current_user
from datetime import datetime, timezone
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
import os
import threading
import Tasks
import TaskLifecycle
import warden
from database import get_db_connection

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    thread = threading.Thread(target=warden.start, daemon=True)
    thread.start()
    yield


app = FastAPI(lifespan=lifespan)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
# Global default (300/15min) is enforced by SlowAPIMiddleware on every route.
# Tighter per-route limits are applied with @limiter.limit() on specific endpoints.
limiter = Limiter(key_func=get_remote_address, default_limits=["300/15minutes"])
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

async def _rate_limit_json_handler(_request: Request, _exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "TOO_MANY_REQUESTS"})

app.add_exception_handler(RateLimitExceeded, _rate_limit_json_handler)




app.include_router(Tasks.router,         prefix="/tasks",    tags=["Mission Control"])
app.include_router(TaskLifecycle.router, prefix="/tasks",    tags=["Task Lifecycle"])




@app.get("/security/check", tags=["Anti-Cheat"])
async def security_check(external_id: str):
    """
    Read-only gate called by server.js before every task creation.
    Checks penalty lockout and concurrent session — no mutations.
    Returns {allowed, reason, minutes_left?}.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(t.id) FILTER (WHERE t.status = 'ACTIVE') AS active_count
                FROM users u
                LEFT JOIN tasks t ON t.user_id = u.id::text
                WHERE u.external_id = %s
                GROUP BY u.id
                """,
                (external_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

            active_count = row[0]

            if int(active_count) > 0:
                return {"allowed": False, "reason": "ACTIVE_SESSION_EXISTS"}

            return {"allowed": True}
    finally:
        conn.close()


@app.get("/health")
async def health():
    return {"status": "ZENITH_ONLINE", "routes": ["/system/profile/{clerk_id}", "/system/modules/{clerk_id}", "/system/contracts/{id}/complete"]}


RARITY_MULTIPLIERS   = {1: 1.0, 2: 1.5, 3: 2.0, 4: 3.0}
TIER_XP_MULTIPLIERS  = {0: 1.0, 1: 1.5, 2: 2.0}


# ============================================================
# SYSTEM RESOURCE ENDPOINTS
# ============================================================

@app.post("/system/contracts/{contract_id}/complete")
@limiter.limit("60/hour")
async def complete_system_contract(request: Request, contract_id: int, clerk_id: str = Depends(get_current_user)):
    """
    Complete a system contract.
    - Applies rarity_tier multiplier to xp_reward and credit_reward
    - Increments system_version when experience_data crosses 1000 * version
    - Atomic: marks contract SUCCESS + persists user stats in one transaction
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_version, 1),
                      COALESCE(experience_data, 0),
                      COALESCE(system_credits, 0)
               FROM users WHERE external_id = %s""",
            (clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, sys_ver, exp_data, credits = row

        cur.execute(
            """SELECT COALESCE(rarity_tier, 1),
                      COALESCE(credit_reward, 50),
                      COALESCE(xp_reward, 100),
                      status
               FROM contracts WHERE id = %s AND user_id = %s""",
            (contract_id, user_id),
        )
        contract = cur.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="CONTRACT_NOT_FOUND")
        rarity_tier, credit_reward, xp_reward, status = contract

        if status != "ACTIVE":
            raise HTTPException(status_code=400, detail="CONTRACT_ALREADY_RESOLVED")

        # ── Reward calculation ──────────────────────────────────────────
        mult          = RARITY_MULTIPLIERS.get(rarity_tier, 1.0)
        final_xp      = int(xp_reward * mult)
        final_credits = int(credit_reward * mult)

        new_exp  = exp_data + final_xp
        new_ver  = sys_ver
        versioned_up = False
        threshold = 1000 * new_ver
        while new_exp >= threshold:
            new_exp   -= threshold
            new_ver   += 1
            threshold  = 1000 * new_ver
            versioned_up = True

        new_credits = credits + final_credits

        # ── Atomic persistence ──────────────────────────────────────────
        cur.execute(
            """UPDATE users
               SET experience_data = %s,
                   system_version  = %s,
                   system_credits  = %s
               WHERE id = %s""",
            (new_exp, new_ver, new_credits, user_id),
        )

        cur.execute(
            "UPDATE contracts SET status = 'SUCCESS', is_failed = false WHERE id = %s",
            (contract_id,),
        )

        conn.commit()

        return {
            "success": True,
            "xp_gained": final_xp,
            "credits_gained": final_credits,
            "version_up": versioned_up,
            "system_state": {
                "system_version": new_ver,
                "experience_data": new_exp,
                "system_credits": new_credits,
            },
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.get("/system/profile")
async def get_system_profile(clerk_id: str = Depends(get_current_user)):
    """
    Fetch the user's System State. Updates last_reboot on every call.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_version, 1),
                      COALESCE(experience_data, 0),
                      COALESCE(system_credits, 0),
                      COALESCE(role, 'FREE'),
                      COALESCE(account_tier, 0)
               FROM users WHERE external_id = %s""",
            (clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, sys_ver, exp_data, credits, role, account_tier = row

        now = datetime.now(timezone.utc)

        cur.execute(
            "UPDATE users SET last_reboot = %s WHERE id = %s",
            (now, user_id),
        )
        conn.commit()

        xp_threshold = 1000 * sys_ver
        xp_within = exp_data % xp_threshold if xp_threshold else 0

        return {
            "system_version": sys_ver,
            "experience_data": exp_data,
            "xp_within_version": xp_within,
            "xp_threshold": xp_threshold,
            "xp_progress_percent": round((xp_within / xp_threshold) * 100, 1) if xp_threshold else 0,
            "system_credits": credits,
            "last_reboot": now.isoformat(),
            "role": role,
            "account_tier": account_tier,
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.get("/system/modules/{clerk_id}")
async def get_system_modules(clerk_id: str):
    """
    Return all system_modules for a user, differentiated as INSTALLED or OWNED.
    Frontend uses the status field to conditionally render install/activate buttons.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE external_id = %s", (clerk_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id = row[0]

        cur.execute(
            """SELECT id, module_name, module_type, is_installed
               FROM system_modules
               WHERE owner_id = %s
               ORDER BY is_installed DESC, module_name ASC""",
            (user_id,),
        )
        rows = cur.fetchall()

        modules = [
            {
                "id": r[0],
                "module_name": r[1],
                "module_type": r[2],
                "is_installed": r[3],
                "status": "INSTALLED" if r[3] else "OWNED",
            }
            for r in rows
        ]

        return {
            "modules": modules,
            "installed_count": sum(1 for m in modules if m["is_installed"]),
            "owned_count": len(modules),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================================
# CONTRACT REWARD
# ============================================================

@app.post("/system/contract-reward")
@limiter.limit("60/hour")
async def apply_contract_reward(request: Request, clerk_id: str = Depends(get_current_user)):
    """
    System-level reward for completing any contract:
    +500 Credits, +100 Experience Data.
    Increments system_version when experience_data crosses 1000 * version.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_credits, 0),
                      COALESCE(experience_data, 0),
                      COALESCE(system_version, 1)
               FROM users WHERE external_id = %s""",
            (clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, credits, exp_data, sys_ver = row

        new_credits = credits + 500
        new_exp     = exp_data + 100
        new_ver     = sys_ver
        versioned_up = False
        threshold = 1000 * new_ver
        while new_exp >= threshold:
            new_exp     -= threshold
            new_ver     += 1
            threshold    = 1000 * new_ver
            versioned_up = True

        cur.execute(
            """UPDATE users
               SET system_credits  = %s,
                   experience_data = %s,
                   system_version  = %s
               WHERE id = %s""",
            (new_credits, new_exp, new_ver, user_id),
        )
        conn.commit()

        return {
            "success": True,
            "rewards": {"credits": 500, "xp": 100},
            "version_up": versioned_up,
            "system_state": {
                "system_credits":  new_credits,
                "experience_data": new_exp,
                "system_version":  new_ver,
            },
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================================
# UPGRADE TEST ENDPOINT (sets tier instantly for testing)
# ============================================================

class UpgradeTest(BaseModel):
    clerk_id: str
    target_tier: int = 1  

TIER_ROLES = {1: "PRO", 2: "ELITE"}

@app.post("/api/user/upgrade-test")
async def upgrade_test(req: UpgradeTest):
    if os.getenv("ENABLE_TEST_ENDPOINTS", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    if req.target_tier not in (1, 2):
        raise HTTPException(status_code=400, detail="target_tier must be 1 or 2")
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            """UPDATE users
               SET account_tier = %s, role = %s
               WHERE external_id = %s
               RETURNING id, account_tier, role""",
            (req.target_tier, TIER_ROLES[req.target_tier], req.clerk_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        conn.commit()
        return {"success": True, "account_tier": row[1], "role": row[2]}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================================
# TIER-AWARE TASK COMPLETION
# ============================================================

class TierTaskComplete(BaseModel):
    base_xp: int = 100


@app.post("/system/tasks/complete")
@limiter.limit("60/hour")
async def complete_task_with_tier(request: Request, req: TierTaskComplete, clerk_id: str = Depends(get_current_user)):
    """
    Award XP scaled by the user's account_tier:
      Tier 0 → 1.0x  |  Tier 1 → 1.5x  |  Tier 2 → 2.0x
    Updates experience_data and increments system_version on threshold cross.
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(account_tier, 0),
                      COALESCE(experience_data, 0),
                      COALESCE(system_version, 1)
               FROM users WHERE external_id = %s""",
            (clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, account_tier, exp_data, sys_ver = row

        mult      = TIER_XP_MULTIPLIERS.get(account_tier, 1.0)
        final_xp  = int(req.base_xp * mult)

        new_exp      = exp_data + final_xp
        new_ver      = sys_ver
        versioned_up = False
        threshold    = 1000 * new_ver
        while new_exp >= threshold:
            new_exp      -= threshold
            new_ver      += 1
            threshold     = 1000 * new_ver
            versioned_up  = True

        cur.execute(
            """UPDATE users
               SET experience_data = %s,
                   system_version  = %s
               WHERE id = %s""",
            (new_exp, new_ver, user_id),
        )
        conn.commit()

        return {
            "success":      True,
            "base_xp":      req.base_xp,
            "multiplier":   mult,
            "xp_awarded":   final_xp,
            "account_tier": account_tier,
            "version_up":   versioned_up,
            "system_state": {
                "experience_data": new_exp,
                "system_version":  new_ver,
            },
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================================
# ELEVATION CHART — 7-DAY FOCUS STATS
# ============================================================

@app.get("/api/stats/elevation", tags=["Stats"])
async def get_elevation_stats(clerk_id: str):
    """
    Return the last 7 days of focus minutes for a user.
    Days with no completed tasks are included with minutes = 0,
    guaranteed via generate_series on the PostgreSQL side.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE external_id = %s", (clerk_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id = row[0]

        cur.execute(
            """
            SELECT
                gs.day::date                               AS date,
                TO_CHAR(gs.day, 'Dy')                     AS day,
                COALESCE(SUM(t.duration_minutes)::int, 0)  AS minutes
            FROM generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS gs(day)
            LEFT JOIN tasks t ON (
                t.completed_at::date = gs.day::date
                AND t.user_id::text  = %s::text
                AND t.status         = 'SUCCESS'
            )
            GROUP BY gs.day
            ORDER BY gs.day ASC
            """,
            (str(user_id),),
        )
        rows = cur.fetchall()
        return [
            {"date": str(r[0]), "day": r[1], "minutes": r[2]}
            for r in rows
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ============================================================
# SUMMIT HISTORY
# ============================================================

@app.get("/api/stats/summit-history", tags=["Stats"])
async def get_summit_history(clerk_id: str, limit: int = 12):
    """
    Return the most recent completed focus sessions for a user.
    Each row is one session — not aggregated — so the chart shows
    individual peaks rather than daily totals.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE external_id = %s", (clerk_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id = row[0]

        cur.execute(
            """
            SELECT
                t.id,
                t.duration_minutes                              AS minutes,
                TO_CHAR(t.completed_at AT TIME ZONE 'UTC', 'Mon DD') AS label,
                COALESCE(t.title, 'Mission')                   AS title,
                t.completed_at
            FROM tasks t
            WHERE t.user_id = %s
              AND t.status  = 'SUCCESS'
              AND t.completed_at IS NOT NULL
            ORDER BY t.completed_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        rows = cur.fetchall()
        # Reverse so the oldest is on the left of the chart
        rows = list(reversed(rows))
        return [
            {
                "id":           r[0],
                "minutes":      r[1],
                "label":        r[2],
                "title":        r[3],
                "completed_at": str(r[4]),
            }
            for r in rows
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("HOST"),
        port=int(os.getenv("PYTHON_PORT", 8000)),
    )