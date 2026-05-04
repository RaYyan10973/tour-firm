from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import get_db, require_roles
from ..models import Order, OrderStatus, Role, User
from ..schemas import AnalyticsOverview

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    orders = db.query(Order).all()
    counter = Counter(order.status for order in orders)
    return AnalyticsOverview(
        total_orders=len(orders),
        completed_orders=counter[OrderStatus.COMPLETED],
        in_work_orders=counter[OrderStatus.IN_WORK],
        pending_payment_orders=counter[OrderStatus.PENDING_PAYMENT],
        paid_orders=counter[OrderStatus.PAID],
        booked_orders=counter[OrderStatus.BOOKED],
        cancelled_orders=counter[OrderStatus.CANCELLED],
    )


@router.get("/status-chart")
def status_chart(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    orders = db.query(Order).all()
    counter = Counter(order.status.value for order in orders)
    return [{"status": key, "count": value} for key, value in counter.items()]


@router.get("/orders-by-day")
def orders_by_day(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.ADMIN)),
):
    orders = db.query(Order).all()
    counter = Counter(order.created_at.date().isoformat() for order in orders)
    return [{"date": key, "count": value} for key, value in sorted(counter.items())]
