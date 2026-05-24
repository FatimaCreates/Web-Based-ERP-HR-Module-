import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { FiHome, FiUsers, FiClock, FiCalendar, FiDollarSign, FiBell, FiUser, FiLogOut, FiMenu, FiX, FiCheck, FiXCircle, FiPlay, FiSquare, FiPlus, FiEdit2, FiTrash2, FiEye, FiChevronRight, FiTrendingUp, FiAlertCircle, FiPrinter } from 'react-icons/fi';
import axios from 'axios';
import './App.css';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ── TOAST ─────────────────────────────────────────────────────────────────────
const toastQueue = [];
let toastSetter = null;
const toast = {
  success: (msg) => toastSetter?.({ msg, type: 'success', id: Date.now() }),
  error: (msg) => toastSetter?.({ msg, type: 'error', id: Date.now() }),
  info: (msg) => toastSetter?.({ msg, type: 'info', id: Date.now() }),
};
const ToastContainer = () => {
  const [t, setT] = useState(null);
  useEffect(() => { toastSetter = setT; }, []);
  useEffect(() => { if (t) { const id = setTimeout(() => setT(null), 3500); return () => clearTimeout(id); } }, [t]);
  if (!t) return null;
  return (
    <div className={`toast toast-${t.type}`}>
      {t.type === 'success' ? <FiCheck /> : t.type === 'error' ? <FiXCircle /> : <FiAlertCircle />}
      <span>{t.msg}</span>
    </div>
  );
};

// ── AVATAR ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 40 }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: size * 0.35 }}>
      {initials || '?'}
    </div>
  );
};

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, trend }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <div className="stat-icon-wrap" style={{ background: `${color}22`, color }}>{icon}</div>
    <div className="stat-body">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
    {trend !== undefined && (
      <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
        <FiTrendingUp /> {Math.abs(trend)}%
      </div>
    )}
  </div>
);

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/login', form);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      onLogin(r.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
        <div className="auth-orb orb3" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <div className="auth-logo-title">ERP System</div>
            <div className="auth-logo-sub">Human Resources</div>
          </div>
        </div>
        <h2 className="auth-heading">Welcome back</h2>
        <p className="auth-desc">Sign in to your account to continue</p>
        <form onSubmit={submit} className="auth-form">
          <div className="field-group">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </div>
          <div className="field-group">
            <label>Password</label>
            <div className="pw-wrap">
              <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" required />
              <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)}>{show ? '🙈' : '👁'}</button>
            </div>
          </div>
          <button className="btn-auth" disabled={loading}>{loading ? <span className="spinner" /> : 'Sign In'}</button>
        </form>
        <p className="auth-switch">Don't have an account? <a href="/signup">Create one</a></p>
      </div>
    </div>
  );
};

// ── SIGNUP ────────────────────────────────────────────────────────────────────
const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '', phone: '', jobTitle: '', role: 'Employee' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/auth/signup', form);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1" /><div className="auth-orb orb2" /><div className="auth-orb orb3" />
      </div>
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div><div className="auth-logo-title">ERP System</div><div className="auth-logo-sub">Human Resources</div></div>
        </div>
        <h2 className="auth-heading">Create Account</h2>
        <form onSubmit={submit} className="auth-form">
          <div className="field-row">
            <div className="field-group"><label>First Name</label><input value={form.firstName} onChange={set('firstName')} placeholder="John" required /></div>
            <div className="field-group"><label>Last Name</label><input value={form.lastName} onChange={set('lastName')} placeholder="Doe" required /></div>
          </div>
          <div className="field-row">
            <div className="field-group"><label>Username</label><input value={form.username} onChange={set('username')} placeholder="johndoe" required /></div>
            <div className="field-group"><label>Phone</label><input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" /></div>
          </div>
          <div className="field-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" required /></div>
          <div className="field-row">
            <div className="field-group"><label>Job Title</label><input value={form.jobTitle} onChange={set('jobTitle')} placeholder="HR Manager" /></div>
            <div className="field-group">
              <label>Role</label>
              <select value={form.role} onChange={set('role')}>
                <option value="Employee">Employee</option>
                <option value="HR_Manager">HR Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="field-group"><label>Password</label><input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required /></div>
          <button className="btn-auth" disabled={loading}>{loading ? <span className="spinner" /> : 'Create Account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
      </div>
    </div>
  );
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiHome />, roles: ['HR_Manager', 'Admin', 'Employee'] },
  { id: 'employees', label: 'Employees', icon: <FiUsers />, roles: ['HR_Manager', 'Admin'] },
  { id: 'attendance', label: 'Attendance', icon: <FiClock />, roles: ['HR_Manager', 'Admin', 'Employee'] },
  { id: 'leave', label: 'Leave', icon: <FiCalendar />, roles: ['HR_Manager', 'Admin', 'Employee'] },
  { id: 'payroll', label: 'Payroll', icon: <FiDollarSign />, roles: ['HR_Manager', 'Admin', 'Employee'] },
  { id: 'announcements', label: 'Announcements', icon: <FiBell />, roles: ['HR_Manager', 'Admin', 'Employee'] },
  { id: 'profile', label: 'My Profile', icon: <FiUser />, roles: ['HR_Manager', 'Admin', 'Employee'] },
];

const Sidebar = ({ active, setActive, user, onLogout, collapsed, setCollapsed }) => {
  const items = navItems.filter(i => i.roles.includes(user?.role));
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">⚡</div>
        {!collapsed && <div className="brand-text"><span className="brand-name">ERP</span><span className="brand-sub">HR Module</span></div>}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight /> : <FiMenu />}
        </button>
      </div>
      {!collapsed && (
        <div className="sidebar-user">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} size={38} />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="sidebar-user-collapsed">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} size={34} />
        </div>
      )}
      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && active === item.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>
      <button className="logout-btn" onClick={onLogout} title={collapsed ? 'Logout' : ''}>
        <FiLogOut />
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
};

// ── TOPBAR ────────────────────────────────────────────────────────────────────
const Topbar = ({ active, user, onMenuToggle }) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenuToggle}><FiMenu /></button>
        <div className="page-title">{navItems.find(i => i.id === active)?.label || 'Dashboard'}</div>
      </div>
      <div className="topbar-right">
        <div className="topbar-datetime"><span className="topbar-time">{timeStr}</span><span className="topbar-date">{dateStr}</span></div>
        <div className="topbar-user">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} size={34} />
          <span className="topbar-username">{user?.firstName}</span>
        </div>
      </div>
    </header>
  );
};

// ── HR DASHBOARD ──────────────────────────────────────────────────────────────
const HRDashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/attendance-chart'),
      api.get('/announcements'),
    ]).then(([s, c, a]) => {
      setStats(s.data);
      setChartData(c.data.map(d => ({ ...d, AttendDate: new Date(d.AttendDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) })));
      setAnnouncements(a.data.slice(0, 3));
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ['#5eead4', '#86efac', '#a78bfa', '#f9a8d4'];

  if (loading) return <div className="loading-state"><span className="spinner lg" /></div>;

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'On Leave', value: stats.onLeaveToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'Absent', value: Math.max(0, stats.totalEmployees - stats.presentToday - stats.onLeaveToday) },
  ] : [];

  return (
    <div className="dashboard-grid">
      <div className="stats-row">
        <StatCard icon={<FiUsers />} label="Total Employees" value={stats?.totalEmployees} color="#5eead4" trend={stats?.newThisMonth} />
        <StatCard icon={<FiCheck />} label="Present Today" value={stats?.presentToday} color="#86efac" />
        <StatCard icon={<FiClock />} label="Late Today" value={stats?.lateToday} color="#a78bfa" />
        <StatCard icon={<FiCalendar />} label="Pending Leaves" value={stats?.pendingLeaves} color="#f9a8d4" />
        <StatCard icon={<FiDollarSign />} label="Monthly Payroll" value={`PKR ${(stats?.totalPayroll || 0).toLocaleString()}`} color="#67e8f9" />
        <StatCard icon={<FiTrendingUp />} label="Attendance Rate" value={`${stats?.attendanceRate}%`} color="#c4b5fd" />
      </div>

      <div className="charts-row">
        <div className="chart-card wide">
          <div className="chart-header"><h3>Attendance — Last 7 Days</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={6} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="AttendDate" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
              <Legend />
              <Bar dataKey="Present" fill="#5eead4" radius={[4, 4, 0, 0]} maxBarSize={124} />
              <Bar dataKey="Late" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={64} />
              <Bar dataKey="Absent" fill="#f9a8d4" radius={[4, 4, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header"><h3>Today's Status</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bottom-row">
        <div className="announce-card">
          <div className="chart-header"><h3><FiBell /> Latest Announcements</h3></div>
          {announcements.length === 0 ? <div className="empty-state">No announcements yet</div> :
            announcements.map(a => (
              <div key={a.AnnounceID} className="announce-item">
                <div className="announce-dot" />
                <div>
                  <div className="announce-title">{a.Title}</div>
                  <div className="announce-meta">By {a.PostedBy} · {new Date(a.PostedDate).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
        </div>
        <div className="mini-calendar-card">
          <div className="chart-header"><h3>📅 {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3></div>
          <MiniCalendar />
        </div>
      </div>
    </div>
  );
};

// ── MINI CALENDAR ─────────────────────────────────────────────────────────────
const MiniCalendar = () => {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return (
    <div className="mini-cal">
      <div className="cal-days-header">{days.map(d => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => (
          <span key={i} className={`cal-day ${d === now.getDate() ? 'today' : ''} ${!d ? 'empty' : ''}`}>{d}</span>
        ))}
      </div>
    </div>
  );
};

// ── EMPLOYEE DASHBOARD ────────────────────────────────────────────────────────
const EmployeeDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/dashboard/my-stats'), api.get('/announcements')])
      .then(([s, a]) => { setStats(s.data); setAnnouncements(a.data); })
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="stats-row">
        <StatCard icon={<FiCheck />} label="Present This Month" value={stats?.presentDays} color="#10b981" />
        <StatCard icon={<FiClock />} label="Late This Month" value={stats?.lateDays} color="#f59e0b" />
        <StatCard icon={<FiCalendar />} label="Pending Leaves" value={stats?.pendingLeaves} color="#ef4444" />
        <StatCard icon={<FiDollarSign />} label="Last Net Pay" value={stats?.latestPayroll ? `PKR ${parseFloat(stats.latestPayroll.NetPay).toLocaleString()}` : '—'} color="#6366f1" />
      </div>
      <div className="charts-row">
        <div className="chart-card wide">
          <div className="chart-header"><h3><FiBell /> Announcements</h3></div>
          {announcements.length === 0 ? <div className="empty-state">No announcements</div> :
            announcements.map(a => (
              <div key={a.AnnounceID} className="announce-item">
                <div className="announce-dot" />
                <div>
                  <div className="announce-title">{a.Title}</div>
                  <div className="announce-content">{a.Content}</div>
                  <div className="announce-meta">By {a.PostedBy} · {new Date(a.PostedDate).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Leave Balances</h3></div>
          {stats?.leaveBalance?.map(b => (
            <div key={b.TypeID} className="leave-balance-item">
              <div className="lb-name">{b.TypeName}</div>
              <div className="lb-bar-wrap">
                <div className="lb-bar" style={{ width: `${(b.RemainingDays / b.MaxDaysPerYear) * 100}%` }} />
              </div>
              <div className="lb-days">{b.RemainingDays}/{b.MaxDaysPerYear}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── ATTENDANCE MODULE ─────────────────────────────────────────────────────────
const AttendanceModule = ({ user }) => {
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [tab, setTab] = useState(user?.role === 'Employee' ? 'my' : 'all');
  const [filter, setFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [loading, setLoading] = useState(false);
  const isHR = user?.role !== 'Employee';

useEffect(() => {
    api.get('/attendance/today').then(r => setTodayRecord(r.data)).catch(() => {});
    fetchRecords();
  }, [filter, tab]);

  const fetchRecords = async () => {
    try {
      if (isHR && tab === 'all') {
        const [all, sum] = await Promise.all([
          api.get('/attendance/all', { params: filter }),
          api.get('/attendance/summary', { params: filter }),
        ]);
        setRecords(all.data);
        setSummary(sum.data);
      } else {
        const r = await api.get('/attendance/my', { params: filter });
        setRecords(r.data);
      }
    } catch { toast.error('Failed to load attendance'); }
  };

  const checkIn = async () => {
    setLoading(true);
    try {
      const r = await api.post('/attendance/checkin');
      toast.success(r.data.message);
      setTodayRecord(r.data);
      fetchRecords();
    } catch (e) { toast.error(e.response?.data?.message || 'Check-in failed'); }
    finally { setLoading(false); }
  };

  const checkOut = async () => {
    setLoading(true);
    try {
      const r = await api.post('/attendance/checkout');
      toast.success(r.data.message);
      api.get('/attendance/today').then(r => setTodayRecord(r.data));
      fetchRecords();
    } catch (e) { toast.error(e.response?.data?.message || 'Check-out failed'); }
    finally { setLoading(false); }
  };

  const statusClass = s => ({ Present: 'badge-success', Late: 'badge-warning', Absent: 'badge-danger', HalfDay: 'badge-info' }[s] || '');

  return (
    <div className="module-container">
      <div className="checkin-panel">
        <div className="checkin-time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div className="checkin-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div className="checkin-status-row">
          <div className={`checkin-badge ${todayRecord?.CheckInTime ? 'checked-in' : 'not-checked'}`}>
            {todayRecord?.CheckInTime ? `✅ Checked In at ${new Date(todayRecord.CheckInTime).toLocaleTimeString()}` : '⭕ Not Checked In'}
          </div>
          {todayRecord?.CheckOutTime && <div className="checkin-badge checked-out">🏁 Checked Out at {new Date(todayRecord.CheckOutTime).toLocaleTimeString()}</div>}
          {todayRecord?.Status === 'Late' && <div className="checkin-badge late-badge">⚠️ Late Arrival</div>}
        </div>
        <div className="checkin-btns">
          <button className="btn-checkin" onClick={checkIn} disabled={!!todayRecord?.CheckInTime || loading}><FiPlay /> Check In</button>
          <button className="btn-checkout" onClick={checkOut} disabled={!todayRecord?.CheckInTime || !!todayRecord?.CheckOutTime || loading}><FiSquare /> Check Out</button>
        </div>
      </div>

      <div className="module-filters">
        <div className="filter-tabs">
          {isHR && <button className={`ftab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Employees</button>}
          <button className={`ftab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Attendance</button>
          {isHR && <button className={`ftab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>Monthly Summary</button>}
        </div>
        <div className="filter-controls">
          <select value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select value={filter.year} onChange={e => setFilter(f => ({ ...f, year: e.target.value }))}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn-primary sm" onClick={fetchRecords}>Filter</button>
        </div>
      </div>

      {tab === 'summary' && isHR ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Present</th><th>Late</th><th>Absent</th><th>Half Day</th></tr></thead>
            <tbody>{summary.map((r, i) => (
              <tr key={i}>
                <td><div className="td-user"><Avatar name={r.FullName} size={28} />{r.FullName}</div></td>
                <td>{r.DeptName}</td>
                <td><span className="badge badge-success">{r.PresentDays}</span></td>
                <td><span className="badge badge-warning">{r.LateDays}</span></td>
                <td><span className="badge badge-danger">{r.AbsentDays}</span></td>
                <td><span className="badge badge-info">{r.HalfDays}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr>
              {isHR && tab === 'all' && <th>Employee</th>}
              <th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th>
              {isHR && <th>Late?</th>}
            </tr></thead>
            <tbody>{records.map((r, i) => (
              <tr key={i} className={r.IsLate ? 'row-late' : r.IsEarlyCheckout ? 'row-early' : ''}>
                {isHR && tab === 'all' && <td><div className="td-user"><Avatar name={r.EmployeeName} size={28} />{r.EmployeeName}</div></td>}
                <td>{new Date(r.AttendDate).toLocaleDateString()}</td>
                <td className={r.IsLate ? 'text-warning' : ''}>{r.CheckInTime ? new Date(r.CheckInTime).toLocaleTimeString() : '—'}</td>
                <td className={r.IsEarlyCheckout ? 'text-warning' : ''}>{r.CheckOutTime ? new Date(r.CheckOutTime).toLocaleTimeString() : '—'}</td>
                <td><span className={`badge ${statusClass(r.Status)}`}>{r.Status}</span></td>
                {isHR && <td>{r.IsLate ? <span className="badge badge-warning">Late</span> : r.IsEarlyCheckout ? <span className="badge badge-info">Early Out</span> : <span className="badge badge-success">OK</span>}</td>}
              </tr>
            ))}</tbody>
          </table>
          {records.length === 0 && <div className="empty-state">No records found for this period</div>}
        </div>
      )}
    </div>
  );
};

// ── LEAVE MODULE ──────────────────────────────────────────────────────────────
const LeaveModule = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState([]);
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ typeId: '', startDate: '', endDate: '', reason: '' });
  const isHR = user?.role !== 'Employee';
  const [tab, setTab] = useState(isHR ? 'all' : 'my');

  useEffect(() => {
    api.get('/leave/types').then(r => setTypes(r.data));
    api.get('/leave/balance').then(r => setBalance(r.data));
    fetchRequests();
  }, [tab]);

  const fetchRequests = async () => {
    try {
      const r = isHR && tab === 'all'
        ? await api.get('/leave/all')
        : await api.get('/leave/my');
      setRequests(r.data);
    } catch { toast.error('Failed to load leave requests'); }
  };

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/leave/request', {
     ...form,
     typeId: parseInt(form.typeId)
     });
      toast.success('Leave request submitted');
      setShowForm(false);
      setForm({ typeId: '', startDate: '', endDate: '', reason: '' });
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/leave/${id}/status`, { status });
      toast.success(`Leave ${status.toLowerCase()}`);
      fetchRequests();
    } catch { toast.error('Failed to update'); }
  };

  const statusClass = s => ({ Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' }[s]);

  return (
    <div className="module-container">
      {!isHR && (
        <div className="leave-balance-row">
          {balance.map(b => (
            <div key={b.TypeID} className="balance-card">
              <div className="bc-name">{b.TypeName}</div>
              <div className="bc-nums"><span className="bc-remaining">{b.RemainingDays}</span><span className="bc-total">/ {b.MaxDaysPerYear} days</span></div>
              <div className="bc-bar"><div className="bc-fill" style={{ width: `${(b.RemainingDays / b.MaxDaysPerYear) * 100}%` }} /></div>
              <div className="bc-used">{b.UsedDays} used</div>
            </div>
          ))}
        </div>
      )}

      <div className="module-filters">
        <div className="filter-tabs">
          {isHR && <button className={`ftab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Requests</button>}
          <button className={`ftab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Requests</button>
        </div>
        {!isHR && <button className="btn-primary" onClick={() => setShowForm(s => !s)}><FiPlus /> New Request</button>}
      </div>

      {showForm && !isHR && (
        <div className="form-card">
          <h3>Submit Leave Request</h3>
          <form onSubmit={submit} className="form-grid">
            <div className="field-group">
              <label>Leave Type</label>
              <select value={form.typeId} onChange={e => setForm(f => ({ ...f, typeId: e.target.value }))} required>
                <option value="">Select type</option>
                {types.map(t => <option key={t.TypeID} value={t.TypeID}>{t.TypeName}</option>)}
              </select>
            </div>
            <div className="field-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
            <div className="field-group"><label>End Date</label><input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
            <div className="field-group full-width"><label>Reason</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Reason for leave..." /></div>
            <div className="form-actions"><button type="submit" className="btn-primary">Submit</button><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button></div>
          </form>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr>
            {isHR && <th>Employee</th>}
            <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>
            {isHR && <th>Actions</th>}
          </tr></thead>
          <tbody>{requests.map(r => (
            <tr key={r.LeaveID}>
              {isHR && <td><div className="td-user"><Avatar name={r.EmployeeName} size={28} />{r.EmployeeName}</div></td>}
              <td>{r.TypeName}</td>
              <td>{new Date(r.StartDate).toLocaleDateString()}</td>
              <td>{new Date(r.EndDate).toLocaleDateString()}</td>
              <td>{r.TotalDays}</td>
              <td className="td-reason">{r.Reason || '—'}</td>
              <td><span className={`badge ${statusClass(r.Status)}`}>{r.Status}</span></td>
              {isHR && r.Status === 'Pending' && (
                <td>
                  <div className="action-btns">
                    <button className="btn-icon success" onClick={() => updateStatus(r.LeaveID, 'Approved')} title="Approve"><FiCheck /></button>
                    <button className="btn-icon danger" onClick={() => updateStatus(r.LeaveID, 'Rejected')} title="Reject"><FiXCircle /></button>
                  </div>
                </td>
              )}
              {isHR && r.Status !== 'Pending' && <td><span className="text-muted">—</span></td>}
            </tr>
          ))}</tbody>
        </table>
        {requests.length === 0 && <div className="empty-state">No leave requests found</div>}
      </div>
    </div>
  );
};

// ── PAYROLL MODULE ────────────────────────────────────────────────────────────
const PayrollModule = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [running, setRunning] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const isHR = user?.role !== 'Employee';

  useEffect(() => { fetchPayroll(); }, [filter]);

  const fetchPayroll = async () => {
    try {
      const r = isHR
        ? await api.get('/payroll/all', { params: filter })
        : await api.get('/payroll/my');
      setRecords(r.data);
    } catch { toast.error('Failed to load payroll'); }
  };

  const runPayroll = async () => {
    setRunning(true);
    try {
      const r = await api.post('/payroll/run', filter);
      toast.success(r.data.message);
      fetchPayroll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setRunning(false); }
  };

  const viewReceipt = async (id) => {
    try {
      const r = await api.get(`/payroll/receipt/${id}`);
      setReceipt(r.data);
    } catch { toast.error('Failed to load payslip'); }
  };

  if (receipt) return <Payslip data={receipt} onBack={() => setReceipt(null)} />;

  return (
    <div className="module-container">
      <div className="module-filters">
        <div className="filter-controls">
          <select value={filter.month} onChange={e => setFilter(f => ({ ...f, month: parseInt(e.target.value) }))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select value={filter.year} onChange={e => setFilter(f => ({ ...f, year: parseInt(e.target.value) }))}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        {isHR && <button className="btn-primary" onClick={runPayroll} disabled={running}>{running ? <><span className="spinner sm" /> Processing...</> : <><FiPlay /> Run Payroll</>}</button>}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr>
            <th>Employee</th>
            {isHR && <th>Department</th>}
            <th>Base Salary</th><th>Allowances</th><th>Late Ded.</th><th>Tax</th><th>Net Pay</th><th>Status</th><th>Payslip</th>
          </tr></thead>
          <tbody>{records.map(r => (
            <tr key={r.PayrollID}>
              <td><div className="td-user"><Avatar name={r.EmployeeName} size={28} />{r.EmployeeName}</div></td>
              {isHR && <td>{r.DeptName}</td>}
              <td>PKR {parseFloat(r.BaseSalary).toLocaleString()}</td>
              <td>PKR {parseFloat(r.Allowances).toLocaleString()}</td>
              <td className="text-warning">PKR {parseFloat(r.LateDeduction).toLocaleString()}</td>
              <td>PKR {parseFloat(r.TaxAmount).toLocaleString()}</td>
              <td className="text-success font-bold">PKR {parseFloat(r.NetPay).toLocaleString()}</td>
              <td><span className={`badge ${{ Draft: 'badge-info', Processed: 'badge-warning', Paid: 'badge-success' }[r.Status]}`}>{r.Status}</span></td>
              <td><button className="btn-icon primary" onClick={() => viewReceipt(r.PayrollID)} title="View Payslip"><FiEye /></button></td>
            </tr>
          ))}</tbody>
        </table>
        {records.length === 0 && <div className="empty-state">No payroll records. Run payroll first.</div>}
      </div>
    </div>
  );
};

// ── PAYSLIP ───────────────────────────────────────────────────────────────────
const Payslip = ({ data, onBack }) => (
  <div className="payslip-page">
    <div className="payslip-actions">
      <button className="btn-secondary" onClick={onBack}>← Back</button>
      <button className="btn-primary" onClick={() => window.print()}><FiPrinter /> Print</button>
    </div>
    <div className="payslip" id="payslip-print">
      <div className="payslip-header">
        <div className="payslip-company">
          <div className="payslip-logo">⚡</div>
          <div><div className="payslip-company-name">ERP SYSTEM</div><div className="payslip-company-sub">Human Resources Department</div></div>
        </div>
        <div className="payslip-title-block">
          <div className="payslip-title">PAYSLIP</div>
          <div className="payslip-period">{data.payPeriod}</div>
        </div>
      </div>
      <div className="payslip-divider" />
      <div className="payslip-emp-section">
        <div className="payslip-emp-info">
          <Avatar name={data.employeeName} size={56} />
          <div>
            <div className="payslip-emp-name">{data.employeeName}</div>
            <div className="payslip-emp-title">{data.jobTitle}</div>
            <div className="payslip-emp-dept">{data.department}</div>
          </div>
        </div>
        <div className="payslip-meta">
          <div><span>Email</span><strong>{data.email}</strong></div>
          <div><span>Pay Period</span><strong>{data.payPeriod}</strong></div>
          <div><span>Generated</span><strong>{data.generatedAt}</strong></div>
          <div><span>Status</span><span className={`badge ${{ Draft: 'badge-info', Processed: 'badge-warning', Paid: 'badge-success' }[data.status]}`}>{data.status}</span></div>
        </div>
      </div>
      <div className="payslip-body">
        <div className="payslip-col">
          <div className="payslip-section-title">EARNINGS</div>
          <div className="payslip-row"><span>Base Salary</span><span>PKR {data.earnings.baseSalary.toLocaleString()}</span></div>
          <div className="payslip-row"><span>Allowances</span><span>PKR {data.earnings.allowances.toLocaleString()}</span></div>
          <div className="payslip-row total"><span>Gross Pay</span><span>PKR {data.earnings.grossPay.toLocaleString()}</span></div>
        </div>
        <div className="payslip-col">
          <div className="payslip-section-title">DEDUCTIONS</div>
          <div className="payslip-row"><span>Late Penalty</span><span className="text-warning">PKR {data.deductions.lateDeduction.toLocaleString()}</span></div>
          <div className="payslip-row"><span>Tax</span><span className="text-warning">PKR {data.deductions.taxAmount.toLocaleString()}</span></div>
          <div className="payslip-row"><span>Other</span><span className="text-warning">PKR {data.deductions.otherDeductions.toLocaleString()}</span></div>
          <div className="payslip-row total"><span>Total Deductions</span><span className="text-danger">PKR {data.deductions.totalDeductions.toLocaleString()}</span></div>
        </div>
      </div>
      <div className="payslip-net">
        <span>NET PAY</span>
        <span className="payslip-net-amount">PKR {data.netPay.toLocaleString()}</span>
      </div>
      <div className="payslip-footer">This is a system-generated payslip. No signature required.</div>
    </div>
  </div>
);

const EmployeesModule = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ baseSalary: '', allowances: '', taxRate: '', deductions: '' });

  const fetchEmployees = () => {
    api.get('/employees').then(r => setEmployees(r.data)).catch(() => toast.error('Failed to load employees'));
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter(e =>
    `${e.FirstName} ${e.LastName} ${e.Email} ${e.JobTitle}`.toLowerCase().includes(search.toLowerCase())
  );

  const saveSalary = async e => {
    e.preventDefault();
    try {
      await api.post(`/employees/${selected.EmpID}/salary`, salaryForm);
      toast.success('Salary structure saved');
      setShowSalaryForm(false);
    } catch { toast.error('Failed to save salary'); }
  };

  const deleteEmployee = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selected.FirstName} ${selected.LastName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${selected.EmpID}`);
      toast.success('Employee deleted successfully');
      setSelected(null);
      setShowSalaryForm(false);
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  if (selected) {
    return (
      <div className="module-container">
        <button className="btn-secondary" onClick={() => { setSelected(null); setShowSalaryForm(false); }}>← Back to Directory</button>
        <div className="emp-detail-card">
          <div className="emp-detail-header">
            <Avatar name={`${selected.FirstName} ${selected.LastName}`} size={72} />
            <div>
              <div className="emp-detail-name">{selected.FirstName} {selected.LastName}</div>
              <div className="emp-detail-title">{selected.JobTitle || 'No title'}</div>
              <div className="emp-detail-dept">📍 {selected.DeptName}</div>
              <span className={`badge ${{ Active: 'badge-success', Inactive: 'badge-danger', OnLeave: 'badge-warning' }[selected.Status]}`}>{selected.Status}</span>
            </div>
          </div>
          <div className="emp-detail-grid">
            <div className="detail-block"><div className="detail-block-title">Contact</div>
              <p><span>Email</span><strong>{selected.Email}</strong></p>
              <p><span>Phone</span><strong>{selected.Phone || '—'}</strong></p>
            </div>
            <div className="detail-block"><div className="detail-block-title">Employment</div>
              <p><span>Join Date</span><strong>{new Date(selected.JoinDate).toLocaleDateString()}</strong></p>
              <p><span>Department</span><strong>{selected.DeptName}</strong></p>
              <p><span>Role</span><strong>{selected.Role}</strong></p>
            </div>
          </div>
          {user?.role !== 'Employee' && (
            <div className="salary-section">
              <div className="salary-header">
                <h3>Salary Structure</h3>
                <button className="btn-primary sm" onClick={() => setShowSalaryForm(s => !s)}>
                  <FiEdit2 /> {showSalaryForm ? 'Cancel' : 'Edit Salary'}
                </button>
              </div>
              {showSalaryForm && (
                <form onSubmit={saveSalary} className="form-grid">
                  <div className="field-group"><label>Base Salary (PKR)</label><input type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm(f => ({ ...f, baseSalary: e.target.value }))} placeholder="50000" required /></div>
                  <div className="field-group"><label>Allowances (PKR)</label><input type="number" value={salaryForm.allowances} onChange={e => setSalaryForm(f => ({ ...f, allowances: e.target.value }))} placeholder="10000" /></div>
                  <div className="field-group"><label>Tax Rate (%)</label><input type="number" step="0.01" value={salaryForm.taxRate} onChange={e => setSalaryForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="10" /></div>
                  <div className="field-group"><label>Other Deductions (PKR)</label><input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0" /></div>
                  <div className="form-actions"><button type="submit" className="btn-primary">Save</button></div>
                </form>
              )}
            </div>
          )}
          {user?.role === 'Admin' && (
            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <p>Permanently delete this employee and all their associated records. This action cannot be undone.</p>
              <button className="btn-delete" onClick={deleteEmployee}>
                <FiTrash2 /> Delete Employee
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-filters">
        <input className="search-input" placeholder="🔍 Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="emp-count">{filtered.length} employees</div>
      </div>
      <div className="emp-grid">
        {filtered.map(emp => (
          <div key={emp.EmpID} className="emp-card" onClick={() => setSelected(emp)}>
            <Avatar name={`${emp.FirstName} ${emp.LastName}`} size={52} />
            <div className="emp-card-name">{emp.FirstName} {emp.LastName}</div>
            <div className="emp-card-title">{emp.JobTitle || 'Employee'}</div>
            <div className="emp-card-dept">{emp.DeptName}</div>
            <span className={`badge ${{ Active: 'badge-success', Inactive: 'badge-danger', OnLeave: 'badge-warning' }[emp.Status]}`}>{emp.Status}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state">No employees found</div>}
      </div>
    </div>
  );
};

// ── ANNOUNCEMENTS MODULE ──────────────────────────────────────────────────────
const AnnouncementsModule = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', expiryDate: '' });
  const isHR = user?.role !== 'Employee';

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = () => {
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => toast.error('Failed'));
  };

  const submit = async e => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      toast.success('Announcement posted');
      setForm({ title: '', content: '', expiryDate: '' });
      setShowForm(false);
      fetchAnnouncements();
    } catch { toast.error('Failed to post'); }
  };

  const deactivate = async id => {
    try {
      await api.put(`/announcements/${id}/deactivate`);
      toast.success('Deactivated');
      fetchAnnouncements();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="module-container">
      {isHR && (
        <div className="module-filters">
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}><FiPlus /> {showForm ? 'Cancel' : 'Post Announcement'}</button>
        </div>
      )}
      {showForm && isHR && (
        <div className="form-card">
          <h3>New Announcement</h3>
          <form onSubmit={submit} className="form-grid">
            <div className="field-group full-width"><label>Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" required /></div>
            <div className="field-group full-width"><label>Content</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your announcement..." required /></div>
            <div className="field-group"><label>Expiry Date (optional)</label><input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
            <div className="form-actions"><button type="submit" className="btn-primary">Post</button></div>
          </form>
        </div>
      )}
      <div className="announcements-list">
        {announcements.map(a => (
          <div key={a.AnnounceID} className="announcement-card">
            <div className="ann-header">
              <div className="ann-title-row">
                <div className="ann-dot" />
                <h3 className="ann-title">{a.Title}</h3>
              </div>
              {isHR && <button className="btn-icon danger sm" onClick={() => deactivate(a.AnnounceID)} title="Deactivate"><FiXCircle /></button>}
            </div>
            <div className="ann-content">{a.Content}</div>
            <div className="ann-footer">
              <Avatar name={a.PostedBy} size={24} />
              <span>{a.PostedBy}</span>
              <span className="ann-date">{new Date(a.PostedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              {a.ExpiryDate && <span className="ann-expiry">Expires: {new Date(a.ExpiryDate).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        {announcements.length === 0 && <div className="empty-state">No announcements yet</div>}
      </div>
    </div>
  );
};

// ── PROFILE MODULE ────────────────────────────────────────────────────────────
const ProfileModule = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [payslips, setPayslips] = useState([]);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    api.get(`/employees/${user.empId}`).then(r => { setProfile(r.data); setForm({ firstName: r.data.FirstName, lastName: r.data.LastName, phone: r.data.Phone || '', jobTitle: r.data.JobTitle || '' }); });
    api.get('/payroll/my').then(r => setPayslips(r.data.slice(0, 6)));
  }, []);

  const save = async e => {
    e.preventDefault();
    try {
      await api.put(`/employees/${user.empId}`, { ...form, status: profile.Status });
      toast.success('Profile updated');
      setEditing(false);
      api.get(`/employees/${user.empId}`).then(r => setProfile(r.data));
    } catch { toast.error('Failed to update'); }
  };

  const viewReceipt = async id => {
    try { const r = await api.get(`/payroll/receipt/${id}`); setReceipt(r.data); }
    catch { toast.error('Failed to load payslip'); }
  };

  if (receipt) return <Payslip data={receipt} onBack={() => setReceipt(null)} />;
  if (!profile) return <div className="loading-state"><span className="spinner lg" /></div>;

  return (
    <div className="module-container">
      <div className="profile-card">
        <div className="profile-hero">
          <Avatar name={`${profile.FirstName} ${profile.LastName}`} size={80} />
          <div className="profile-hero-info">
            <div className="profile-name">{profile.FirstName} {profile.LastName}</div>
            <div className="profile-title">{profile.JobTitle || 'Employee'}</div>
            <div className="profile-dept">{profile.DeptName}</div>
            <span className={`badge ${{ Active: 'badge-success', Inactive: 'badge-danger', OnLeave: 'badge-warning' }[profile.Status]}`}>{profile.Status}</span>
          </div>
          <button className="btn-primary sm" onClick={() => setEditing(e => !e)}><FiEdit2 /> {editing ? 'Cancel' : 'Edit Profile'}</button>
        </div>
        {editing ? (
          <form onSubmit={save} className="form-grid">
            <div className="field-group"><label>First Name</label><input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div className="field-group"><label>Last Name</label><input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            <div className="field-group"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="field-group"><label>Job Title</label><input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} /></div>
            <div className="form-actions"><button type="submit" className="btn-primary">Save Changes</button></div>
          </form>
        ) : (
          <div className="profile-details-grid">
            <div className="detail-block"><div className="detail-block-title">Personal Info</div>
              <p><span>Email</span><strong>{profile.Email}</strong></p>
              <p><span>Phone</span><strong>{profile.Phone || '—'}</strong></p>
              <p><span>Join Date</span><strong>{new Date(profile.JoinDate).toLocaleDateString()}</strong></p>
            </div>
            <div className="detail-block"><div className="detail-block-title">Work Info</div>
              <p><span>Department</span><strong>{profile.DeptName}</strong></p>
              <p><span>Job Title</span><strong>{profile.JobTitle || '—'}</strong></p>
              <p><span>Username</span><strong>{profile.Username}</strong></p>
            </div>
          </div>
        )}
      </div>
      <div className="payslip-history">
        <h3>Recent Payslips</h3>
        {payslips.length === 0 ? <div className="empty-state">No payslips yet</div> :
          <div className="payslip-history-list">
            {payslips.map(p => (
              <div key={p.PayrollID} className="payslip-history-item">
                <div><div className="ph-period">{new Date(p.MonthYear).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                  <span className={`badge ${{ Draft: 'badge-info', Processed: 'badge-warning', Paid: 'badge-success' }[p.Status]}`}>{p.Status}</span>
                </div>
                <div className="ph-net">PKR {parseFloat(p.NetPay).toLocaleString()}</div>
                <button className="btn-icon primary" onClick={() => viewReceipt(p.PayrollID)}><FiEye /></button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

// ── MAIN LAYOUT ───────────────────────────────────────────────────────────────
const Layout = ({ user, onLogout }) => {
  const [active, setActive] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => { localStorage.clear(); onLogout(); };
  const isHR = user?.role !== 'Employee';

  const renderContent = () => {
    switch (active) {
      case 'dashboard': return isHR ? <HRDashboard /> : <EmployeeDashboard user={user} />;
      case 'employees': return <EmployeesModule user={user} />;
      case 'attendance': return <AttendanceModule user={user} />;
      case 'leave': return <LeaveModule user={user} />;
      case 'payroll': return <PayrollModule user={user} />;
      case 'announcements': return <AnnouncementsModule user={user} />;
      case 'profile': return <ProfileModule user={user} />;
      default: return null;
    }
  };

  return (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <Sidebar active={active} setActive={v => { setActive(v); setMobileOpen(false); }} user={user} onLogout={logout} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-area">
        <Topbar active={active} user={user} onMenuToggle={() => setMobileOpen(o => !o)} />
        <main className="content-area">{renderContent()}</main>
      </div>
    </div>
  );
};

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={u => setUser(u)} />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/dashboard" element={user ? <Layout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
