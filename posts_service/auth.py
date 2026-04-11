from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel

# SECRET_KEY and ALGORITHM must match Users Service
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class TokenData(BaseModel):
    user_id: int
    email: str | None = None
    username: str | None = None
    role: str | None = "user"

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        email: str = payload.get("sub")
        username: str = payload.get("username")
        role: str = payload.get("role", "user")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id, email=email, username=username, role=role)
    except InvalidTokenError:
        raise credentials_exception
    return token_data

async def require_admin(current_user: Annotated[TokenData, Depends(get_current_user)]):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_current_user_optional(token: str = Depends(OAuth2PasswordBearer(tokenUrl="login", auto_error=False))):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        email: str = payload.get("sub")
        username: str = payload.get("username")
        role: str = payload.get("role", "user")
        if user_id is None:
            return None
        return TokenData(user_id=user_id, email=email, username=username, role=role)
    except InvalidTokenError:
        return None
