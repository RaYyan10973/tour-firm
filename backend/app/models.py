from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(str, Enum):
    CLIENT = "client"
    MANAGER = "manager"
    ADMIN = "admin"


class OrderStatus(str, Enum):
    IN_WORK = "in_work"
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    BOOKED = "booked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    role: Mapped[Role] = mapped_column(SqlEnum(Role), default=Role.CLIENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    requests: Mapped[list["TourRequest"]] = relationship(back_populates="client", foreign_keys="TourRequest.client_id")
    assigned_requests: Mapped[list["TourRequest"]] = relationship(back_populates="manager", foreign_keys="TourRequest.manager_id")
    managed_orders: Mapped[list["Order"]] = relationship(back_populates="manager", foreign_keys="Order.manager_id")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="recipient")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="sender")


class TourRequest(Base):
    __tablename__ = "tour_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    destination: Mapped[str] = mapped_column(String(255))
    travel_dates: Mapped[str] = mapped_column(String(255))
    travelers_count: Mapped[int] = mapped_column(Integer)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    client: Mapped["User"] = relationship(back_populates="requests", foreign_keys=[client_id])
    manager: Mapped["User"] = relationship(back_populates="assigned_requests", foreign_keys=[manager_id])
    order: Mapped["Order"] = relationship(back_populates="request", uselist=False)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("tour_requests.id"), unique=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    hotel_name: Mapped[str] = mapped_column(String(255))
    hotel_category: Mapped[str] = mapped_column(String(50))
    weekly_cost: Mapped[float] = mapped_column(Float)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.IN_WORK)
    status_updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    request: Mapped["TourRequest"] = relationship(back_populates="order")
    manager: Mapped["User"] = relationship(back_populates="managed_orders", foreign_keys=[manager_id])


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(String(500))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recipient: Mapped["User"] = relationship(back_populates="notifications")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("tour_requests.id"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sender: Mapped["User"] = relationship(back_populates="chat_messages")
    request: Mapped["TourRequest"] = relationship()
