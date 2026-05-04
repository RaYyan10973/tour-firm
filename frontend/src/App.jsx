import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  LogOut,
  MessageCircle,
  Plane,
  PlusCircle,
  Send,
  ShoppingBag,
  User,
  Users,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./api";

const ORDER_STATUSES = ["in_work", "pending_payment", "paid", "booked", "completed", "cancelled"];
const STATUS_LABELS = {
  in_work: "В работе",
  pending_payment: "Ожидает оплату",
  paid: "Оплачен",
  booked: "Забронирован",
  completed: "Завершен",
  cancelled: "Отменен",
};

export function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api.me(token).then(setUser).catch(() => setToken(""));
  }, [token]);

  const notify = (type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  };

  if (!token || !user) {
    return (
      <div className="auth-page">
        <Routes>
          <Route element={<AuthLayout authError={authError} authMessage={authMessage} />}>
            <Route path="/login" element={<LoginPage onLogin={(newToken) => {
                setAuthError("");
                setAuthMessage("Вход выполнен");
                notify("success", "Вход выполнен");
                setToken(newToken);
                localStorage.setItem("token", newToken);
              }}
              onError={setAuthError}
            />} />
            <Route path="/register" element={<RegisterPage onRegister={() => {
                setAuthError("");
                setAuthMessage("Регистрация прошла успешно. Теперь выполните вход.");
                notify("success", "Регистрация прошла успешно");
              }}
              onError={setAuthError}
            />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
        <ToastStack toasts={toasts} />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          element={
            <AppLayout
              user={user}
              onLogout={() => {
                setToken("");
                setUser(null);
                localStorage.removeItem("token");
                notify("success", "Вы вышли из системы");
              }}
            />
          }
        >
          <Route path="/" element={<Navigate to={getDefaultRoute(user.role)} replace />} />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute isAllowed={Boolean(token)}>
                <NotificationsPage token={token} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/client/requests"
            element={
              <ProtectedRoute isAllowed={user.role === "client"}>
                <ClientRequestsPage token={token} notify={notify} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/orders"
            element={
              <ProtectedRoute isAllowed={user.role === "client"}>
                <ClientOrdersPage token={token} notify={notify} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/profile"
            element={
              <ProtectedRoute isAllowed={user.role === "client"}>
                <ProfilePage user={user} token={token} notify={notify} onUserUpdate={setUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/requests"
            element={
              <ProtectedRoute isAllowed={user.role === "manager"}>
                <ManagerRequestsPage token={token} notify={notify} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/orders"
            element={
              <ProtectedRoute isAllowed={user.role === "manager"}>
                <ManagerOrdersPage token={token} notify={notify} userRole={user.role} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/profile"
            element={
              <ProtectedRoute isAllowed={user.role === "manager"}>
                <ProfilePage user={user} token={token} notify={notify} onUserUpdate={setUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute isAllowed={user.role === "admin"}>
                <AdminAnalyticsPage token={token} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/managers"
            element={
              <ProtectedRoute isAllowed={user.role === "admin"}>
                <AdminManagersPage token={token} notify={notify} />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastStack toasts={toasts} />
    </>
  );
}

function AuthLayout({ authError, authMessage }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand horizon">
        <span className="client-logo">Г</span>
        <strong>Горизонт</strong>
      </div>
      <section className="auth-panel">
        {authError && <p className="error">{authError}</p>}
        {authMessage && <p className="ok">{authMessage}</p>}
        <Outlet />
      </section>
    </div>
  );
}

function LoginPage({ onLogin, onError }) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  return (
    <section className="card">
      <p className="eyebrow">Вход</p>
      <h2>Войти в аккаунт</h2>
      <input placeholder="Логин" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
      <PasswordInput
        placeholder="Пароль"
        value={loginForm.password}
        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
      />
      <button
        className="btn"
        onClick={async () => {
          try {
            const data = await api.login(loginForm);
            onLogin(data.access_token);
          } catch (e) {
            onError(e.message);
          }
        }}
      >
        Войти
      </button>
      <p className="auth-switch">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </section>
  );
}

function RegisterPage({ onRegister, onError }) {
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
  });
  const navigate = useNavigate();

  return (
    <section className="card">
      <p className="eyebrow">Регистрация</p>
      <h2>Создать аккаунт клиента</h2>
      <input placeholder="ФИО" value={registerForm.full_name} onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })} />
      <input placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} />
      <input placeholder="Логин" value={registerForm.username} onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })} />
      <input placeholder="Телефон" value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} />
      <PasswordInput
        placeholder="Пароль"
        value={registerForm.password}
        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
      />
      <button
        className="btn"
        onClick={async () => {
          try {
            await api.register(registerForm);
            onRegister();
            navigate("/login");
          } catch (e) {
            onError(e.message);
          }
        }}
      >
        Зарегистрироваться
      </button>
      <p className="auth-switch">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </section>
  );
}

function getDefaultRoute(role) {
  if (role === "client") {
    return "/client/requests";
  }
  if (role === "manager") {
    return "/manager/requests";
  }
  return "/admin/analytics";
}

function ProtectedRoute({ isAllowed, children }) {
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppLayout({ user, onLogout }) {
  if (user.role === "client") {
    return <ClientLayout user={user} onLogout={onLogout} />;
  }
  if (user.role === "manager") {
    return <ManagerLayout user={user} onLogout={onLogout} />;
  }
  if (user.role === "admin") {
    return <AdminLayout user={user} onLogout={onLogout} />;
  }

  return (
    <div className="container app-shell">
      <aside className="sidebar card">
        <div>
          <p className="eyebrow">Tour Agency</p>
          <h2>Личный кабинет</h2>
        </div>
        <nav className="nav">
          <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/notifications">
            <Bell size={16} />
            Уведомления
          </NavLink>
          {user.role === "client" && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/client/requests">
              <ClipboardList size={16} />
              Мои заявки
            </NavLink>
          )}
          {user.role === "client" && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/client/orders">
              <ShoppingBag size={16} />
              Мои заказы
            </NavLink>
          )}
          {(user.role === "manager" || user.role === "admin") && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/manager/requests">
              <ClipboardList size={16} />
              Все заявки
            </NavLink>
          )}
          {(user.role === "manager" || user.role === "admin") && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/manager/orders">
              <ShoppingBag size={16} />
              Все заказы
            </NavLink>
          )}
          {user.role === "admin" && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/admin/analytics">
              <BarChart3 size={16} />
              Аналитика
            </NavLink>
          )}
          {user.role === "admin" && (
            <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/admin/managers">
              <Users size={16} />
              Менеджеры
            </NavLink>
          )}
        </nav>
      </aside>

      <main className="content-area">
        <header className="header card">
          <div>
            <p className="eyebrow">Пользователь</p>
            <strong className="header-user">
              <User size={16} />
              {user.full_name}
            </strong>
          </div>
          <div className="user-info">
            <span className="pill">{user.role}</span>
            <button className="btn btn-secondary" onClick={onLogout}>
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function AdminLayout({ user, onLogout }) {
  return (
    <div className="client-page">
      <header className="client-topbar">
        <Link className="client-brand" to="/admin/managers">
          <span className="client-logo">Г</span>
          <strong>Горизонт</strong>
        </Link>
        <div className="client-user">
          <span>Администратор: {user.full_name}</span>
          <button className="client-outline-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="client-container">
        <div className="client-title-row">
          <div>
            <h1>Панель администратора</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <nav className="client-tabs">
          <NavLink to="/admin/managers">Менеджеры</NavLink>
          <NavLink to="/admin/analytics">Аналитика</NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}

function ManagerLayout({ user, onLogout }) {
  return (
    <div className="client-page">
      <header className="client-topbar">
        <Link className="client-brand" to="/manager/requests">
          <span className="client-logo">Г</span>
          <strong>Горизонт</strong>
        </Link>
        <div className="client-user">
          <span>Менеджер: {user.full_name}</span>
          <button className="client-outline-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="client-container">
        <div className="client-title-row">
          <div>
            <h1>Личный кабинет менеджера</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <nav className="client-tabs">
          <NavLink to="/manager/requests">Заявки</NavLink>
          <NavLink to="/manager/orders">Заказы</NavLink>
          <NavLink to="/manager/profile">Профиль</NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}

function ClientLayout({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="client-page">
      <header className="client-topbar">
        <Link className="client-brand" to="/client/requests">
          <span className="client-logo">Г</span>
          <strong>Горизонт</strong>
        </Link>
        <div className="client-user">
          <span>{user.full_name}</span>
          <button className="client-outline-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="client-container">
        <div className="client-title-row">
          <div>
            <h1>Личный кабинет клиента</h1>
            <p>{user.email}</p>
          </div>
          <button
            className="client-primary-btn"
            onClick={() => {
              navigate("/client/requests");
              setTimeout(() => window.dispatchEvent(new Event("open-new-request")), 0);
            }}
          >
            + Новая заявка
          </button>
        </div>
        <nav className="client-tabs">
          <NavLink to="/client/requests">Мои заявки</NavLink>
          <NavLink to="/client/orders">Мои заказы</NavLink>
          <NavLink to="/client/profile">Профиль</NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}

function ClientRequestsPage({ token, notify }) {
  const [form, setForm] = useState({ destination: "", travel_dates: "", travelers_count: 1, budget: 0, notes: "" });
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const openDrawer = () => setIsCreateOpen(true);
    window.addEventListener("open-new-request", openDrawer);
    return () => window.removeEventListener("open-new-request", openDrawer);
  }, []);

  const refreshRequests = async () => {
    setLoading(true);
    try {
      const data = await api.myRequests(token);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="client-card">
      <h2>Мои заявки</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Направление</th>
                <th>Дата вылета</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td>TR-{item.id}</td>
                  <td>{item.destination}</td>
                  <td>{item.travel_dates}</td>
                  <td><span className="client-status client-status-new">Новая</span></td>
                  <td>
                    <button className="client-outline-btn compact" onClick={() => setSelectedRequest(item)}>
                      Подробнее
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientDrawer title="Новая заявка на тур" open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <label>Страна назначения</label>
        <input placeholder="Например: Турция, Италия, ОАЭ" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        <label>Дата вылета</label>
        <input type="date" value={form.travel_dates} onChange={(e) => setForm({ ...form, travel_dates: e.target.value })} />
        <label>Количество человек</label>
        <input
          type="number"
          min="1"
          value={form.travelers_count}
          onChange={(e) => setForm({ ...form, travelers_count: Number(e.target.value) })}
        />
        <label>Бюджет</label>
        <input type="number" placeholder="Ориентировочный бюджет" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
        <label>Пожелания</label>
        <textarea placeholder="Дополнительные пожелания к туру..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button
          className="client-primary-btn full"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);
              await api.createRequest(form, token);
              setForm({ destination: "", travel_dates: "", travelers_count: 1, budget: 0, notes: "" });
              setError("");
              setIsCreateOpen(false);
              notify("success", "Заявка успешно отправлена");
              refreshRequests();
            } catch (e) {
              setError(e.message);
              notify("error", e.message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Отправляем..." : "Отправить заявку"}
        </button>
      </ClientDrawer>

      <ClientDrawer title={selectedRequest ? `Детали заявки #TR-${selectedRequest.id}` : ""} open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)}>
        {selectedRequest && (
          <div className="client-details">
            <span className="client-status client-status-new">Новая</span>
            <DetailRow label="Страна" value={selectedRequest.destination} />
            <DetailRow label="Дата вылета" value={selectedRequest.travel_dates} />
            <DetailRow label="Количество человек" value={selectedRequest.travelers_count} />
            <DetailRow label="Бюджет" value={`${selectedRequest.budget || 0} ₽`} />
            <DetailRow label="Пожелания" value={selectedRequest.notes || "Не указаны"} />
            <ChatPanel requestId={selectedRequest.id} token={token} title="Чат с менеджером" />
          </div>
        )}
      </ClientDrawer>
    </section>
  );
}

function ClientOrdersPage({ token, notify }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paying, setPaying] = useState(false);

  const refreshOrders = async () => {
    setLoading(true);
    try {
      const data = await api.myOrders(token);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [token]);

  return (
    <section className="client-card">
      <h2>Мои заказы</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <div className="client-table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Отель</th>
                <th>Страна</th>
                <th>Стоимость</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((item) => (
                <tr key={item.id}>
                  <td>OR-{item.id}</td>
                  <td>{item.hotel_name}</td>
                  <td>{item.hotel_category}</td>
                  <td>{formatCurrency(item.weekly_cost)}</td>
                  <td><ClientStatusPill status={item.status} /></td>
                  <td>
                    <button className="client-outline-btn compact" onClick={() => setSelectedOrder(item)}>
                      Подробнее
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientDrawer title={selectedOrder ? `Детали заказа #OR-${selectedOrder.id}` : ""} open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <div className="client-details">
            <ClientStatusPill status={selectedOrder.status} />
            <DetailRow label="Отель" value={selectedOrder.hotel_name} />
            <DetailRow label="Страна" value={selectedOrder.hotel_category} />
            <DetailRow label="Дата заказа" value={new Date(selectedOrder.created_at).toLocaleDateString("ru-RU")} />
            <DetailRow label="Стоимость тура" value={formatCurrency(selectedOrder.weekly_cost)} />
            <DetailRow label="Скидка/услуги" value={formatCurrency(Math.round(selectedOrder.weekly_cost * 0.05))} />
            <DetailRow label="Итого к оплате" value={formatCurrency(Math.round(selectedOrder.weekly_cost * 1.05))} strong />
            {(selectedOrder.status === "pending_payment" || selectedOrder.status === "in_work") && (
              <button className="client-primary-btn full" onClick={() => setPaymentOrder(selectedOrder)}>
                Оплатить
              </button>
            )}
            <ChatPanel requestId={selectedOrder.request_id} token={token} title="Чат с менеджером" />
          </div>
        )}
      </ClientDrawer>

      <ClientDrawer title="Оплата заказа" open={Boolean(paymentOrder)} onClose={() => !paying && setPaymentOrder(null)}>
        {paymentOrder && (
          <div className="client-payment">
            <div className="payment-total">
              <strong>{formatCurrency(Math.round(paymentOrder.weekly_cost * 1.05))}</strong>
              <span>Заказ #OR-{paymentOrder.id}</span>
            </div>
            <label>Номер карты</label>
            <input placeholder="1234 5678 9012 3456" />
            <div className="payment-grid">
              <div>
                <label>Срок действия</label>
                <input placeholder="MM/YY" />
              </div>
              <div>
                <label>CVV</label>
                <input placeholder="123" />
              </div>
            </div>
            <label>Имя держателя карты</label>
            <input placeholder="IVAN IVANOV" />
            <div className="secure-payment">
              <CheckCircle2 size={18} />
              <div>
                <strong>Безопасная оплата</strong>
                <span>Данные защищены SSL-шифрованием</span>
              </div>
            </div>
            <button
              className="client-primary-btn full"
              disabled={paying}
              onClick={async () => {
                try {
                  setPaying(true);
                  await api.payOrder(paymentOrder.id, token);
                  setError("");
                  notify("success", `Заказ #${paymentOrder.id} оплачен`);
                  setPaymentOrder(null);
                  setSelectedOrder(null);
                  refreshOrders();
                } catch (e) {
                  setError(e.message);
                  notify("error", e.message);
                } finally {
                  setPaying(false);
                }
              }}
            >
              <CreditCard size={16} />
              {paying ? "Оплачиваем..." : "Оплатить"}
            </button>
            <p className="payment-note">Это демо-оплата, реальные деньги не списываются.</p>
          </div>
        )}
      </ClientDrawer>
    </section>
  );
}

function ProfilePage({ user, token, notify, onUserUpdate }) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      password: "",
    });
  }, [user]);

  return (
    <section className="client-card">
      <h2>Профиль</h2>
      {error && <p className="error">{error}</p>}
      <div className="client-details">
        <DetailRow label="ФИО" value={user.full_name} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Логин" value={user.username} />
        <DetailRow label="Телефон" value={user.phone || "Не указан"} />
      </div>
      <div className="profile-form">
        <h3>Изменить личные данные</h3>
        <label>ФИО</label>
        <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label>Телефон</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label>Новый пароль</label>
        <PasswordInput
          placeholder="Оставьте пустым, если пароль менять не нужно"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <p className="profile-hint">Логин используется для входа и пока не изменяется, чтобы не сбрасывать текущую сессию.</p>
        <button
          className="client-primary-btn full"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);
              const payload = {
                full_name: form.full_name,
                email: form.email,
                phone: form.phone || null,
              };
              if (form.password.trim()) {
                payload.password = form.password;
              }
              const updatedUser = await api.updateMe(payload, token);
              onUserUpdate(updatedUser);
              setError("");
              notify("success", "Профиль обновлен");
            } catch (e) {
              setError(e.message);
              notify("error", e.message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Сохраняем..." : "Сохранить изменения"}
        </button>
      </div>
    </section>
  );
}

function ClientDrawer({ title, open, onClose, children }) {
  if (!open) {
    return null;
  }

  return (
    <div className="client-drawer-backdrop" onClick={onClose}>
      <aside className="client-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="client-drawer-header">
          <h3>{title}</h3>
          <button className="drawer-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="client-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

function DetailRow({ label, value, strong = false }) {
  return (
    <div className={`detail-row ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ClientStatusPill({ status }) {
  return <span className={`client-status client-status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function ChatPanel({ requestId, token, title }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getRequestChat(requestId, token);
      setMessages(data);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token]);

  const sendMessage = async () => {
    if (!text.trim()) {
      return;
    }
    setSending(true);
    try {
      const message = await api.sendRequestChatMessage(requestId, text.trim(), token);
      setMessages((current) => [...current, message]);
      setText("");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-panel">
      <h4>
        <MessageCircle size={16} />
        {title}
      </h4>
      <div className="chat-messages">
        {error ? (
          <div className="chat-empty">{error}</div>
        ) : loading ? (
          <div className="chat-empty">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">Сообщений пока нет</div>
        ) : (
          messages.map((message) => (
            <div className={`chat-message chat-message-${message.sender_role}`} key={message.id}>
              <div className="chat-message-meta">
                <strong>{message.sender_name}</strong>
                <span>{new Date(message.created_at).toLocaleString("ru-RU")}</span>
              </div>
              <p>{message.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="chat-input-row">
        <textarea
          placeholder="Напишите сообщение..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button className="client-primary-btn" disabled={sending} onClick={sendMessage}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function ManagerRequestsPage({ token, notify }) {
  const [requests, setRequests] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [orderRequest, setOrderRequest] = useState(null);
  const [orderForm, setOrderForm] = useState({ request_id: "", hotel_name: "", hotel_category: "", weekly_cost: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshRequests = async () => {
    setLoading(true);
    try {
      const [all, assigned] = await Promise.all([api.allRequests(token), api.myAssignedRequests(token)]);
      setRequests(all.filter((request) => !request.manager_id));
      setAssignedRequests(assigned);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const takeRequest = async (requestId) => {
    try {
      await api.takeRequest(requestId, token);
      notify("success", `Заявка #TR-${requestId} взята в обработку`);
      refreshRequests();
    } catch (e) {
      setError(e.message);
      notify("error", e.message);
    }
  };

  const openOrderDrawer = (request) => {
    setSelectedRequest(null);
    setOrderRequest(request);
    setOrderForm({
      request_id: request.id,
      hotel_name: "",
      hotel_category: request.destination,
      weekly_cost: "",
    });
  };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <section className="client-card manager-section">
        <h2>Новые заявки на обработку</h2>
        {loading ? <SkeletonList count={3} /> : (
          <ManagerRequestsTable
            requests={requests}
            actions={(item) => (
              <>
                <button className="client-outline-btn compact" onClick={() => setSelectedRequest(item)}>Подробнее</button>
                <button className="client-outline-btn compact" onClick={() => takeRequest(item.id)}>Взять в обработку</button>
              </>
            )}
          />
        )}
      </section>

      <section className="client-card manager-section">
        <h2>Твои заявки</h2>
        {loading ? <SkeletonList count={3} /> : (
          <ManagerRequestsTable
            requests={assignedRequests}
            actions={(item) => (
              <button className="client-outline-btn compact" onClick={() => setSelectedRequest(item)}>Подробнее</button>
            )}
          />
        )}
      </section>

      <ClientDrawer title={selectedRequest ? `Детали заявки #TR-${selectedRequest.id}` : ""} open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)}>
        {selectedRequest && (
          <div className="client-details">
            <DetailRow label="Клиент" value={`Клиент #${selectedRequest.client_id}`} />
            <DetailRow label="Страна" value={selectedRequest.destination} />
            <DetailRow label="Дата вылета" value={selectedRequest.travel_dates} />
            <DetailRow label="Количество человек" value={selectedRequest.travelers_count} />
            <DetailRow label="Пожелания" value={selectedRequest.notes || "Не указаны"} />
            {selectedRequest.manager_id ? (
              <button className="client-primary-btn full" onClick={() => openOrderDrawer(selectedRequest)}>
                Создать заказ
              </button>
            ) : (
              <button className="client-primary-btn full" onClick={() => takeRequest(selectedRequest.id)}>
                Назначить себя менеджером
              </button>
            )}
            {selectedRequest.manager_id && <ChatPanel requestId={selectedRequest.id} token={token} title="Чат с клиентом" />}
          </div>
        )}
      </ClientDrawer>

      <ClientDrawer title="Создание заказа" open={Boolean(orderRequest)} onClose={() => setOrderRequest(null)}>
        {orderRequest && (
          <div className="client-details">
            <DetailRow label="Заявка" value={`#TR-${orderRequest.id}`} />
            <DetailRow label="Клиент" value={`Клиент #${orderRequest.client_id}`} />
            <label>Отель</label>
            <input placeholder="Название отеля" value={orderForm.hotel_name} onChange={(e) => setOrderForm({ ...orderForm, hotel_name: e.target.value })} />
            <label>Категория</label>
            <input placeholder="Страна или категория" value={orderForm.hotel_category} onChange={(e) => setOrderForm({ ...orderForm, hotel_category: e.target.value })} />
            <label>Стоимость за неделю</label>
            <input type="number" placeholder="65000" value={orderForm.weekly_cost} onChange={(e) => setOrderForm({ ...orderForm, weekly_cost: Number(e.target.value) })} />
            <div className="manager-cost-box">
              <DetailRow label="2 недели x 60 000 ₽" value={formatCurrency((Number(orderForm.weekly_cost) || 0) * 2)} />
              <DetailRow label="Скидка" value={formatCurrency(Math.round((Number(orderForm.weekly_cost) || 0) * 0.1))} />
              <DetailRow label="Итого" value={formatCurrency(Math.round((Number(orderForm.weekly_cost) || 0) * 1.9))} strong />
            </div>
            <label>Комментарий для клиента</label>
            <textarea placeholder="Опишите преимущества отеля, включенные услуги..." />
            <button
              className="client-primary-btn full"
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  await api.createOrder(orderForm, token);
                  notify("success", "Заказ создан и отправлен клиенту");
                  setOrderRequest(null);
                  refreshRequests();
                } catch (e) {
                  setError(e.message);
                  notify("error", e.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Создаем..." : "Создать заказ и отправить клиенту"}
            </button>
          </div>
        )}
      </ClientDrawer>
    </>
  );
}

function ManagerRequestsTable({ requests, actions }) {
  return (
    <div className="client-table-wrap">
      <table className="client-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Клиент</th>
            <th>Направление</th>
            <th>Дата вылета</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((item) => (
            <tr key={item.id}>
              <td>TR-{item.id}</td>
              <td>Клиент #{item.client_id}</td>
              <td>{item.destination}</td>
              <td>{item.travel_dates}</td>
              <td><div className="manager-actions">{actions(item)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManagerOrdersPage({ token, notify, userRole }) {
  const [orders, setOrders] = useState([]);
  const [orderForm, setOrderForm] = useState({ request_id: "", hotel_name: "", hotel_category: "", weekly_cost: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const canCreateOrder = userRole === "manager";

  const refreshOrders = async () => {
    setLoading(true);
    try {
      const data = await api.allOrders(token);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [token]);

  if (userRole === "manager") {
    return (
      <section className="client-card">
        <h2>Твои заказы</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>Отель</th>
                  <th>Стоимость</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((item) => (
                  <tr key={item.id}>
                    <td>OR-{item.id}</td>
                    <td>Клиент #{item.request_id}</td>
                    <td>{item.hotel_name}</td>
                    <td>{formatCurrency(item.weekly_cost)}</td>
                    <td><ClientStatusPill status={item.status} /></td>
                    <td>
                      <button className="client-outline-btn compact" onClick={() => setSelectedOrder(item)}>
                        Подробнее
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ClientDrawer title={selectedOrder ? `Детали заказа #OR-${selectedOrder.id}` : ""} open={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)}>
          {selectedOrder && (
            <div className="client-details">
              <ClientStatusPill status={selectedOrder.status} />
              <DetailRow label="Клиент" value={`Клиент #${selectedOrder.request_id}`} />
              <DetailRow label="Отель" value={selectedOrder.hotel_name} />
              <DetailRow label="Страна" value={selectedOrder.hotel_category} />
              <DetailRow label="Дата заказа" value={new Date(selectedOrder.created_at).toLocaleDateString("ru-RU")} />
              <DetailRow label="Стоимость" value={formatCurrency(selectedOrder.weekly_cost)} />
              <DetailRow label="Скидка/комиссия" value={formatCurrency(Math.round(selectedOrder.weekly_cost * 0.05))} />
              <DetailRow label="Итого к оплате" value={formatCurrency(Math.round(selectedOrder.weekly_cost * 1.05))} strong />
              <button
                className="client-primary-btn full"
                onClick={() => setStatusModal({ order: selectedOrder, nextStatus: selectedOrder.status })}
              >
                Изменить статус
              </button>
              <ChatPanel requestId={selectedOrder.request_id} token={token} title="Чат с клиентом" />
            </div>
          )}
        </ClientDrawer>

        <ConfirmModal
          open={Boolean(statusModal)}
          title="Изменение статуса заказа"
          description={
            statusModal ? (
              <select
                value={statusModal.nextStatus}
                onChange={(e) => setStatusModal({ ...statusModal, nextStatus: e.target.value })}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            ) : ""
          }
          confirmText={statusUpdating ? "Сохраняем..." : "Сохранить изменения"}
          onClose={() => !statusUpdating && setStatusModal(null)}
          onConfirm={async () => {
            if (!statusModal) {
              return;
            }
            try {
              setStatusUpdating(true);
              await api.updateOrderStatus(statusModal.order.id, statusModal.nextStatus, token);
              setError("");
              notify("success", `Статус заказа #${statusModal.order.id} обновлен`);
              setSelectedOrder(null);
              setStatusModal(null);
              refreshOrders();
            } catch (e) {
              setError(e.message);
              notify("error", e.message);
            } finally {
              setStatusUpdating(false);
            }
          }}
        />
      </section>
    );
  }

  return (
    <section className="card">
      <PageTitle icon={ShoppingBag} title="Все заказы" />
      {error && <p className="error">{error}</p>}
      {canCreateOrder && (
        <>
          <h3>Создать заказ из заявки</h3>
          <input
            placeholder="ID заявки"
            value={orderForm.request_id}
            onChange={(e) => setOrderForm({ ...orderForm, request_id: Number(e.target.value) })}
          />
          <input placeholder="Отель" value={orderForm.hotel_name} onChange={(e) => setOrderForm({ ...orderForm, hotel_name: e.target.value })} />
          <input
            placeholder="Категория"
            value={orderForm.hotel_category}
            onChange={(e) => setOrderForm({ ...orderForm, hotel_category: e.target.value })}
          />
          <input
            type="number"
            placeholder="Цена в неделю"
            value={orderForm.weekly_cost}
            onChange={(e) => setOrderForm({ ...orderForm, weekly_cost: Number(e.target.value) })}
          />
          <button
            className="btn"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await api.createOrder(orderForm, token);
                setOrderForm({ request_id: "", hotel_name: "", hotel_category: "", weekly_cost: "" });
                setError("");
                notify("success", "Заказ создан");
                refreshOrders();
              } catch (e) {
                setError(e.message);
                notify("error", e.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <PlusCircle size={16} />
            {saving ? "Сохраняем..." : "Создать заказ"}
          </button>
        </>
      )}

      <h3>Все заказы</h3>
      {loading ? <SkeletonList count={5} /> : <ul className="list">
        {orders.map((item) => (
          <li key={item.id} className="list-item">
            <div>
              <strong>#{item.id}</strong>
              <p>{item.hotel_name}</p>
            </div>
            <StatusPill status={item.status} />
            <select
              value={item.status}
              onChange={(e) => setStatusModal({ order: item, nextStatus: e.target.value })}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>}
      <ConfirmModal
        open={Boolean(statusModal)}
        title="Подтвердите смену статуса"
        description={
          statusModal ? `Изменить статус заказа #${statusModal.order.id} на "${STATUS_LABELS[statusModal.nextStatus]}"?` : ""
        }
        confirmText={statusUpdating ? "Сохраняем..." : "Подтвердить"}
        onClose={() => !statusUpdating && setStatusModal(null)}
        onConfirm={async () => {
          if (!statusModal) {
            return;
          }
          try {
            setStatusUpdating(true);
            await api.updateOrderStatus(statusModal.order.id, statusModal.nextStatus, token);
            setError("");
            notify("success", `Статус заказа #${statusModal.order.id} обновлен`);
            setStatusModal(null);
            refreshOrders();
          } catch (e) {
            setError(e.message);
            notify("error", e.message);
          } finally {
            setStatusUpdating(false);
          }
        }}
      />
    </section>
  );
}

function AdminAnalyticsPage({ token }) {
  const [overview, setOverview] = useState(null);
  const [daysChart, setDaysChart] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.analyticsOverview(token), api.analyticsByDay(token)])
      .then(([o, d]) => {
        setOverview(o);
        setDaysChart(d);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <section className="client-card manager-section">
      <h2>Аналитика продаж</h2>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="admin-stats-grid compact">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="admin-stat-card" key={index}>
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-stats-grid compact">
          <article className="admin-stat-card blue"><strong>{overview?.total_orders ?? 0}</strong><span>Новые</span></article>
          <article className="admin-stat-card yellow"><strong>{overview?.pending_payment_orders ?? 0}</strong><span>Ожидают оплату</span></article>
          <article className="admin-stat-card green"><strong>{overview?.paid_orders ?? 0}</strong><span>Оплачено</span></article>
          <article className="admin-stat-card red"><strong>{overview?.cancelled_orders ?? 0}</strong><span>Отменено</span></article>
        </div>
      )}

      <h3>Динамика заказов по дням</h3>
      <div className="chart">{loading ? <div className="skeleton chart-skeleton" /> : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={daysChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [value, "Количество заказов"]} />
            <Legend />
            <Line type="monotone" dataKey="count" name="Количество заказов" stroke="#32a852" />
          </LineChart>
        </ResponsiveContainer>
      )}</div>
    </section>
  );
}

function AdminManagersPage({ token, notify }) {
  const [managers, setManagers] = useState([]);
  const [managerForm, setManagerForm] = useState({ full_name: "", email: "", username: "", phone: "", password: "" });
  const [editManager, setEditManager] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshManagers = async () => {
    setLoading(true);
    try {
      const data = await api.listManagers(token);
      setManagers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshManagers();
  }, [token]);

  return (
    <>
      {error && <p className="error">{error}</p>}
      <section className="client-card manager-section">
        <div className="admin-section-header">
          <h2>Управление менеджерами</h2>
        </div>
        {loading ? <SkeletonList count={4} /> : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((item) => (
                  <tr key={item.id}>
                    <td>{item.full_name}</td>
                    <td>{item.username}</td>
                    <td>{item.email}</td>
                    <td>{item.phone || "-"}</td>
                    <td>
                      <span className={`client-status ${item.is_active ? "client-status-paid" : "client-status-cancelled"}`}>
                        {item.is_active ? "Активен" : "Отключен"}
                      </span>
                    </td>
                    <td>
                      <div className="manager-actions">
                        <button className="client-outline-btn compact" onClick={() => setEditManager({ ...item, password: "" })}>
                          <Edit3 size={14} />
                          Изменить
                        </button>
                        <button
                          className="client-outline-btn compact danger"
                          onClick={async () => {
                            try {
                              await api.deactivateManager(item.id, token);
                              notify("success", "Менеджер отключен");
                              refreshManagers();
                            } catch (e) {
                              notify("error", e.message);
                            }
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="add-manager-form" className="client-card manager-section">
        <h2>Добавить менеджера</h2>
        <div className="admin-form-grid">
          <input placeholder="ФИО" value={managerForm.full_name} onChange={(e) => setManagerForm({ ...managerForm, full_name: e.target.value })} />
          <input placeholder="Логин" value={managerForm.username} onChange={(e) => setManagerForm({ ...managerForm, username: e.target.value })} />
          <PasswordInput
            placeholder="Пароль"
            value={managerForm.password}
            onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
          />
          <input placeholder="Email" value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} />
          <input placeholder="Телефон" value={managerForm.phone} onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })} />
        </div>
        <div className="admin-form-actions">
          <button
            className="client-primary-btn"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await api.createManager(managerForm, token);
                setManagerForm({ full_name: "", email: "", username: "", phone: "", password: "" });
                setError("");
                notify("success", "Менеджер добавлен");
                refreshManagers();
              } catch (e) {
                setError(e.message);
                notify("error", e.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Сохраняем..." : "Добавить менеджера"}
          </button>
          <button className="client-outline-btn" onClick={() => setManagerForm({ full_name: "", email: "", username: "", phone: "", password: "" })}>
            Сброс
          </button>
        </div>
      </section>

      <ClientDrawer title="Редактирование менеджера" open={Boolean(editManager)} onClose={() => setEditManager(null)}>
        {editManager && (
          <div className="client-details">
            <label>ФИО менеджера</label>
            <input value={editManager.full_name} onChange={(e) => setEditManager({ ...editManager, full_name: e.target.value })} />
            <label>Логин</label>
            <input value={editManager.username} onChange={(e) => setEditManager({ ...editManager, username: e.target.value })} />
            <label>Email</label>
            <input value={editManager.email} onChange={(e) => setEditManager({ ...editManager, email: e.target.value })} />
            <label>Телефон</label>
            <input value={editManager.phone || ""} onChange={(e) => setEditManager({ ...editManager, phone: e.target.value })} />
            <label>Новый пароль</label>
            <PasswordInput
              placeholder="Оставьте пустым, если не меняете"
              value={editManager.password}
              onChange={(e) => setEditManager({ ...editManager, password: e.target.value })}
            />
            <button
              className="client-primary-btn full"
              onClick={async () => {
                try {
                  const payload = {
                    full_name: editManager.full_name,
                    username: editManager.username,
                    email: editManager.email,
                    phone: editManager.phone,
                    is_active: editManager.is_active,
                  };
                  if (editManager.password) {
                    payload.password = editManager.password;
                  }
                  await api.updateManager(editManager.id, payload, token);
                  notify("success", "Менеджер обновлен");
                  setEditManager(null);
                  refreshManagers();
                } catch (e) {
                  notify("error", e.message);
                }
              }}
            >
              Сохранить изменения
            </button>
            <button className="client-outline-btn full" onClick={() => setEditManager(null)}>
              Отмена
            </button>
          </div>
        )}
      </ClientDrawer>
    </>
  );
}

function NotificationsPage({ token }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.notifications(token)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <section className="card">
      <PageTitle icon={Bell} title="Внутренние уведомления" />
      {error && <p className="error">{error}</p>}
      {loading ? <SkeletonList count={4} /> : <ul className="list">
        {items.map((item) => (
          <li key={item.id} className="list-item">
            <span>{item.message}</span>
          </li>
        ))}
      </ul>}
    </section>
  );
}

function StatusPill({ status }) {
  return <span className={`pill status-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function PageTitle({ icon: Icon, title }) {
  return (
    <h2 className="page-title">
      <Icon size={20} />
      {title}
    </h2>
  );
}

function PasswordInput({ value, onChange, placeholder = "Пароль" }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        placeholder={placeholder}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"}
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SkeletonList({ count = 4 }) {
  return (
    <ul className="list">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="list-item">
          <div className="skeleton-group">
            <div className="skeleton skeleton-line medium" />
            <div className="skeleton skeleton-line short" />
          </div>
          <div className="skeleton skeleton-pill" />
        </li>
      ))}
    </ul>
  );
}

function ConfirmModal({ open, title, description, confirmText, onClose, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="modal-description">{description}</div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn" onClick={onConfirm}>
            <CheckCircle2 size={16} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}
