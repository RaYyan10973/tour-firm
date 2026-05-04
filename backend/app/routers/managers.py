from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..deps import get_db, require_roles
from ..models import Role, User
from ..schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/managers", tags=["managers"])


@router.get("", response_model=list[UserOut])
def list_managers(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    return db.query(User).filter(User.role == Role.MANAGER).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_manager(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    existing = db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    manager = User(
        full_name=payload.full_name,
        email=payload.email,
        username=payload.username,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=Role.MANAGER,
        is_active=True,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return manager


@router.patch("/{manager_id}/deactivate", response_model=UserOut)
def deactivate_manager(
    manager_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    manager = db.query(User).filter(User.id == manager_id, User.role == Role.MANAGER).first()
    if not manager:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager not found")
    manager.is_active = False
    db.commit()
    db.refresh(manager)
    return manager


@router.patch("/{manager_id}", response_model=UserOut)
def update_manager(
    manager_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    manager = db.query(User).filter(User.id == manager_id, User.role == Role.MANAGER).first()
    if not manager:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manager not found")

    data = payload.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    for key, value in data.items():
        setattr(manager, key, value)
    if password:
        manager.password_hash = hash_password(password)

    db.commit()
    db.refresh(manager)
    return manager
