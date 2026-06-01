# Тесты backend

В проекте используется `pytest` для проверки backend-логики.
Основная конфигурация находится в `backend/pytest.ini`:

- `testpaths = tests` — запуск тестов из папки `tests`
- `addopts = -q` — компактный вывод результатов

## Структура тестов

- `conftest.py`  
  Общие фикстуры для всех тестов:
  - создаёт изолированную SQLite-базу для каждого запуска;
  - настраивает переменные окружения (`DATABASE_URL`, `JWT_SECRET_KEY`, данные admin);
  - поднимает `TestClient`;
  - предоставляет готовые JWT-токены (`admin`, `manager`, `client`) и helper `auth_header(...)`.

- `test_unit_auth.py`  
  Unit-тесты для функций аутентификации:
  - хеширование и проверка пароля;
  - создание и декодирование access token.

- `test_api_auth.py`  
  API-тесты базового auth-flow:
  - healthcheck (`/health`);
  - регистрация пользователя (`/auth/register`);
  - логин (`/auth/login`);
  - получение текущего пользователя (`/auth/me`).

- `test_integration_requests_orders_chat.py`  
  Интеграционные сценарии "под ключ":
  - клиент создаёт заявку, менеджер забирает её и создаёт заказ, клиент оплачивает;
  - проверка доступа к чату и отправки сообщения по заявке.

## Запуск тестов

### Backend (pytest)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

## Что важно знать

- Тесты используют временную БД и не должны затрагивать рабочие данные.
- Для корректной изоляции модулей в `conftest.py` очищается импорт-граф `app.*`.
- Интеграционные тесты проверяют реальные пользовательские роли и последовательность действий в системе.

## Просмотр и правка базы данных (Docker)

Проект использует **SQLite**. При запуске через `docker compose` файл базы лежит в контейнере `tour-agency-backend` по пути `/app/data/app.db` (volume `backend_data`).

Файл `backend/app.db` на компьютере — это **другая** база (если backend когда-то запускали локально). Для Docker работайте с копией из контейнера.

### Шаг 1. Установить DB Browser for SQLite

Скачать и установить: https://sqlitebrowser.org/

В программе: вкладка **Browse Data** — просмотр таблиц, вкладка **Execute SQL** — выполнение запросов.

### Шаг 2. Скопировать базу из Docker на компьютер

Из **корня проекта** (контейнеры должны быть запущены):

```bash
docker cp tour-agency-backend:/app/data/app.db ./tour.db
```

Открыть в DB Browser файл `tour.db` из корня проекта.

Перед повторным открытием, если данные в приложении менялись, снова выполните `docker cp`, чтобы получить актуальную копию.

### Шаг 3. Добавить пользователя через SQL

#### 3.1. Получить хеш пароля

Пароль в таблице `users` хранится не текстом, а в колонке `password_hash`. Хеш нужно сгенерировать в контейнере:

```bash
docker exec tour-agency-backend python -c "from app.auth import hash_password; print(hash_password('ВашПароль123'))"
```

Скопировать **всю** выведенную строку (начинается с `$pbkdf2-sha256$...`).

Вход на сайте: логин = `username` из SQL, пароль = тот, что указали в `hash_password('...')` (в примере выше — `ВашПароль123`).

#### 3.2. Выполнить INSERT в DB Browser

Вкладка **Execute SQL**, подставить свои данные и хеш из шага 3.1:

```sql
INSERT INTO users (
  full_name,
  email,
  username,
  password_hash,
  phone,
  role,
  is_active,
  created_at
) VALUES (
  'Новый Пользователь',
  'newuser@example.com',
  'newuser',
  '$pbkdf2-sha256$29000$...вставьте_хеш_из_шага_3.1...',
  '+79001234567',
  'CLIENT',
  1,
  datetime('now')
);
```

Роль — одно из значений: `CLIENT`, `MANAGER`, `ADMIN`.

Поля `email` и `username` должны быть уникальными.

Проверка:

```sql
SELECT id, username, email, role FROM users ORDER BY id DESC LIMIT 5;
```

Сохранить изменения: **File → Write Changes** (или Cmd+S / Ctrl+S).

### Шаг 4. Вернуть базу в Docker

```bash
# из корня проекта
docker compose stop backend
docker cp ./tour.db tour-agency-backend:/app/data/app.db
docker compose start backend
```

Проверить вход на сайте с логином и паролем из шага 3.

### Частые ошибки

| Ошибка | Причина | Что сделать |
|--------|---------|-------------|
| `UNIQUE constraint failed` | Такой `email` или `username` уже есть | Выбрать другие значения |
| Не пускает после добавления | Неполный хеш или забыли шаг 4 | Сгенерировать хеш заново, выполнить `docker cp` и перезапустить backend |
| В приложении старые данные | Открыта старая копия `tour.db` | Повторить шаг 2, затем шаг 4 |

### Альтернатива без SQL

Через Swagger: http://localhost:8000/docs

- **POST /auth/register** — новый клиент;
- войти как `admin` / `admin123` → **POST /managers** — новый менеджер.

Пароль при этом хешируется автоматически.
