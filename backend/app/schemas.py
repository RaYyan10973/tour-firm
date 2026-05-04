from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import OrderStatus, Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    phone: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    username: str | None = None
    phone: str | None = None
    password: str | None = Field(default=None, min_length=6)
    is_active: bool | None = None


class UserSelfUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    password: str | None = Field(default=None, min_length=6)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Role
    is_active: bool
    created_at: datetime


class LoginInput(BaseModel):
    username: str
    password: str


class TourRequestCreate(BaseModel):
    destination: str
    travel_dates: str
    travelers_count: int = Field(gt=0)
    budget: float | None = Field(default=None, ge=0)
    notes: str | None = None


class TourRequestOut(TourRequestCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    manager_id: int | None = None
    created_at: datetime


class OrderCreate(BaseModel):
    request_id: int
    hotel_name: str
    hotel_category: str
    weekly_cost: float = Field(gt=0)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    manager_id: int
    hotel_name: str
    hotel_category: str
    weekly_cost: float
    status: OrderStatus
    status_updated_at: datetime
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    message: str
    is_read: bool
    created_at: datetime


class ChatMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(BaseModel):
    id: int
    request_id: int
    sender_id: int
    sender_name: str
    sender_role: Role
    text: str
    created_at: datetime


class AnalyticsOverview(BaseModel):
    total_orders: int
    completed_orders: int
    in_work_orders: int
    pending_payment_orders: int
    paid_orders: int
    booked_orders: int
    cancelled_orders: int
