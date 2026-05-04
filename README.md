# ИС туристической фирмы (MVP)

## Стек
- Backend: FastAPI + SQLAlchemy + Alembic + SQLite
- Frontend: React + React Router + Vite + Recharts

## Что реализовано
- `self-registration` клиента
- роли: `client`, `manager`, `admin`
- процесс: заявка -> заказ -> статусы -> mock-оплата
- внутренние уведомления для менеджеров и клиентов
- аналитика:
  - всего заказов
  - завершенные
  - в работе
  - оплаченные
  - забронированные
  - отмененные
  - график по статусам
  - динамика заказов по дням
- многостраничный frontend по ролям

## Настройка переменных окружения

Backend:
```bash
cd backend
cp .env.example .env
```

Frontend:
```bash
cd ../frontend
cp .env.example .env
```

## Локальный запуск проекта

Требования:
- Python 3.12+
- Node.js 16+
- npm
- Git

### 1. Подготовка backend

Все команды выполняются из корня проекта.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
```

Файл `backend/.env` уже содержит значения для локального запуска:
- база данных SQLite: `sqlite:///./app.db`
- CORS для Vite frontend: `http://127.0.0.1:5173`
- тестовый администратор: `admin` / `admin123`

Если команда `python3` недоступна, используйте `python`.

### 2. Запуск backend

В первом терминале:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Backend будет доступен по адресу:
- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

При первом запуске автоматически создаются администратор и демо-данные: менеджеры, клиенты, заявки, заказы, уведомления и история чата.

### 3. Подготовка frontend

Во втором терминале из корня проекта:

```bash
cd frontend
npm install
cp .env.example .env
```

В `frontend/.env` должен быть указан адрес backend:

```env
VITE_API_URL=http://127.0.0.1:8000
```

### 4. Запуск frontend

Во втором терминале:

```bash
cd frontend
npm run dev
```

Frontend будет доступен по адресу:
- `http://127.0.0.1:5173`

### 5. Тестовые аккаунты

- администратор: `admin` / `admin123`
- менеджер: `boric` / `manager123`
- менеджер: `anna_manager` / `manager123`
- менеджер: `maria_manager` / `manager123`
- клиент: `ivan_client` / `client123`
- клиент: `anna_client` / `client123`
- клиент: `petr_client` / `client123`

### 6. Если база уже создана

Если нужно начать с чистой локальной SQLite-базы:

```bash
cd backend
rm -f app.db
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

## Запуск backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API по умолчанию: `http://127.0.0.1:8000`

Админ создается автоматически при старте приложения (на основе значений из `.env`):
- логин: `admin`
- пароль: `admin123`

## Запуск frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend по умолчанию: `http://127.0.0.1:5173`

## Запуск через Docker

Из корня проекта:

```bash
VITE_API_URL=/api npm --prefix frontend run build
docker compose up --build
```

После запуска:
- Frontend: `http://127.0.0.1:8080`
- Backend API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

Данные SQLite сохраняются в Docker volume `backend_data`.
Docker-сборка использует один контейнер на базе `python:3.12-slim`; React-файлы берутся из локальной папки `frontend/dist`.

Остановить контейнеры:

```bash
docker compose down
```

Остановить и удалить данные БД:

```bash
docker compose down -v
```

## Основные маршруты frontend
- `/notifications`
- `/client/requests`
- `/client/orders`
- `/manager/requests`
- `/manager/orders`
- `/admin/analytics`
- `/admin/managers`
