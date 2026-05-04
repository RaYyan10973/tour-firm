from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles
from ..models import Notification, Role, TourRequest, User
from ..schemas import TourRequestCreate, TourRequestOut

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=TourRequestOut)
def create_request(
    payload: TourRequestCreate,
    db: Session = Depends(get_db),
    client: User = Depends(require_roles(Role.CLIENT)),
):
    request = TourRequest(client_id=client.id, **payload.model_dump())
    db.add(request)
    db.flush()

    managers = db.query(User).filter(User.role == Role.MANAGER, User.is_active.is_(True)).all()
    for manager in managers:
        db.add(
            Notification(
                recipient_id=manager.id,
                message=f"Новая заявка #{request.id} от клиента {client.full_name}",
            )
        )

    db.commit()
    db.refresh(request)
    return request


@router.get("/my", response_model=list[TourRequestOut])
def my_requests(
    db: Session = Depends(get_db),
    client: User = Depends(require_roles(Role.CLIENT)),
):
    return (
        db.query(TourRequest)
        .filter(TourRequest.client_id == client.id, ~TourRequest.order.has())
        .order_by(TourRequest.created_at.desc())
        .all()
    )


@router.get("", response_model=list[TourRequestOut])
def all_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.MANAGER, Role.ADMIN)),
):
    return db.query(TourRequest).filter(~TourRequest.order.has()).order_by(TourRequest.created_at.desc()).all()


@router.get("/assigned/my", response_model=list[TourRequestOut])
def my_assigned_requests(
    db: Session = Depends(get_db),
    manager: User = Depends(require_roles(Role.MANAGER)),
):
    return (
        db.query(TourRequest)
        .filter(TourRequest.manager_id == manager.id, ~TourRequest.order.has())
        .order_by(TourRequest.created_at.desc())
        .all()
    )


@router.patch("/{request_id}/take", response_model=TourRequestOut)
def take_request(
    request_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_roles(Role.MANAGER)),
):
    request = db.query(TourRequest).filter(TourRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if request.manager_id and request.manager_id != manager.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is already assigned")

    request.manager_id = manager.id
    db.commit()
    db.refresh(request)
    return request
