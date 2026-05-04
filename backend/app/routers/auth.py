from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, hash_password, verify_password
from ..deps import get_current_user, get_db
from ..models import Role, User
from ..schemas import LoginInput, Token, UserCreate, UserOut, UserSelfUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_client(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        username=payload.username,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=Role.CLIENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.username)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        existing = db.query(User).filter(User.email == data["email"], User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    password = data.pop("password", None)
    for key, value in data.items():
        setattr(current_user, key, value)
    if password:
        current_user.password_hash = hash_password(password)

    db.commit()
    db.refresh(current_user)
    return current_user
