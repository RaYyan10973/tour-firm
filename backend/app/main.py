from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from .config import get_settings
from .database import SessionLocal
from .models import ChatMessage, Notification, Order, OrderStatus, Role, TourRequest, User
from .routers import analytics, auth, chat, managers, notifications, orders, requests

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_admin() -> None:
    from .auth import hash_password

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == settings.admin_username, User.role == Role.ADMIN).first()
        if not admin:
            db.add(
                User(
                    full_name=settings.admin_full_name,
                    email=settings.admin_email,
                    username=settings.admin_username,
                    phone=settings.admin_phone,
                    password_hash=hash_password(settings.admin_password),
                    role=Role.ADMIN,
                    is_active=True,
                )
            )
            db.commit()
    except OperationalError:
        # Таблицы еще не созданы миграциями.
        pass
    finally:
        db.close()


def seed_demo_data() -> None:
    from .auth import hash_password

    db = SessionLocal()
    try:
        def get_or_create_user(
            *,
            full_name: str,
            email: str,
            username: str,
            password: str,
            phone: str,
            role: Role,
        ) -> User:
            user = db.query(User).filter(User.username == username).first()
            if user:
                return user
            user = User(
                full_name=full_name,
                email=email,
                username=username,
                phone=phone,
                password_hash=hash_password(password),
                role=role,
                is_active=True,
            )
            db.add(user)
            db.flush()
            return user

        managers = [
            get_or_create_user(
                full_name="Степан Ильич",
                email="bobrik@mail.ru",
                username="boric",
                password="manager123",
                phone="+71234567890",
                role=Role.MANAGER,
            ),
            get_or_create_user(
                full_name="Анна Петрова",
                email="anna.manager@example.com",
                username="anna_manager",
                password="manager123",
                phone="+79001112233",
                role=Role.MANAGER,
            ),
            get_or_create_user(
                full_name="Мария Соколова",
                email="maria.manager@example.com",
                username="maria_manager",
                password="manager123",
                phone="+79004445566",
                role=Role.MANAGER,
            ),
        ]
        clients = [
            get_or_create_user(
                full_name="Иванов Иван",
                email="ivan.client@example.com",
                username="ivan_client",
                password="client123",
                phone="+79007778899",
                role=Role.CLIENT,
            ),
            get_or_create_user(
                full_name="Петрова Анна",
                email="anna.client@example.com",
                username="anna_client",
                password="client123",
                phone="+79001234567",
                role=Role.CLIENT,
            ),
            get_or_create_user(
                full_name="Сидоров Петр",
                email="petr.client@example.com",
                username="petr_client",
                password="client123",
                phone="+79009876543",
                role=Role.CLIENT,
            ),
        ]

        demo_requests = [
            {
                "client": clients[0],
                "manager": managers[0],
                "destination": "Турция",
                "travel_dates": "2025-07-15",
                "travelers_count": 2,
                "budget": 120000,
                "notes": "Нужен отель у моря, all inclusive.",
            },
            {
                "client": clients[1],
                "manager": None,
                "destination": "Таиланд",
                "travel_dates": "2025-08-20",
                "travelers_count": 2,
                "budget": 180000,
                "notes": "Спокойный пляжный отдых.",
            },
            {
                "client": clients[2],
                "manager": managers[1],
                "destination": "ОАЭ",
                "travel_dates": "2025-09-10",
                "travelers_count": 1,
                "budget": 150000,
                "notes": "Хочу отель рядом с торговыми центрами.",
            },
            {
                "client": clients[0],
                "manager": None,
                "destination": "Италия",
                "travel_dates": "2025-10-05",
                "travelers_count": 3,
                "budget": 260000,
                "notes": "Экскурсии и хороший городской отель.",
            },
        ]

        requests_by_destination: dict[str, TourRequest] = {}
        for item in demo_requests:
            request = (
                db.query(TourRequest)
                .filter(
                    TourRequest.client_id == item["client"].id,
                    TourRequest.destination == item["destination"],
                    TourRequest.travel_dates == item["travel_dates"],
                )
                .first()
            )
            if not request:
                request = TourRequest(
                    client_id=item["client"].id,
                    manager_id=item["manager"].id if item["manager"] else None,
                    destination=item["destination"],
                    travel_dates=item["travel_dates"],
                    travelers_count=item["travelers_count"],
                    budget=item["budget"],
                    notes=item["notes"],
                )
                db.add(request)
                db.flush()
            requests_by_destination[item["destination"]] = request

        demo_orders = [
            {
                "request": requests_by_destination["Турция"],
                "manager": managers[0],
                "hotel_name": "Grand Hotel 5*",
                "hotel_category": "Турция",
                "weekly_cost": 114000,
                "status": OrderStatus.PENDING_PAYMENT,
            },
            {
                "request": requests_by_destination["ОАЭ"],
                "manager": managers[1],
                "hotel_name": "Palm Resort 4*",
                "hotel_category": "ОАЭ",
                "weekly_cost": 145000,
                "status": OrderStatus.PAID,
            },
        ]
        for item in demo_orders:
            order = db.query(Order).filter(Order.request_id == item["request"].id).first()
            if not order:
                db.add(
                    Order(
                        request_id=item["request"].id,
                        manager_id=item["manager"].id,
                        hotel_name=item["hotel_name"],
                        hotel_category=item["hotel_category"],
                        weekly_cost=item["weekly_cost"],
                        status=item["status"],
                    )
                )

        for manager in managers:
            exists = db.query(Notification).filter(
                Notification.recipient_id == manager.id,
                Notification.message == "Демо-данные загружены: есть новые заявки для обработки.",
            ).first()
            if not exists:
                db.add(
                    Notification(
                        recipient_id=manager.id,
                        message="Демо-данные загружены: есть новые заявки для обработки.",
                    )
                )

        chat_seed = [
            (requests_by_destination["Турция"], clients[0], "Здравствуйте! Хотим тур в Турцию с отелем рядом с морем."),
            (requests_by_destination["Турция"], managers[0], "Здравствуйте, уже подобрал Grand Hotel 5*, отправил заказ."),
            (requests_by_destination["ОАЭ"], clients[2], "Добрый день, важна близость к торговым центрам."),
            (requests_by_destination["ОАЭ"], managers[1], "Добрый день! Предложил Palm Resort 4*, он подходит по расположению."),
        ]
        for request, sender, text in chat_seed:
            exists = db.query(ChatMessage).filter(
                ChatMessage.request_id == request.id,
                ChatMessage.sender_id == sender.id,
                ChatMessage.text == text,
            ).first()
            if not exists:
                db.add(ChatMessage(request_id=request.id, sender_id=sender.id, text=text))

        db.commit()
    except OperationalError:
        # Таблицы еще не созданы миграциями.
        pass
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    seed_admin()
    seed_demo_data()


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(requests.router)
app.include_router(orders.router)
app.include_router(managers.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(chat.router)

app.include_router(auth.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(managers.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

frontend_dist = Path(__file__).resolve().parents[1] / "frontend_dist"
frontend_assets = frontend_dist / "assets"

if frontend_assets.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"detail": "Frontend build not found"}
