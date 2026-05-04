from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles
from ..models import Notification, Order, OrderStatus, Role, TourRequest, User
from ..schemas import OrderCreate, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_roles(Role.MANAGER)),
):
    request = db.query(TourRequest).filter(TourRequest.id == payload.request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if request.order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order already exists for this request")

    order = Order(
        request_id=payload.request_id,
        manager_id=manager.id,
        hotel_name=payload.hotel_name,
        hotel_category=payload.hotel_category,
        weekly_cost=payload.weekly_cost,
        status=OrderStatus.IN_WORK,
    )
    request.manager_id = manager.id
    db.add(order)
    db.add(
        Notification(
            recipient_id=request.client_id,
            message=f"По вашей заявке #{request.id} создан заказ",
        )
    )
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.MANAGER, Role.ADMIN)),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if user.role == Role.MANAGER and order.manager_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order is not assigned to this manager")

    order.status = payload.status
    order.status_updated_at = datetime.utcnow()
    db.add(
        Notification(
            recipient_id=order.request.client_id,
            message=f"Статус заказа #{order.id} изменен на '{payload.status.value}'",
        )
    )
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/pay", response_model=OrderOut)
def pay_order(
    order_id: int,
    db: Session = Depends(get_db),
    client: User = Depends(require_roles(Role.CLIENT)),
):
    order = db.query(Order).join(TourRequest, TourRequest.id == Order.request_id).filter(Order.id == order_id).first()
    if not order or order.request.client_id != client.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = OrderStatus.PAID
    order.status_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.get("/my", response_model=list[OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    client: User = Depends(require_roles(Role.CLIENT)),
):
    return (
        db.query(Order)
        .join(TourRequest, TourRequest.id == Order.request_id)
        .filter(TourRequest.client_id == client.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("", response_model=list[OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.MANAGER, Role.ADMIN)),
):
    query = db.query(Order)
    if user.role == Role.MANAGER:
        query = query.filter(Order.manager_id == user.id)
    return query.order_by(Order.created_at.desc()).all()
