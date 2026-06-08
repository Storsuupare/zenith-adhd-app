import os
import time
import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

# In-memory JWKS cache with 1-hour TTL so we don't hammer Clerk's endpoint
_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL = 3600


def _get_jwks() -> list:
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL:
        return _jwks_cache["keys"]
    try:
        jwksResponse = requests.get(
            "https://api.clerk.com/v1/jwks",
            headers={"Authorization": f"Bearer {os.getenv('CLERK_SECRET_KEY', '')}"},
            timeout=5,
        )
        jwksResponse.raise_for_status()
        _jwks_cache["keys"] = jwksResponse.json().get("keys", [])
        _jwks_cache["fetched_at"] = now
    except Exception:
        pass  # On network failure, return stale keys rather than crashing
    return _jwks_cache["keys"]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """FastAPI dependency. Verifies the Clerk JWT and returns the user ID (sub claim)."""
    token = credentials.credentials
    try:
        kid = jwt.get_unverified_header(token).get("kid")
        key = next((k for k in _get_jwks() if k.get("kid") == kid), None)
        if key is None:
            raise HTTPException(status_code=401, detail="INVALID_TOKEN")
        payload = jwt.decode(token, key, algorithms=["RS256"])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="INVALID_TOKEN")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="INVALID_TOKEN")
