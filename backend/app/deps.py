from fastapi import Cookie, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Role, User
from .security import decode_access_token


def _extract_token(authorization: str | None, access_token_cookie: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1]
    return access_token_cookie


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
) -> User:
    token = _extract_token(authorization, access_token)
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_error
    user = db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise credentials_error
    request.state.user_id = user.id
    return user


def require_roles(*roles: Role):
    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
        return user

    return _checker


require_admin = require_roles(Role.admin)
require_operator = require_roles(Role.operator, Role.admin)
require_any = require_roles(Role.client, Role.operator, Role.admin)
