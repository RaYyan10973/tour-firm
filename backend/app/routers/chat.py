from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import ChatMessage, Role, TourRequest, User
from ..schemas import ChatMessageCreate, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["chat"])


def ensure_chat_access(request: TourRequest | None, user: User) -> TourRequest:
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    can_access = (
        user.role == Role.ADMIN
        or request.client_id == user.id
        or request.manager_id == user.id
        or (request.order is not None and request.order.manager_id == user.id)
    )
    if not can_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat is not available")
    return request


def serialize_message(message: ChatMessage) -> ChatMessageOut:
    return ChatMessageOut(
        id=message.id,
        request_id=message.request_id,
        sender_id=message.sender_id,
        sender_name=message.sender.full_name,
        sender_role=message.sender.role,
        text=message.text,
        created_at=message.created_at,
    )


@router.get("/requests/{request_id}", response_model=list[ChatMessageOut])
def list_request_messages(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    request = ensure_chat_access(db.query(TourRequest).filter(TourRequest.id == request_id).first(), user)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.request_id == request.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


@router.post("/requests/{request_id}", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_request_message(
    request_id: int,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    request = ensure_chat_access(db.query(TourRequest).filter(TourRequest.id == request_id).first(), user)
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty")

    message = ChatMessage(request_id=request.id, sender_id=user.id, text=text)
    db.add(message)
    db.commit()
    db.refresh(message)
    return serialize_message(message)
