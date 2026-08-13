from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.database import supabase

security = HTTPBearer()

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validates the Supabase JWT token.
    Returns the authenticated user's UUID.
    """
    if not supabase:
        print("Bypassing JWT verification because DB is not configured (TEST MODE)")
        return "dummy-worker-id"
        
    token = credentials.credentials
    try:
        # get_user validates the JWT on the Supabase server and ensures the user isn't disabled
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
