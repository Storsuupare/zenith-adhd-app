from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ZENITH_ONLINE", "routes": ["/system/profile/{clerk_id}", "/system/modules/{clerk_id}", "/system/contracts/{id}/complete"]}


BANDWIDTH_REGEN_PER_HOUR = 10

RARITY_MULTIPLIERS   = {1: 1.0, 2: 1.5, 3: 2.0, 4: 3.0}
TIER_XP_MULTIPLIERS  = {0: 1.0, 1: 1.5, 2: 2.0}

def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

class TaskCompletion(BaseModel):
    user_id: int
    skill_name: str
    duration_minutes: int
    status: str

@app.post("/complete-task")
async def complete_task(task: TaskCompletion):
    if task.status != 'SUCCESS':
        return {"message": "No progress recorded for failed sessions!"}

    m = task.duration_minutes
    if m >= 120:   multiplier = 150 # 18,000 XP
    elif m >= 90:  multiplier = 120 # 10,800 XP
    elif m >= 60:  multiplier = 100 # 6,000 XP
    elif m >= 30:  multiplier = 50  # 1,500 XP
    elif m >= 15:  multiplier = 30  # 450 XP
    else:          multiplier = 20  # 100 XP

    xp_gained = m * multiplier
    
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT xp, level, next_level_xp FROM skills WHERE user_id = %s AND name = %s;", 
                    (task.user_id, task.skill_name))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Skill not found")

        current_xp, current_level, next_level_xp = result
        new_xp = current_xp + xp_gained
        new_level = current_level
        new_next_level_xp = next_level_xp

        while new_xp >= new_next_level_xp:
            new_xp -= new_next_level_xp
            new_level += 1
            new_next_level_xp = int(new_next_level_xp * 1.5)

        cur.execute("""
            UPDATE skills SET xp = %s, level = %s, next_level_xp = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND name = %s;
        """, (new_xp, new_level, new_next_level_xp, task.user_id, task.skill_name))

        cur.execute("""
            INSERT INTO activity_log (user_id, title, duration_minutes, status, xp_gained)
            VALUES (%s, %s, %s, %s, %s);
        """, (task.user_id, f"LEGENDARY FOCUS: {task.skill_name}", m, task.status, xp_gained))

        conn.commit()
        return {"status": "SUCCESS", "xp_earned": xp_gained, "new_level": new_level}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ============================================================
# SYSTEM RESOURCE ENDPOINTS
# ============================================================

class SystemContractComplete(BaseModel):
    clerk_id: str


@app.post("/system/contracts/{contract_id}/complete")
async def complete_system_contract(contract_id: int, req: SystemContractComplete):
    """
    Complete a system contract.
    - Validates Neural Bandwidth >= bandwidth_cost (403 if overloaded)
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
                      COALESCE(system_credits, 0),
                      COALESCE(current_bandwidth, 100),
                      COALESCE(max_bandwidth, 100)
               FROM users WHERE external_id = %s""",
            (req.clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, sys_ver, exp_data, credits, cur_bw, max_bw = row

        cur.execute(
            """SELECT COALESCE(rarity_tier, 1),
                      COALESCE(bandwidth_cost, 10),
                      COALESCE(credit_reward, 50),
                      COALESCE(xp_reward, 100),
                      status
               FROM contracts WHERE id = %s AND user_id = %s""",
            (contract_id, user_id),
        )
        contract = cur.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="CONTRACT_NOT_FOUND")
        rarity_tier, bw_cost, credit_reward, xp_reward, status = contract

        if status != "ACTIVE":
            raise HTTPException(status_code=400, detail="CONTRACT_ALREADY_RESOLVED")

        if cur_bw < bw_cost:
            raise HTTPException(
                status_code=403,
                detail="SYSTEM_OVERLOAD: Insufficient Neural Bandwidth",
            )

        # ── Reward calculation ──────────────────────────────────────────
        mult         = RARITY_MULTIPLIERS.get(rarity_tier, 1.0)
        final_xp     = int(xp_reward * mult)
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

        new_bw      = max(0, cur_bw - bw_cost)
        new_credits = credits + final_credits

        # ── Atomic persistence ──────────────────────────────────────────
        cur.execute(
            """UPDATE users
               SET experience_data   = %s,
                   system_version    = %s,
                   system_credits    = %s,
                   current_bandwidth = %s
               WHERE id = %s""",
            (new_exp, new_ver, new_credits, new_bw, user_id),
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
                "current_bandwidth": new_bw,
                "max_bandwidth": max_bw,
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


@app.get("/system/profile/{clerk_id}")
async def get_system_profile(clerk_id: str):
    """
    Fetch the user's System State and apply passive Neural Bandwidth regeneration.
    Bandwidth regenerates at BANDWIDTH_REGEN_PER_HOUR units/hour since last_reboot,
    capped at max_bandwidth. Updates last_reboot to now on every call.
    Battery-safe: only runs on explicit fetch, no server-side polling.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_version, 1),
                      COALESCE(experience_data, 0),
                      COALESCE(system_credits, 0),
                      COALESCE(current_bandwidth, 100),
                      COALESCE(max_bandwidth, 100),
                      last_reboot,
                      COALESCE(role, 'FREE'),
                      COALESCE(account_tier, 0)
               FROM users WHERE external_id = %s""",
            (clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, sys_ver, exp_data, credits, cur_bw, max_bw, last_reboot, role, account_tier = row

        now = datetime.now(timezone.utc)
        if last_reboot:
            if last_reboot.tzinfo is None:
                last_reboot = last_reboot.replace(tzinfo=timezone.utc)
            elapsed_hours = (now - last_reboot).total_seconds() / 3600.0
            regen = elapsed_hours * BANDWIDTH_REGEN_PER_HOUR
            new_bw = min(cur_bw + int(regen), max_bw)
        else:
            new_bw = cur_bw

        cur.execute(
            "UPDATE users SET current_bandwidth = %s, last_reboot = %s WHERE id = %s",
            (new_bw, now, user_id),
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
            "current_bandwidth": new_bw,
            "max_bandwidth": max_bw,
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
# SHOP
# ============================================================

SHOP_CATALOG = [
    {
        "id": "bandwidth_injector",
        "name": "Bandwidth Injector",
        "cost": 500,
        "effect_desc": "+50 Current Bandwidth",
        "icon": "◈",
        "tier": "STANDARD",
    },
    {
        "id": "neural_buffer",
        "name": "Neural Buffer",
        "cost": 2500,
        "effect_desc": "+20 Max Bandwidth (Permanent)",
        "icon": "⬡",
        "tier": "ADVANCED",
    },
    {
        "id": "kernel_optimizer",
        "name": "Kernel Optimizer",
        "cost": 5000,
        "effect_desc": "Reduces all active Task Bandwidth costs by 2",
        "icon": "▣",
        "tier": "ELITE",
    },
]


@app.get("/system/shop/catalog")
async def get_shop_catalog():
    return {"items": SHOP_CATALOG}


class ShopPurchase(BaseModel):
    clerk_id: str
    item_id: str


@app.post("/system/shop/purchase")
async def shop_purchase(req: ShopPurchase):
    item = next((i for i in SHOP_CATALOG if i["id"] == req.item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="ITEM_NOT_FOUND")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_credits, 0),
                      COALESCE(current_bandwidth, 100),
                      COALESCE(max_bandwidth, 100)
               FROM users WHERE external_id = %s""",
            (req.clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, credits, cur_bw, max_bw = row

        if credits < item["cost"]:
            raise HTTPException(
                status_code=402,
                detail=f"INSUFFICIENT_CREDITS: need {item['cost']}, have {credits}",
            )

        if req.item_id == "bandwidth_injector":
            cur.execute(
                """UPDATE users
                   SET system_credits    = system_credits - %s,
                       current_bandwidth = LEAST(current_bandwidth + 50, max_bandwidth)
                   WHERE id = %s""",
                (item["cost"], user_id),
            )
        elif req.item_id == "neural_buffer":
            cur.execute(
                """UPDATE users
                   SET system_credits    = system_credits - %s,
                       max_bandwidth     = max_bandwidth + 20,
                       current_bandwidth = LEAST(current_bandwidth + 20, max_bandwidth + 20)
                   WHERE id = %s""",
                (item["cost"], user_id),
            )
        elif req.item_id == "kernel_optimizer":
            cur.execute(
                "UPDATE users SET system_credits = system_credits - %s WHERE id = %s",
                (item["cost"], user_id),
            )
            cur.execute(
                """UPDATE contracts
                   SET bandwidth_cost = GREATEST(0, COALESCE(bandwidth_cost, 10) - 2)
                   WHERE user_id = %s AND status = 'ACTIVE'""",
                (user_id,),
            )

        conn.commit()

        cur.execute(
            """SELECT COALESCE(system_credits, 0),
                      COALESCE(current_bandwidth, 100),
                      COALESCE(max_bandwidth, 100),
                      COALESCE(system_version, 1),
                      COALESCE(experience_data, 0)
               FROM users WHERE id = %s""",
            (user_id,),
        )
        updated = cur.fetchone()

        return {
            "success": True,
            "item_purchased": item["name"],
            "system_state": {
                "system_credits":     updated[0],
                "current_bandwidth":  updated[1],
                "max_bandwidth":      updated[2],
                "system_version":     updated[3],
                "experience_data":    updated[4],
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
# CONTRACT REWARD
# ============================================================

class ContractReward(BaseModel):
    clerk_id: str


@app.post("/system/contract-reward")
async def apply_contract_reward(req: ContractReward):
    """
    System-level reward for completing any contract:
    +500 Credits, +100 Experience Data, -15 Neural Bandwidth.
    Increments system_version when experience_data crosses 1000 * version.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT id,
                      COALESCE(system_credits, 0),
                      COALESCE(experience_data, 0),
                      COALESCE(system_version, 1),
                      COALESCE(current_bandwidth, 100),
                      COALESCE(max_bandwidth, 100)
               FROM users WHERE external_id = %s""",
            (req.clerk_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
        user_id, credits, exp_data, sys_ver, cur_bw, max_bw = row

        new_credits = credits + 500
        new_bw      = max(0, cur_bw - 15)
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
               SET system_credits    = %s,
                   experience_data   = %s,
                   system_version    = %s,
                   current_bandwidth = %s
               WHERE id = %s""",
            (new_credits, new_exp, new_ver, new_bw, user_id),
        )
        conn.commit()

        return {
            "success": True,
            "rewards": {"credits": 500, "xp": 100, "bandwidth_delta": -15},
            "version_up": versioned_up,
            "system_state": {
                "system_credits":    new_credits,
                "experience_data":   new_exp,
                "system_version":    new_ver,
                "current_bandwidth": new_bw,
                "max_bandwidth":     max_bw,
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
    target_tier: int = 1  # 1 or 2

TIER_ROLES = {1: "PRO", 2: "ELITE"}

@app.post("/api/user/upgrade-test")
async def upgrade_test(req: UpgradeTest):
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
    clerk_id: str
    base_xp: int = 100


@app.post("/system/tasks/complete")
async def complete_task_with_tier(req: TierTaskComplete):
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
            (req.clerk_id,),
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)