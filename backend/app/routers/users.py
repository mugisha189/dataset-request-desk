from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Role, User
from ..schemas import Page, UserCreate, UserOut, UserUpdate
from ..security import hash_password
from ..services.export import export_response
from ..services.listing import paginate, parse_sort

router = APIRouter(prefix="/api/users", tags=["users"])

SORTABLE = {
    "name": User.name,
    "email": User.email,
    "role": User.role,
    "created_at": User.created_at,
    "is_active": User.is_active,
}


def _filtered_users_query(db: Session, search: str | None, role: Role | None):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        needle = f"%{search.strip().lower()}%"
        query = query.filter(or_(User.name.ilike(needle), User.email.ilike(needle)))
    return query


@router.get("", response_model=Page[UserOut])
def list_users(
    search: str | None = None,
    role: Role | None = None,
    sort: str | None = None,
    page: int = 0,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    query = _filtered_users_query(db, search, role)
    sort_column, ascending = parse_sort(sort, SORTABLE, User.created_at)
    users, total = paginate(query, sort_column, ascending, page, min(page_size, 100))
    return Page(items=users, total=total, page=page, page_size=page_size)


@router.get("/export")
def export_users(
    search: str | None = None,
    role: Role | None = None,
    format: str = "csv",
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    users = _filtered_users_query(db, search, role).order_by(User.created_at).all()
    headers = ["Name", "Email", "Role", "Organisation", "Status", "Created"]
    rows = [
        [
            u.name,
            u.email,
            u.role.value,
            u.organisation or "",
            "active" if u.is_active else "inactive",
            u.created_at.strftime("%Y-%m-%d"),
        ]
        for u in users
    ]
    return export_response(fmt=format, headers=headers, rows=rows, filename_base="users", title="Users")


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists")
    user = User(
        email=email,
        name=payload.name,
        organisation=payload.organisation,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
