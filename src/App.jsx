import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlarmClock, ArrowDownRight, ArrowRight, ArrowUpRight, Award,
  BarChart3, Bell, BookOpen, BrainCircuit, CalendarDays, Check, CheckCheck,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Flame, Focus,
  Goal, House, LogOut, Menu, Moon, MoreHorizontal, Plus, Search, Settings,
  ShieldCheck, Sparkles, Star, Target, Timer, Trophy, Users, WandSparkles,
  X, Zap, ListTodo, CalendarCheck, LockKeyhole, Mail, Play, Pause, RotateCcw,
  TrendingUp, Heart, Sun, Coffee, Send, CircleUserRound
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";

const aiEndpoint = import.meta.env.VITE_AI_API_URL;
const authEndpoint = import.meta.env.VITE_AUTH_API_URL;

const initialState = {
  tasks: [], goals: [], habits: [],
  xp: 0, consistency: 0, level: 1, completedTotal: 0, missed: 0,
  focusSessions: 0, focusMinutes: 0, scoreEvents: [], history: {}, circles: [],
  challenges: [], settings: { reminders: true, theme: "dark", graceDays: 1, weekStarts: "Monday" }
};
const nav = [
  { id: "Overview", icon: House, label: "Overview" },
  { id: "Tasks & goals", icon: ListTodo, label: "Tasks & goals" },
  { id: "Habits & streaks", icon: Flame, label: "Habits & streaks" },
  { id: "Focus room", icon: Focus, label: "Focus room" },
  { id: "AI coach", icon: BrainCircuit, label: "AI coach", tag: "AI" },
  { id: "Analytics", icon: BarChart3, label: "Analytics" },
  { id: "Accountability", icon: Users, label: "Accountability" },
];
const chartData = [];
const storageKey = "streakup-state-v3";
const demoAccountsKey = "streakup-demo-accounts-v1";
const demoSessionKey = "streakup-demo-session-v1";
const coachStorageKey = "streakup-coach-conversations-v1";
const fmtDate = (d = new Date()) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const localDayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;

function loadLocal() {
  try {
    localStorage.removeItem("streakup-state-v1");
    localStorage.removeItem("streakup-state-v2");
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch { return initialState; }
}
function loadDemoSession() {
  try {
    const raw = localStorage.getItem(demoSessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function loadDemoAccounts() {
  try {
    const raw = localStorage.getItem(demoAccountsKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function createCoachConversation() {
  return {
    id: uid(),
    title: "New conversation",
    pinned: false,
    updatedAt: Date.now(),
    messages: [{ id: uid(), role: "assistant", text: "Hey! I’m your consistency coach. I can help you make a realistic plan, review your patterns, or recover after a difficult week. What would you like to work on?" }]
  };
}
function loadCoachConversations() {
  try {
    const raw = localStorage.getItem(coachStorageKey);
    const conversations = raw ? JSON.parse(raw) : [];
    return conversations.length ? conversations : [createCoachConversation()];
  } catch {
    return [createCoachConversation()];
  }
}
function IconBox({ children, tone = "violet", size = "md" }) {
  return <div className={`icon-box ${tone} ${size}`}>{children}</div>;
}
function Pill({ children, tone = "neutral" }) { return <span className={`pill ${tone}`}>{children}</span>; }
function Progress({ value, tone = "violet" }) {
  return <div className={`progress ${tone}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
function StatCard({ label, value, sub, icon: Icon, tone, trend }) {
  return <div className="stat-card">
    <div className="stat-top"><IconBox tone={tone}><Icon size={18}/></IconBox><span className="stat-trend">{trend || <ArrowUpRight size={15}/>}</span></div>
    <div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-sub">{sub}</div>
  </div>;
}
function SectionTitle({ eyebrow, title, description, action }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}
function Modal({ title, onClose, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? "wide" : ""}`}><div className="modal-head"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</div>
  </div>;
}

export default function App() {
  const [page, setPage] = useState("Overview");
  const [data, setData] = useState(loadLocal);
  const [user, setUser] = useState(loadDemoSession);
  const [authLoading, setAuthLoading] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [addModal, setAddModal] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusMode, setFocusMode] = useState("Focus");
  const [focusTask, setFocusTask] = useState("");
  const [coachConversations, setCoachConversations] = useState(loadCoachConversations);
  const [currentCoachId, setCurrentCoachId] = useState(null);
  const [coachInput, setCoachInput] = useState("");
  const [coachStreaming, setCoachStreaming] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", mode: "signup" });
  const [accountForm, setAccountForm] = useState({ email: "", name: "" });
  const [pendingVerification, setPendingVerification] = useState(null);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(coachStorageKey, JSON.stringify(coachConversations)); }, [coachConversations]);
  useEffect(() => {
    if (!coachStreaming) return;
    const visibleText = coachStreaming.text.slice(0, coachStreaming.index);
    setCoachConversations(conversations => conversations.map(conversation => conversation.id === coachStreaming.conversationId
      ? { ...conversation, messages: conversation.messages.map(message => message.id === coachStreaming.messageId ? { ...message, text: visibleText } : message) }
      : conversation));
    if (coachStreaming.index >= coachStreaming.text.length) {
      setCoachStreaming(null);
      return;
    }
    const timer = setTimeout(() => {
      setCoachStreaming(current => current && { ...current, index: current.index + 1 });
    }, 18);
    return () => clearTimeout(timer);
  }, [coachStreaming]);
  useEffect(() => {
    if (!focusRunning) return;
    const timer = setInterval(() => setFocusSeconds(s => {
      if (s <= 1) { clearInterval(timer); setFocusRunning(false); notify("Focus session complete — take a short break."); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [focusRunning]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (msg) => setToast(msg);
  const todayTasks = data.tasks.filter(t => t.due === "Today");
  const completedToday = todayTasks.filter(t => t.completed).length;
  const completion = todayTasks.length ? Math.round(completedToday / todayTasks.length * 100) : 0;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Alex Morgan";
  const taskPoints = 10;

  useEffect(() => {
    if (user) setAccountForm({ email: user.email || "", name: user.user_metadata?.full_name || "" });
  }, [user]);

  function updateTask(id, patch) {
    setData(d => {
      const old = d.tasks.find(t => t.id === id);
      if (!old) return d;
      const next = d.tasks.map(t => t.id === id ? { ...t, ...patch } : t);
      let xp = d.xp, completedTotal = d.completedTotal, consistency = d.consistency;
      if (patch.completed === true && !old.completed) { xp += taskPoints; completedTotal += 1; consistency = Math.min(100, consistency + 1); }
      if (patch.completed === false && old.completed) { xp = Math.max(0, xp - taskPoints); completedTotal = Math.max(0, completedTotal - 1); }
      return { ...d, tasks: next, xp, completedTotal, consistency };
    });
    if (patch.completed === true) notify("+10 XP · Nice work. Keep the momentum.");
  }
  function addTask(task) {
    setData(d => ({ ...d, tasks: [{ id: uid(), completed: false, minutes: 25, priority: "Medium", category: "Study", due: "Today", recurring: "None", ...task }, ...d.tasks] }));
    setAddModal(null); notify("Task added to your plan.");
  }
  function addGoal(goal) {
    setData(d => ({ ...d, goals: [{ id: uid(), progress: 0, category: "Learning", horizon: "Monthly", target: "Make steady progress", ...goal }, ...d.goals] }));
    setAddModal(null); notify("Goal created. Start small, stay consistent.");
  }
  function addHabit(habit) {
    setData(d => ({ ...d, habits: [{ id: uid(), days: [0,0,0,0,0,0,0], streak: 0, color: "violet", ...habit }, ...d.habits] }));
    setAddModal(null); notify("Habit added.");
  }
  function toggleHabit(id, dayIndex = 6) {
    setData(d => ({ ...d, habits: d.habits.map(h => {
      if (h.id !== id) return h;
      const days = [...h.days]; days[dayIndex] = days[dayIndex] ? 0 : 1;
      const streak = days[dayIndex] ? h.streak + 1 : Math.max(0, h.streak - 1);
      return { ...h, days, streak };
    }), xp: d.xp + 8 }));
    notify("+8 XP · Habit progress recorded.");
  }
  function setTodaysStreak() {
    const todayIndex = (new Date().getDay() + 6) % 7;
    if (data.habits.length && data.habits.every(h => h.days[todayIndex])) {
      notify("Today's streak is already recorded.");
      return;
    }
    setData(d => {
      const habit = d.habits.find(h => !h.days[todayIndex]);
      if (habit) {
        return {
          ...d,
          habits: d.habits.map(h => h.id === habit.id
            ? { ...h, days: h.days.map((day, index) => index === todayIndex ? 1 : day), streak: h.streak + 1 }
            : h),
          xp: d.xp + 8
        };
      }
      const newHabit = {
        id: uid(),
        title: "Today's streak",
        icon: "star",
        color: "violet",
        days: Array.from({ length: 7 }, (_, index) => index === todayIndex ? 1 : 0),
        streak: 1
      };
      return { ...d, habits: [newHabit, ...d.habits], xp: d.xp + 8 };
    });
    notify("+8 XP · Today's streak recorded.");
  }
  function updateGoal(id, delta) {
    setData(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, progress: Math.min(100, Math.max(0, g.progress + delta)) } : g), xp: d.xp + (delta > 0 ? 5 : 0) }));
    if (delta > 0) notify("+5 XP · Goal progress updated.");
  }
  const activeCoachId = currentCoachId || coachConversations[0]?.id;
  const coachMessages = coachConversations.find(c => c.id === activeCoachId)?.messages || [];
  function newCoachConversation() {
    const conversation = createCoachConversation();
    setCoachConversations(conversations => [conversation, ...conversations]);
    setCurrentCoachId(conversation.id);
    setCoachStreaming(null);
  }
  function deleteCoachConversation(id) {
    setCoachConversations(conversations => {
      const remaining = conversations.filter(conversation => conversation.id !== id);
      const next = remaining.length ? remaining : [createCoachConversation()];
      if (id === activeCoachId) setCurrentCoachId(next[0].id);
      return next;
    });
    setCoachStreaming(null);
  }
  function toggleCoachPin(id) {
    setCoachConversations(conversations => conversations.map(conversation => conversation.id === id ? { ...conversation, pinned: !conversation.pinned } : conversation));
  }
  async function requestOtp({ purpose, email, account }) {
    if (authEndpoint) {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-otp", purpose, email, name: account?.name })
      });
      if (!response.ok) throw new Error(`OTP service returned HTTP ${response.status}.`);
      return { email, account };
    }
    return { email, account, code: String(Math.floor(100000 + Math.random() * 900000)) };
  }

  async function verifyOtp(code) {
    if (!pendingVerification) return;
    if (authEndpoint) {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-otp",
          purpose: pendingVerification.purpose,
          email: pendingVerification.email,
          code
        })
      });
      if (!response.ok) throw new Error(`OTP verification returned HTTP ${response.status}.`);
    } else if (code !== pendingVerification.code) {
      throw new Error("That development OTP is incorrect.");
    }
    const { purpose, account, email } = pendingVerification;
    if (purpose === "signup") {
      const verifiedAccount = { ...account, verified: true };
      localStorage.setItem(demoAccountsKey, JSON.stringify([...loadDemoAccounts(), verifiedAccount]));
      const session = { email: verifiedAccount.email, user_metadata: { full_name: verifiedAccount.name } };
      localStorage.setItem(demoSessionKey, JSON.stringify(session));
      setUser(session);
      setAuthForm({ email: "", password: "", name: "", mode: "signup" });
      notify("Email verified. Welcome to StreakUp.");
    } else {
      const accounts = loadDemoAccounts().map(item => item.email === user.email
        ? { ...item, email, name: account?.name || item.name }
        : item);
      localStorage.setItem(demoAccountsKey, JSON.stringify(accounts));
      const session = { email, user_metadata: { full_name: account?.name || displayName } };
      localStorage.setItem(demoSessionKey, JSON.stringify(session));
      setUser(session);
      setAccountForm({ email, name: session.user_metadata.full_name });
      notify("Email verified and account updated.");
    }
    setPendingVerification(null);
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (!authForm.email.includes("@") || authForm.password.length < 6) return notify("Enter a valid email and a password with at least 6 characters.");
    const email = authForm.email.trim().toLowerCase();
    const accounts = loadDemoAccounts();
    const existingAccount = accounts.find(account => account.email === email);
    if (authForm.mode === "signup") {
      if (existingAccount) return notify("An account with this email already exists. Sign in instead.");
      const account = { email, password: authForm.password, name: authForm.name.trim() || email.split("@")[0] };
      try {
        const verification = await requestOtp({ purpose: "signup", email, account });
        setPendingVerification({ purpose: "signup", ...verification });
        return notify(authEndpoint ? `A verification code was sent to ${email}.` : "Development OTP ready in the verification dialog.");
      } catch (error) {
        console.error("Sign-up OTP request failed.", error);
        return notify("We could not send a verification code. Try again.");
      }
    }
    if (!existingAccount || existingAccount.password !== authForm.password || existingAccount.verified === false) {
      return notify("No matching verified account found. Check your email and password, or create an account first.");
    }
    const session = { email: existingAccount.email, user_metadata: { full_name: existingAccount.name } };
    localStorage.setItem(demoSessionKey, JSON.stringify(session));
    setUser(session);
    setAuthModal(false);
    notify("Welcome back.");
  }
  async function signOut() {
    localStorage.removeItem(demoSessionKey);
    setUser(null); setProfileMenu(false); notify("Signed out.");
  }
  function saveAccountName(name) {
    const nextName = name.trim();
    if (!nextName) return notify("Enter a display name.");
    const accounts = loadDemoAccounts().map(item => item.email === user.email ? { ...item, name: nextName } : item);
    localStorage.setItem(demoAccountsKey, JSON.stringify(accounts));
    const session = { ...user, user_metadata: { ...user.user_metadata, full_name: nextName } };
    localStorage.setItem(demoSessionKey, JSON.stringify(session));
    setUser(session);
    notify("Display name updated.");
  }
  async function startEmailChange(email) {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail.includes("@")) return notify("Enter a valid email address.");
    if (nextEmail === user.email) return notify("That is already your email address.");
    if (loadDemoAccounts().some(account => account.email === nextEmail)) return notify("That email is already in use.");
    try {
      const verification = await requestOtp({ purpose: "email-change", email: nextEmail, account: { name: displayName } });
      setPendingVerification({ purpose: "email-change", ...verification });
      notify(authEndpoint ? `A verification code was sent to ${nextEmail}.` : "Development OTP ready in the verification dialog.");
    } catch (error) {
      console.error("Email-change OTP request failed.", error);
      notify("We could not send a verification code. Try again.");
    }
  }
  function deleteAccount() {
    if (!window.confirm("Delete your account and this browser's workspace? This cannot be undone.")) return;
    localStorage.setItem(demoAccountsKey, JSON.stringify(loadDemoAccounts().filter(account => account.email !== user.email)));
    localStorage.removeItem(demoSessionKey);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(coachStorageKey);
    setUser(null);
    setData(initialState);
    setPage("Overview");
    notify("Your account and local workspace were deleted.");
  }
  async function sendCoach(e) {
    e.preventDefault();
    const q = coachInput.trim(); if (!q) return;
    const lower = q.toLowerCase();
    let answer = "";
    if (lower.includes("plan") || lower.includes("schedule") || lower.includes("today")) {
      const pending = data.tasks.filter(t => !t.completed && t.due === "Today");
      const mins = pending.reduce((s,t) => s + (Number(t.minutes)||25), 0);
      answer = `You have ${pending.length} unfinished task${pending.length === 1 ? "" : "s"} planned for today (${mins} estimated minutes). Start with one high-priority task, then take a short break. If the full list feels too heavy, choose the most important 2–3 tasks and reschedule the rest deliberately.`;
    } else if (lower.includes("miss") || lower.includes("behind") || lower.includes("stuck") || lower.includes("consisten")) {
      answer = `Your current consistency score is ${data.consistency}/100 and you have ${data.habits.reduce((s,h)=>s+h.streak,0)} combined habit-streak days across your habits. Try a 10-minute restart: pick one small task, define what “done” means, and complete it before planning anything else. One missed day is data, not a verdict.`;
    } else if (lower.includes("weak") || lower.includes("pattern") || lower.includes("review")) {
      const total = data.tasks.length, done = data.tasks.filter(t=>t.completed).length;
      answer = `From the tasks currently saved here, ${done} of ${total} are marked complete (${total ? Math.round(done/total*100) : 0}%). This is a snapshot, not enough data to infer a reliable long-term pattern. For the next week, record estimated versus actual time and note when you postpone tasks; then we can make a better evidence-based adjustment.`;
    } else {
      answer = `Let's make this concrete. Your saved plan contains ${data.tasks.filter(t=>!t.completed).length} unfinished tasks and ${data.goals.length} goals. Choose one outcome you want this week, break it into a 15–30 minute action, and schedule that action at a realistic time.`;
    }
    if (aiEndpoint) {
      try {
        const headers = { "Content-Type": "application/json" };
        const response = await fetch(aiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: q,
            conversation: coachMessages.map(({ role, text }) => ({ role, content: text })),
            context: { tasks: data.tasks, goals: data.goals, habits: data.habits, consistency: data.consistency },
            webSearch: true,
            provider: "google-grounding"
          })
        });
        if (!response.ok) throw new Error(`AI service returned HTTP ${response.status}.`);
        const result = await response.json();
        if (typeof result.answer !== "string" || !result.answer.trim()) throw new Error("AI service returned no answer.");
        answer = result.answer.trim();
      } catch (error) {
        console.error("AI coach request failed.", error);
        notify("Live AI is unavailable, so a local coaching reply was used.");
      }
    }
    const userMessage = { id: uid(), role: "user", text: q };
    const assistantMessage = { id: uid(), role: "assistant", text: "" };
    setCoachConversations(conversations => conversations.map(conversation => conversation.id === activeCoachId
      ? { ...conversation, title: conversation.title === "New conversation" ? q.slice(0, 42) : conversation.title, updatedAt: Date.now(), messages: [...conversation.messages, userMessage, assistantMessage] }
      : conversation));
    setCoachStreaming({ conversationId: activeCoachId, messageId: assistantMessage.id, text: answer, index: 0 });
    setCoachInput("");
  }
  function finishFocus() {
    setFocusRunning(false);
    setData(d => ({ ...d, focusSessions: d.focusSessions + 1, focusMinutes: d.focusMinutes + (focusMode === "Focus" ? 25 : 5), xp: d.xp + 15 }));
    notify("+15 XP · Focus session logged.");
  }

  const filteredTasks = useMemo(() => data.tasks.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase())), [data.tasks, search]);

  if (authLoading) {
    return <div className="auth-page"><div className="auth-loading"><div className="brand-mark"><Activity size={21} strokeWidth={2.5}/></div><span>Loading your workspace…</span></div></div>;
  }

  if (!user) {
    return <div className="auth-page">
      <div className="auth-brand"><div className="brand-mark"><Activity size={21} strokeWidth={2.5}/></div><div><div className="brand-name">streak<span>up</span></div><div className="brand-caption">YOUR CONSISTENCY OS</div></div></div>
      <div className="auth-layout">
        <section className="auth-intro">
          <Pill tone="purple">PROGRESS OVER PERFECTION</Pill>
          <h1>Build momentum,<br/><em>one day at a time.</em></h1>
          <p>Organize your goals, build lasting habits and stay focused with a workspace designed for consistent progress.</p>
          <div className="auth-benefits"><span><Check size={14}/> Plan your next small step</span><span><Check size={14}/> Track habits and focus sessions</span><span><Check size={14}/> Keep your progress private</span></div>
        </section>
        <section className="card auth-card">
          <div className="eyebrow">{authForm.mode === "signup" ? "GET STARTED" : "WELCOME BACK"}</div>
          <h2>{authForm.mode === "signup" ? "Create your account" : "Sign in to StreakUp"}</h2>
          <p className="auth-card-copy">{authForm.mode === "signup" ? "Start with a clear plan and make progress that compounds." : "Pick up where you left off."}</p>
          <form className="form-stack" onSubmit={handleAuth}>
            {authForm.mode === "signup" && <label>Display name<input value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}
            <label>Email address<input type="email" required value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label>
            <label>Password<input type="password" minLength="6" required value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 6 characters"/></label>
            <button className="primary-button full" disabled={authLoading}>{authLoading ? "Please wait…" : authForm.mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={16}/></button>
            <button type="button" className="text-button" onClick={() => setAuthForm({...authForm, mode: authForm.mode === "signup" ? "signin" : "signup"})}>{authForm.mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
          </form>
          <p className="auth-disclaimer">Accounts are stored in this browser. For secure multi-device accounts, connect a separate authentication backend.</p>
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21} strokeWidth={2.5}/></div><div><div className="brand-name">streak<span>up</span></div><div className="brand-caption">YOUR CONSISTENCY OS</div></div><button className="mobile-close icon-button" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">
        {nav.map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileNav(false); }}>
          <item.icon size={18}/><span>{item.label}</span>{item.tag && <span className="nav-tag">{item.tag}</span>}
        </button>)}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-quote"><div className="quote-spark"><Sparkles size={15}/></div><p>Small steps, repeated daily, create remarkable change.</p><span>YOUR DAILY REMINDER</span></div>
      <button className="nav-item settings-link" onClick={() => setPage("Settings")}><Settings size={18}/><span>Account settings</span></button>
      <div className="sidebar-user">
        <div className="avatar">{displayName.slice(0,1).toUpperCase()}</div>
        <div className="user-info"><strong>{displayName}</strong><span>Level {data.level} · Consistency builder</span></div>
        <button className="icon-button" onClick={() => setProfileMenu(!profileMenu)}><MoreHorizontal size={19}/></button>
        {profileMenu && <div className="profile-popover"><button onClick={() => { setAuthModal(true); setProfileMenu(false); }}><CircleUserRound size={15}/> {user ? "Account details" : "Create account / Sign in"}</button><button onClick={signOut}><LogOut size={15}/> Sign out</button></div>}
      </div>
    </aside>
    {mobileNav && <div className="mobile-overlay" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>{page}</strong></div></div>
        <div className="topbar-right"><div className="today-chip"><span className="live-dot"/>{new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</div><button className="icon-button notification-button" title="Notifications" onClick={() => notify(data.settings.reminders ? "You're all caught up. Keep your next step small." : "Reminders are turned off in Settings.")}><Bell size={18}/><i/></button><button className="top-avatar" onClick={() => setAuthModal(true)}>{displayName.slice(0,1).toUpperCase()}</button></div>
      </header>
      <div className="page-content">
        {page === "Overview" && <Overview data={data} todayTasks={todayTasks} completedToday={completedToday} completion={completion} onPage={setPage} onAdd={() => setAddModal("task")} onSetStreak={setTodaysStreak} onToggle={updateTask} onNotify={notify} />}
        {page === "Tasks & goals" && <TasksPage data={data} tasks={filteredTasks} search={search} setSearch={setSearch} onAddTask={() => setAddModal("task")} onAddGoal={() => setAddModal("goal")} onToggle={updateTask} onGoal={updateGoal} />}
        {page === "Habits & streaks" && <HabitsPage data={data} onAdd={() => setAddModal("habit")} onToggle={toggleHabit} />}
        {page === "Focus room" && <FocusPage seconds={focusSeconds} setSeconds={setFocusSeconds} running={focusRunning} setRunning={setFocusRunning} mode={focusMode} setMode={setFocusMode} task={focusTask} setTask={setFocusTask} tasks={data.tasks} onFinish={finishFocus} data={data} />}
        {page === "AI coach" && <CoachPage messages={coachMessages} input={coachInput} setInput={setCoachInput} onSend={sendCoach} data={data} conversations={coachConversations} currentId={activeCoachId} onSelect={id => setCurrentCoachId(id)} onNew={newCoachConversation} onDelete={deleteCoachConversation} onPin={toggleCoachPin} isTyping={Boolean(coachStreaming)} />}
        {page === "Analytics" && <AnalyticsPage data={data} />}
        {page === "Accountability" && <AccountabilityPage data={data} setData={setData} onNotify={notify} />}
        {page === "Settings" && <SettingsPage data={data} setData={setData} onNotify={notify} user={user} accountForm={accountForm} setAccountForm={setAccountForm} onSaveName={saveAccountName} onChangeEmail={startEmailChange} onSignOut={signOut} onDeleteAccount={deleteAccount} />}
      </div>
      <footer className="footer"><span>STREAKUP © {new Date().getFullYear()}</span><span>Progress over perfection <span className="footer-heart">♥</span></span></footer>
    </main>
    {addModal && <AddModal type={addModal} onClose={() => setAddModal(null)} onTask={addTask} onGoal={addGoal} onHabit={addHabit}/>}
    {authModal && <Modal title={user ? "Your account" : "Welcome to StreakUp"} onClose={() => setAuthModal(false)}>
      {user && <div className="auth-note"><ShieldCheck size={18}/> Signed in as <strong>{user.email}</strong></div>}
      <form className="form-stack" onSubmit={handleAuth}>
        {!user && authForm.mode === "signup" && <label>Display name<input value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}
        {!user && <><label>Email address<input type="email" required value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" minLength="6" required value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 6 characters"/></label></>}
        {user ? <button type="button" className="primary-button full" onClick={() => setAuthModal(false)}>Done</button> : <><button className="primary-button full" disabled={authLoading}>{authLoading ? "Please wait…" : authForm.mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={16}/></button><button type="button" className="text-button" onClick={() => setAuthForm({...authForm,mode:authForm.mode === "signup" ? "signin" : "signup"})}>{authForm.mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button></>}
        {!user && <div className="demo-warning"><CircleHelp size={16}/> Accounts are stored only in this browser and do not sync across devices.</div>}
      </form>
    </Modal>}
    {pendingVerification && <OtpModal pending={pendingVerification} onClose={() => setPendingVerification(null)} onVerify={verifyOtp} />}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Overview({ data, todayTasks, completedToday, completion, onPage, onAdd, onSetStreak, onToggle, onNotify }) {
  const pending = todayTasks.filter(t=>!t.completed);
  const hasStreakActivity = data.habits.some(h => h.streak > 0 || h.days?.some(Boolean));
  const hasRecordedActivity = data.completedTotal > 0 || hasStreakActivity || data.focusSessions > 0;
  const hasFocusActivity = data.focusSessions > 0 || data.focusMinutes > 0;
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> YOUR SPACE TO GROW</div><h1>Make today <span>count.</span></h1><p>Small, consistent actions add up. Let's make progress today.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17}/> Add a task</button></div>
    <div className="hero-grid">
      <div className="hero-card">
        <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
        <div className="hero-card-content"><div className="hero-kicker"><Sparkles size={15}/> YOUR DAILY MOMENTUM</div><h2>You're building<br/>something <em>good.</em></h2><p>Consistency isn't perfection. It's showing up again.</p><button className="hero-button" onClick={()=>onPage("Habits & streaks")}>View your streaks <ArrowRight size={15}/></button></div>
        <div className="hero-progress"><div className="ring-wrap"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" className="ring-track"/><circle cx="60" cy="60" r="48" className="ring-value" style={{strokeDasharray:`${completion*3.016} 301.6`}}/></svg><div className="ring-center"><strong>{completion}%</strong><span>DONE</span></div></div><div className="hero-progress-label"><strong>{completedToday} of {todayTasks.length}</strong><span>tasks completed</span><div className="tiny-dots"><i/><i/><i/><i/><i/></div></div></div>
      </div>
      <div className="streak-highlight card">
        <div className="card-heading"><span className="eyebrow">STREAK SPOTLIGHT</span>{hasStreakActivity && <div className="streak-icon"><Flame size={18} fill="currentColor"/></div>}</div>
        <div className="streak-number">{Math.max(0,...data.habits.map(h=>h.streak))}<span> days</span></div><p className="muted">Your longest active habit streak</p>
        <div className="streak-days">{["M","T","W","T","F","S","S"].map((d,i)=><div key={i} className={`streak-day ${data.habits.some(h=>h.days[i]) ? "done" : ""}`}><span>{d}</span><div>{data.habits.some(h=>h.days[i]) ? <Check size={13}/> : <span/>}</div></div>)}</div>
        <button className="inline-link" onClick={hasStreakActivity ? ()=>onPage("Habits & streaks") : onSetStreak}>{hasStreakActivity ? "Keep the streak alive" : "Set today's streak"} <ArrowRight size={14}/></button>
      </div>
    </div>
    <div className="stats-grid">
      <StatCard label="Consistency score" value={`${data.consistency}%`} sub="Your reliability index" icon={Activity} tone="violet" trend={hasRecordedActivity ? <span className="stat-neutral">Tracking</span> : <span className="stat-neutral">No data yet</span>}/>
      <StatCard label="Total experience" value={data.xp.toLocaleString()} sub={`Level ${data.level} · ${Math.max(0,500-(data.xp%500))} XP to next level`} icon={Zap} tone="amber"/>
      <StatCard label="Tasks completed" value={data.completedTotal} sub="Every small win counts" icon={CheckCheck} tone="mint"/>
      <StatCard label="Focus time" value={`${Math.floor(data.focusMinutes/60)}h ${data.focusMinutes%60}m`} sub={`${data.focusSessions} sessions logged`} icon={Clock3} tone="blue"/>
    </div>
    <div className="content-grid">
      <section className="card task-card"><div className="card-heading"><div><div className="eyebrow">YOUR PRIORITIES</div><h3>Today's tasks <span className="count-badge">{pending.length} left</span></h3></div><button className="icon-button" onClick={()=>onPage("Tasks & goals")}><ArrowRight size={18}/></button></div>
        <div className="task-list">{todayTasks.length ? todayTasks.slice(0,5).map(t=><TaskRow key={t.id} task={t} onToggle={onToggle}/>) : <EmptyState title="A clear day" text="Add a task to start making progress."/>}</div>
        <button className="card-bottom-link" onClick={()=>onPage("Tasks & goals")}>View all tasks <ArrowRight size={15}/></button>
      </section>
      <section className="card goals-card"><div className="card-heading"><div><div className="eyebrow">BIG PICTURE</div><h3>Goals in motion</h3></div><button className="icon-button" onClick={()=>onPage("Tasks & goals")}><ArrowRight size={18}/></button></div>
        <div className="goal-list">{data.goals.slice(0,3).map(g=><div className="goal-item" key={g.id}><div className="goal-title-row"><div className="goal-dot"/><strong>{g.title}</strong><span>{g.progress}%</span></div><Progress value={g.progress}/><div className="goal-meta"><span>{g.horizon} goal</span><span>{g.target}</span></div></div>)}</div>
        <button className="card-bottom-link" onClick={()=>onPage("Tasks & goals")}>Explore your goals <ArrowRight size={15}/></button>
      </section>
    </div>
    <div className="bottom-grid">
      <section className="card mini-chart-card"><div className="card-heading"><div><div className="eyebrow">YOUR RHYTHM</div><h3>Focus this week</h3></div><Pill tone={hasFocusActivity ? "positive" : "neutral"}>{hasFocusActivity ? "Tracking sessions" : "No sessions yet"}</Pill></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:10,right:4,left:-26,bottom:0}}><defs><linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9c7bff" stopOpacity={0.32}/><stop offset="95%" stopColor="#9c7bff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#ffffff0b" vertical={false}/><XAxis dataKey="day" tick={{fill:"#77758b",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#77758b",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#171722",border:"1px solid #333144",borderRadius:12,color:"#fff"}}/><Area type="monotone" dataKey="focus" stroke="#a58bff" strokeWidth={2.5} fill="url(#focusFill)" name="Focus hours"/></AreaChart></ResponsiveContainer></div></section>
      <section className="card coach-teaser"><div className="coach-glow"/><div className="coach-top"><IconBox tone="violet"><BrainCircuit size={19}/></IconBox><Pill tone="purple">PERSONALIZED</Pill></div><div className="eyebrow">YOUR AI COACH</div><h3>A little clarity<br/>goes a long way.</h3><p>Get a plan that fits your energy, time and priorities.</p><button className="primary-button" onClick={()=>onPage("AI coach")}>Talk to your coach <ArrowRight size={15}/></button></section>
    </div>
  </>;
}
function TaskRow({ task, onToggle }) {
  return <div className={`task-row ${task.completed ? "completed" : ""}`}><button className={`task-check ${task.completed ? "checked" : ""}`} onClick={()=>onToggle(task.id,{completed:!task.completed})} aria-label={task.completed?"Mark incomplete":"Complete task"}>{task.completed && <Check size={14}/>}</button><div className="task-main"><strong>{task.title}</strong><div className="task-sub"><span className={`priority-dot ${task.priority.toLowerCase()}`}/>{task.category}<span className="task-dot-sep">·</span><Clock3 size={12}/>{task.minutes} min</div></div><Pill tone={task.priority === "High" ? "danger" : task.priority === "Medium" ? "warning" : "neutral"}>{task.priority}</Pill></div>;
}
function EmptyState({ title, text }) { return <div className="empty-state"><div className="empty-icon"><ListTodo size={21}/></div><strong>{title}</strong><p>{text}</p></div>; }

function TasksPage({ data, tasks, search, setSearch, onAddTask, onAddGoal, onToggle, onGoal }) {
  const [tab,setTab] = useState("Tasks");
  return <>
    <SectionTitle eyebrow="MAKE IT HAPPEN" title="Tasks & goals" description="Turn the things you want into small, doable next steps." action={<button className="primary-button" onClick={tab==="Tasks"?onAddTask:onAddGoal}><Plus size={16}/> {tab==="Tasks"?"New task":"New goal"}</button>}/>
    <div className="tab-bar"><button className={tab==="Tasks"?"selected":""} onClick={()=>setTab("Tasks")}>Tasks <span>{data.tasks.length}</span></button><button className={tab==="Goals"?"selected":""} onClick={()=>setTab("Goals")}>Goals <span>{data.goals.length}</span></button></div>
    {tab==="Tasks" ? <><div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your tasks…"/></div><div className="toolbar-note"><CalendarDays size={15}/> {data.tasks.filter(t=>t.due==="Today"&&!t.completed).length} due today</div></div><div className="card full-list">{tasks.length ? tasks.map(t=><TaskRow key={t.id} task={t} onToggle={onToggle}/>) : <EmptyState title="No tasks found" text="Try another search or add a new task."/>}</div></>
    : <div className="goals-grid">{data.goals.map(g=><div className="card goal-full-card" key={g.id}><div className="goal-card-top"><IconBox tone="violet"><Goal size={18}/></IconBox><Pill tone="purple">{g.horizon}</Pill></div><h3>{g.title}</h3><p>{g.target}</p><div className="goal-progress-line"><span>Progress</span><strong>{g.progress}%</strong></div><Progress value={g.progress}/><div className="goal-card-actions"><button className="secondary-button small" onClick={()=>onGoal(g.id,-5)}>−5%</button><button className="primary-button small" onClick={()=>onGoal(g.id,5)}>Add progress +5%</button></div></div>)}</div>}
  </>;
}
function HabitsPage({ data, onAdd, onToggle }) {
  return <>
    <SectionTitle eyebrow="SHOW UP FOR YOURSELF" title="Habits & streaks" description="Consistency is built in the ordinary moments. Track the little things." action={<button className="primary-button" onClick={onAdd}><Plus size={16}/> New habit</button>}/>
    <div className="habit-summary-grid"><div className="card habit-summary"><IconBox tone="amber"><Flame size={18}/></IconBox><span>Active streaks</span><strong>{data.habits.filter(h=>h.streak>0).length}</strong><small>habits you're building</small></div><div className="card habit-summary"><IconBox tone="mint"><CalendarCheck size={18}/></IconBox><span>Weekly check-ins</span><strong>{data.habits.reduce((s,h)=>s+h.days.reduce((a,b)=>a+b,0),0)}</strong><small>completed habit days</small></div><div className="card habit-summary"><IconBox tone="violet"><Trophy size={18}/></IconBox><span>Longest streak</span><strong>{Math.max(0,...data.habits.map(h=>h.streak))} <small>days</small></strong><small>keep building momentum</small></div></div>
    <div className="habit-list">{data.habits.map(h=><div className="card habit-card" key={h.id}><div className="habit-card-head"><IconBox tone={h.color==="mint"?"mint":h.color==="orange"?"amber":"violet"}>{h.icon==="heart"?<Heart size={18}/>:h.icon==="star"?<Star size={18}/>:<BookOpen size={18}/>}</IconBox><div className="habit-info"><strong>{h.title}</strong><span>{h.streak} day streak · Daily habit</span></div><div className="habit-streak"><Flame size={15} fill="currentColor"/>{h.streak}</div><button className="primary-button small" onClick={()=>onToggle(h.id)}>Check in <Check size={14}/></button></div><div className="habit-week"><span className="week-label">THIS WEEK</span>{["M","T","W","T","F","S","S"].map((d,i)=><button key={i} className={`habit-day ${h.days[i]?"checked":""}`} onClick={()=>onToggle(h.id,i)} title={`Toggle ${d}`}>{h.days[i]?<Check size={13}/>:d}</button>)}</div></div>)}</div>
    <div className="info-banner"><Sparkles size={18}/><div><strong>Progress over perfection</strong><p>A missed day doesn't erase the work you've done. Focus on your next small action.</p></div></div>
  </>;
}
function FocusPage({ seconds, setSeconds, running, setRunning, mode, setMode, task, setTask, tasks, onFinish, data }) {
  const modes = [{name:"Focus",seconds:1500},{name:"Short break",seconds:300},{name:"Long break",seconds:900}];
  const mins = String(Math.floor(seconds/60)).padStart(2,"0"), secs = String(seconds%60).padStart(2,"0");
  const progress = 1 - seconds / (modes.find(m=>m.name===mode)?.seconds || 1500);
  return <>
    <SectionTitle eyebrow="ONE THING AT A TIME" title="Focus room" description="Protect a little time for the work that matters."/>
    <div className="focus-layout"><div className="card focus-main"><div className="focus-mode-tabs">{modes.map(m=><button className={mode===m.name?"selected":""} key={m.name} onClick={()=>{setMode(m.name);setSeconds(m.seconds);setRunning(false);}}>{m.name}</button>)}</div><div className="timer-outer"><svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="130" className="timer-track"/><circle cx="150" cy="150" r="130" className="timer-progress" style={{strokeDasharray:`${progress*816.8} 816.8`}}/></svg><div className="timer-inner"><span className="timer-label">{mode==="Focus"?"TIME TO FOCUS":"TAKE A BREATHER"}</span><strong>{mins}:{secs}</strong><span className="timer-task-label">{task ? tasks.find(t=>t.id===task)?.title : "Choose a task below"}</span></div></div><div className="timer-controls"><button className="primary-button timer-start" onClick={()=>{if(seconds===0)setSeconds(modes.find(m=>m.name===mode).seconds);setRunning(!running);}}>{running?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}{running?"Pause session":"Start session"}</button><button className="secondary-button" onClick={()=>{setRunning(false);setSeconds(modes.find(m=>m.name===mode).seconds);}}><RotateCcw size={16}/></button>{seconds===0&&<button className="secondary-button" onClick={onFinish}>Log session</button>}</div><div className="focus-footnote"><ShieldCheck size={14}/> You don't need a perfect day. Just a focused next step.</div></div>
      <div className="focus-side"><div className="card focus-task-select"><div className="eyebrow">FOCUS ON</div><h3>Choose your task</h3><p>Give this session a purpose.</p><select value={task} onChange={e=>setTask(e.target.value)}><option value="">No task selected</option>{tasks.filter(t=>!t.completed).map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select><div className="focus-tip"><Sparkles size={16}/><span>Try one focus session before checking messages or switching tasks.</span></div></div><div className="card focus-stats"><div className="eyebrow">YOUR FOCUS TOTALS</div><div className="focus-stat-row"><IconBox tone="violet"><Timer size={17}/></IconBox><div><strong>{data.focusSessions}</strong><span>Sessions completed</span></div></div><div className="focus-stat-row"><IconBox tone="blue"><Clock3 size={17}/></IconBox><div><strong>{Math.floor(data.focusMinutes/60)}h {data.focusMinutes%60}m</strong><span>Total focused time</span></div></div></div></div></div>
  </>;
}
function CoachPage({ messages, input, setInput, onSend, data, conversations, currentId, onSelect, onNew, onDelete, onPin, isTyping }) {
  const prompts = ["Help me plan today","I keep falling behind","Review my recent patterns"];
  return <>
    <SectionTitle eyebrow="A LITTLE MORE CLARITY" title="Your AI coach" description="Practical guidance based on your goals, tasks and progress."/>
    <div className="coach-layout"><div className="card coach-history"><div className="coach-history-head"><div className="eyebrow">CHAT HISTORY</div><button className="primary-button small" onClick={onNew}><Plus size={14}/> New chat</button></div><div className="coach-history-list">{[...conversations].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt).map(conversation=><div className={`coach-history-item ${conversation.id===currentId?"selected":""}`} key={conversation.id}><button onClick={()=>onSelect(conversation.id)}><span>{conversation.pinned && "PIN · "}{conversation.title}</span><small>{conversation.messages.filter(m=>m.role==="user").length} messages</small></button><div><button className="icon-button" title={conversation.pinned?"Unpin chat":"Pin chat"} onClick={()=>onPin(conversation.id)}>★</button><button className="icon-button" title="Delete chat" onClick={()=>onDelete(conversation.id)}><X size={14}/></button></div></div>)}</div></div><div className="card coach-chat"><div className="chat-head"><div className="coach-avatar"><BrainCircuit size={20}/></div><div><strong>Momentum</strong><span><i/> {isTyping ? "Writing…" : "Ready to help"}</span></div><Pill tone="purple">PERSONAL COACH</Pill></div><div className="chat-messages">{messages.map(m=><div key={m.id} className={`chat-message ${m.role}`}><div className="chat-bubble">{m.text}{isTyping && m.role==="assistant" && !m.text && <span className="typing-dots">...</span>}</div></div>)}</div><div className="suggested-prompts">{prompts.map(p=><button key={p} onClick={()=>setInput(p)}>{p} <ArrowUpRight size={12}/></button>)}</div><form className="chat-input-row" onSubmit={onSend}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about your goals, study, business, or anything else…"/><button className="send-button" aria-label="Send message" disabled={isTyping}><Send size={17}/></button></form><div className="chat-disclaimer">Prototype coaching uses local rules. Connect a secure server-side AI provider and web-search tool for broader, current answers.</div></div><div className="coach-side"><div className="card insight-card"><div className="insight-icon"><Sparkles size={18}/></div><div className="eyebrow">A STARTING INSIGHT</div><h3>Make the next step smaller.</h3><p>You have {data.tasks.filter(t=>!t.completed).length} unfinished tasks. Pick one that takes 15–25 minutes and begin there.</p></div><div className="card coach-context"><div className="eyebrow">YOUR CURRENT SNAPSHOT</div><div><span>Consistency score</span><strong>{data.consistency}%</strong></div><Progress value={data.consistency}/><div><span>Goals in progress</span><strong>{data.goals.length}</strong></div><div><span>Active habits</span><strong>{data.habits.length}</strong></div><div><span>Unfinished tasks</span><strong>{data.tasks.filter(t=>!t.completed).length}</strong></div></div></div></div>
  </>;
}
function AnalyticsPage({ data }) {
  const done = data.tasks.filter(t=>t.completed).length;
  const rate = data.tasks.length ? Math.round(done/data.tasks.length*100) : 0;
  return <>
    <SectionTitle eyebrow="NOTICE YOUR PROGRESS" title="Analytics" description="Use your history to learn what works—not to judge yourself." action={<Pill tone="positive"><TrendingUp size={13}/> Personal growth</Pill>}/>
    <div className="stats-grid analytics-stats"><StatCard label="Completion rate" value={`${rate}%`} sub={`${done} of ${data.tasks.length} tasks`} icon={CheckCheck} tone="mint"/><StatCard label="Consistency score" value={`${data.consistency}/100`} sub="Current index" icon={Activity} tone="violet"/><StatCard label="Focus sessions" value={data.focusSessions} sub="Logged sessions" icon={Focus} tone="blue"/><StatCard label="Experience earned" value={data.xp} sub={`Level ${data.level}`} icon={Zap} tone="amber"/></div>
    <div className="analytics-grid"><div className="card analytics-chart"><div className="card-heading"><div><div className="eyebrow">WEEKLY OVERVIEW</div><h3>Focus hours</h3></div><Pill>Last 7 days</Pill></div><div className="chart-wrap large"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:4,left:-20,bottom:0}}><CartesianGrid stroke="#ffffff0b" vertical={false}/><XAxis dataKey="day" tick={{fill:"#77758b",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#77758b",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#171722",border:"1px solid #333144",borderRadius:12,color:"#fff"}}/><Bar dataKey="focus" fill="#9b80ff" radius={[5,5,0,0]} name="Focus hours"/></BarChart></ResponsiveContainer></div></div><div className="card completion-card"><div className="eyebrow">TASK BREAKDOWN</div><h3>How you're doing</h3><div className="completion-donut"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="61" className="donut-track"/><circle cx="80" cy="80" r="61" className="donut-value" style={{strokeDasharray:`${rate*3.83} 383`}}/></svg><div><strong>{rate}%</strong><span>complete</span></div></div><div className="legend-row"><span><i className="legend-violet"/>Completed</span><strong>{done}</strong></div><div className="legend-row"><span><i className="legend-grey"/>Still to do</span><strong>{data.tasks.length-done}</strong></div></div></div>
    <div className="card analytics-note"><div className="note-icon"><ShieldCheck size={18}/></div><div><strong>Honest data, better decisions</strong><p>Some charts in this prototype use illustrative sample data. Your task completion and totals reflect the tasks currently saved in this browser. Connect a backend and log daily history before relying on long-term trend analysis.</p></div></div>
  </>;
}
function AccountabilityPage({ data, setData, onNotify }) {
  const [circleName,setCircleName] = useState("");
  const [challenge,setChallenge] = useState("");
  function createCircle(e) { e.preventDefault(); if(!circleName.trim())return; setData(d=>({...d,circles:[...(d.circles||[]),{id:uid(),name:circleName,members:1,created:fmtDate()}]})); setCircleName(""); onNotify("Private circle created in this browser."); }
  function createChallenge(e) { e.preventDefault(); if(!challenge.trim())return; setData(d=>({...d,challenges:[...(d.challenges||[]),{id:uid(),title:challenge,days:7,joined:true}]})); setChallenge(""); onNotify("7-day challenge added."); }
  return <>
    <SectionTitle eyebrow="BETTER TOGETHER" title="Accountability" description="Build supportive routines with people who want to grow alongside you."/>
    <div className="social-hero"><div className="social-hero-art"><div className="social-orbit orbit-a"/><div className="social-orbit orbit-b"/><div className="social-center"><Users size={30}/></div><div className="social-dot dot-a">A</div><div className="social-dot dot-b">J</div><div className="social-dot dot-c">M</div></div><div><Pill tone="purple">PRIVATE BY DEFAULT</Pill><h2>Consistency is easier<br/>when we're <em>in it together.</em></h2><p>Create a small circle, agree on a shared goal and celebrate progress. Your personal tasks stay private unless you choose to share them.</p></div></div>
    <div className="social-grid"><div className="card social-card"><div className="social-card-icon"><Users size={19}/></div><h3>Accountability circles</h3><p>Create a private group for classmates, friends or a study team.</p><form className="inline-create" onSubmit={createCircle}><input value={circleName} onChange={e=>setCircleName(e.target.value)} placeholder="e.g. Semester study crew"/><button className="primary-button" aria-label="Create circle"><Plus size={16}/></button></form>{(data.circles||[]).map(c=><div className="created-row" key={c.id}><div className="created-avatar">{c.name.slice(0,1).toUpperCase()}</div><div><strong>{c.name}</strong><span>{c.members} member · Created {c.created}</span></div><Pill>Private</Pill></div>)}</div><div className="card social-card"><div className="social-card-icon amber"><Trophy size={19}/></div><h3>Weekly challenges</h3><p>Choose a small, measurable challenge and build momentum together.</p><form className="inline-create" onSubmit={createChallenge}><input value={challenge} onChange={e=>setChallenge(e.target.value)} placeholder="e.g. 30 minutes of study daily"/><button className="primary-button" aria-label="Create challenge"><Plus size={16}/></button></form>{(data.challenges||[]).map(c=><div className="challenge-row" key={c.id}><div className="challenge-medal"><Flame size={17}/></div><div><strong>{c.title}</strong><span>{c.days}-day challenge · You're in</span></div><Pill tone="positive">Joined</Pill></div>)}</div></div>
    <div className="info-banner"><ShieldCheck size={18}/><div><strong>Social features are local prototype data</strong><p>Shared groups, real friend invitations, leaderboards and cross-user challenge tracking require a backend and server-side permissions.</p></div></div>
  </>;
}
function SettingsPage({ data, setData, onNotify, user, accountForm, setAccountForm, onSaveName, onChangeEmail, onSignOut, onDeleteAccount }) {
  function change(key,value) { setData(d=>({...d,settings:{...d.settings,[key]:value}})); onNotify("Settings updated."); }
  return <>
    <SectionTitle eyebrow="MAKE IT YOURS" title="Account settings" description="Manage your profile, security and workspace preferences."/>
    <div className="settings-layout"><div className="card settings-card"><div className="settings-section-head"><IconBox tone="violet"><CircleUserRound size={18}/></IconBox><div><h3>Account & privacy</h3><p>Manage your identity and data access.</p></div></div><div className="settings-row"><div><strong>Account status</strong><span>{user ? `Signed in as ${user.email}` : "Local account — signed out"}</span></div><Pill tone={user?"warning":"neutral"}>{user?"Browser account":"Signed out"}</Pill></div><div className="settings-row"><div><strong>Private data</strong><span>Stored in this browser's local storage</span></div><ShieldCheck size={18} className="settings-icon"/></div></div>
      <div className="card settings-card"><div className="settings-section-head"><IconBox tone="violet"><CircleUserRound size={18}/></IconBox><div><h3>Profile information</h3><p>Update your display name or verify a new email address.</p></div></div><form className="form-stack" onSubmit={e=>{e.preventDefault();onSaveName(accountForm.name);}}><label>Display name<input value={accountForm.name} onChange={e=>setAccountForm({...accountForm,name:e.target.value})} required /></label><button className="primary-button">Save name</button></form><form className="form-stack" onSubmit={e=>{e.preventDefault();onChangeEmail(accountForm.email);}}><label>Email address<input type="email" value={accountForm.email} onChange={e=>setAccountForm({...accountForm,email:e.target.value})} required /></label><button className="secondary-button">Change email and send OTP</button></form></div>
      <div className="card settings-card"><div className="settings-section-head"><IconBox tone="blue"><ShieldCheck size={18}/></IconBox><div><h3>Account access</h3><p>End this session or permanently remove your local account.</p></div></div><div className="settings-row"><div><strong>Sign out</strong><span>Remove this browser session</span></div><button className="secondary-button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div><div className="settings-row danger-row"><div><strong>Delete account</strong><span>Delete your account and all workspace data from this browser</span></div><button className="danger-button" onClick={onDeleteAccount}>Delete account</button></div></div>
      <div className="card settings-card"><div className="settings-section-head"><IconBox tone="blue"><Bell size={18}/></IconBox><div><h3>Reminders</h3><p>Keep reminders helpful, not overwhelming.</p></div></div><div className="settings-row"><div><strong>In-app reminders</strong><span>Show gentle reminder messages</span></div><button className={`toggle ${data.settings.reminders?"on":""}`} onClick={()=>change("reminders",!data.settings.reminders)}><i/></button></div><div className="settings-row"><div><strong>Grace days</strong><span>Recovery days allowed per week</span></div><select value={data.settings.graceDays} onChange={e=>change("graceDays",Number(e.target.value))}><option value="0">0 days</option><option value="1">1 day</option><option value="2">2 days</option></select></div></div>
      <div className="card settings-card"><div className="settings-section-head"><IconBox tone="amber"><Zap size={18}/></IconBox><div><h3>Experience & scoring</h3><p>Keep your system encouraging and transparent.</p></div></div><div className="settings-row"><div><strong>Current XP</strong><span>Earned through completed actions</span></div><strong>{data.xp} XP</strong></div><div className="settings-row"><div><strong>Consistency score</strong><span>Current score out of 100</span></div><strong>{data.consistency}/100</strong></div><button className="secondary-button" onClick={()=>{setData(initialState);onNotify("Workspace cleared.");}}>Clear workspace</button></div>
    </div>
  </>;
}
function OtpModal({ pending, onClose, onVerify }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submit = async e => {
    e.preventDefault();
    try { await onVerify(code.trim()); } catch (verificationError) { setError(verificationError.message); }
  };
  return <Modal title="Verify your email" onClose={onClose}><form className="form-stack" onSubmit={submit}><p className="auth-card-copy">Enter the six-digit code sent to <strong>{pending.email}</strong>.</p>{pending.code && <div className="demo-warning"><CircleHelp size={16}/> Development mode: your OTP is <strong>{pending.code}</strong>. Configure <code>VITE_AUTH_API_URL</code> for real email delivery.</div>}<label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,""));setError("");}} autoFocus required /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button full" disabled={code.length !== 6}>Verify email <Check size={16}/></button></form></Modal>;
}
function AddModal({ type, onClose, onTask, onGoal, onHabit }) {
  const [form,setForm] = useState({title:"",category:"Study",due:"Today",priority:"Medium",minutes:25,recurring:"None",horizon:"Monthly",target:"",icon:"book",color:"violet"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=e=>{e.preventDefault();if(!form.title.trim())return;if(type==="task")onTask(form);if(type==="goal")onGoal({...form,target:form.target||"Make steady progress"});if(type==="habit")onHabit(form);};
  return <Modal title={type==="task"?"Create a task":type==="goal"?"Create a goal":"Create a habit"} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}><label>{type==="task"?"Task name":type==="goal"?"Goal name":"Habit name"}<input autoFocus required value={form.title} onChange={e=>set("title",e.target.value)} placeholder={type==="task"?"e.g. Revise chapter 3":type==="goal"?"e.g. Finish my portfolio":"e.g. Read for 15 minutes"}/></label>
      {type==="task"&&<><div className="form-two"><label>Category<select value={form.category} onChange={e=>set("category",e.target.value)}><option>Study</option><option>Personal</option><option>Health</option><option>Project</option><option>Career</option></select></label><label>Priority<select value={form.priority} onChange={e=>set("priority",e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label></div><div className="form-two"><label>Due<select value={form.due} onChange={e=>set("due",e.target.value)}><option>Today</option><option>Tomorrow</option><option>This week</option><option>Later</option></select></label><label>Estimated minutes<input type="number" min="5" max="600" value={form.minutes} onChange={e=>set("minutes",Number(e.target.value))}/></label></div><label>Repeat<select value={form.recurring} onChange={e=>set("recurring",e.target.value)}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label></>}
      {type==="goal"&&<><div className="form-two"><label>Time horizon<select value={form.horizon} onChange={e=>set("horizon",e.target.value)}><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></label><label>Category<select value={form.category} onChange={e=>set("category",e.target.value)}><option>Learning</option><option>Wellbeing</option><option>Projects</option><option>Career</option><option>Personal</option></select></label></div><label>How will you measure it?<input value={form.target} onChange={e=>set("target",e.target.value)} placeholder="e.g. Complete 12 practice sessions"/></label></>}
      {type==="habit"&&<><label>Habit category<select value={form.icon} onChange={e=>set("icon",e.target.value)}><option value="book">Learning</option><option value="heart">Wellbeing</option><option value="star">Personal</option></select></label><div className="form-note"><Sparkles size={15}/> Start with a habit small enough to do on a difficult day.</div></>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">{type==="task"?"Add task":type==="goal"?"Create goal":"Create habit"} <ArrowRight size={15}/></button></div>
    </form>
  </Modal>;
}
