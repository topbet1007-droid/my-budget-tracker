import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, PiggyBank, X, History,
  Download, Upload, Wallet, Receipt, Target, HandCoins, LayoutDashboard,
  CheckCircle2, Circle, ArrowDownCircle, ArrowUpCircle
} from "lucide-react";

/* ---------- Design tokens ---------- */
const C = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  surfaceSunken: "#EFEBE2",
  ink: "#1C2321",
  inkMuted: "#5B6360",
  border: "#E2DDD1",
  primary: "#0F4C42",
  primarySoft: "#E3EEE9",
  accent: "#C98A3E",
  accentSoft: "#F6E9D8",
  good: "#3D8361",
  goodSoft: "#E5F1EA",
  bad: "#B5483D",
  badSoft: "#F8E6E2",
};

const STORAGE_KEY = "ledger-budget-data-v2";

const DEFAULT_CATEGORIES = [
  { id: "rent", name: "Rent & utilities", budget: 15000 },
  { id: "groceries", name: "Groceries", budget: 6000 },
  { id: "transport", name: "Transport", budget: 2000 },
  { id: "fun", name: "Going out", budget: 3000 },
];

const PAYMENT_METHODS = ["Cash", "GCash", "Credit card"];

const WALLET_COLORS = [
  { from: "#2BB792", to: "#1E8F73" }, // teal/green
  { from: "#3FA9E0", to: "#2B7FC1" }, // blue
  { from: "#E0539B", to: "#C23D82" }, // pink
  { from: "#E8B23D", to: "#D4922A" }, // gold
  { from: "#F08A3C", to: "#D96A1E" }, // orange
  { from: "#8B6FD9", to: "#6E4FC1" }, // purple
];

function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(key) { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function shiftMonth(key, delta) { const [y, m] = key.split("-").map(Number); return monthKey(new Date(y, m - 1 + delta, 1)); }
function fmt(n) { return Math.round(n || 0).toLocaleString("en-US"); }
function uid() { return Math.random().toString(36).slice(2, 10); }

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

/* ---------- Small shared UI ---------- */
function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, ...style }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: 0, color: C.ink }}>{title}</h2>
      {action}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: C.surfaceSunken, fg: C.inkMuted },
    good: { bg: C.goodSoft, fg: C.good },
    bad: { bg: C.badSoft, fg: C.bad },
    accent: { bg: C.accentSoft, fg: C.accent },
    primary: { bg: C.primarySoft, fg: C.primary },
  };
  const t = map[tone];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, background: t.bg, color: t.fg, borderRadius: 999, padding: "3px 9px", letterSpacing: "0.01em" }}>
      {children}
    </span>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div style={{ height: 8, background: C.surfaceSunken, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color, borderRadius: 999, transition: "width .3s ease" }} />
    </div>
  );
}

const inputBase = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'Manrope', sans-serif",
  background: C.surface,
  color: C.ink,
  minWidth: 0,
};

const numInputBase = { ...inputBase, fontFamily: "'JetBrains Mono', monospace" };

const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  border: `1px solid ${C.border}`, background: C.surface, borderRadius: 9,
  padding: "7px 13px", fontSize: 13, cursor: "pointer", color: C.primary, fontWeight: 600,
};

const btnPrimary = {
  border: "none", background: C.primary, color: "#fff", borderRadius: 9,
  padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const iconBtn = { border: "none", background: "transparent", cursor: "pointer", color: C.inkMuted, display: "flex", alignItems: "center", padding: 4 };

/* ---------- Tab nav ---------- */
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "goals", label: "Goals", icon: Target },
  { id: "debts", label: "Debts", icon: HandCoins },
];

function TabNav({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: C.surfaceSunken,
        borderRadius: 12,
        padding: 4,
        marginBottom: 28,
        overflowX: "auto",
      }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "none", cursor: "pointer",
              background: isActive ? C.surface : "transparent",
              color: isActive ? C.primary : C.inkMuted,
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
              borderRadius: 9,
              padding: "8px 14px",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================ */

export default function Ledger() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");

  // Income
  const [income1a, setIncome1a] = useState(0);
  const [income1b, setIncome1b] = useState(0);
  const [otherIncome1, setOtherIncome1] = useState(0);
  const [income2a, setIncome2a] = useState(0);
  const [income2b, setIncome2b] = useState(0);
  const [otherIncome2, setOtherIncome2] = useState(0);

  // Categories / months / transactions
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [months, setMonths] = useState({});
  const [current, setCurrent] = useState(monthKey(new Date()));

  // Wallets (replaces single bank savings)
  const [wallets, setWallets] = useState([{ id: "main", name: "Main savings", balance: 0, type: "Debit", color: 0 }]);
  const [walletLog, setWalletLog] = useState([]);

  // Bills
  const [bills, setBills] = useState([]);

  // Goals
  const [goals, setGoals] = useState([]);

  // Debts
  const [debts, setDebts] = useState([]);
  const [debtLog, setDebtLog] = useState([]);

  // UI state
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [txCat, setTxCat] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txMethod, setTxMethod] = useState("Cash");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletBalance, setNewWalletBalance] = useState("");
  const [newWalletType, setNewWalletType] = useState("Debit");
  const [walletMoveFor, setWalletMoveFor] = useState(null);
  const [moveType, setMoveType] = useState("deposit");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveNote, setMoveNote] = useState("");

  const [showAddBill, setShowAddBill] = useState(false);
  const [newBillName, setNewBillName] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillDue, setNewBillDue] = useState("");
  const [billSettleFor, setBillSettleFor] = useState(null);
  const [billSettleMethod, setBillSettleMethod] = useState("Cash");

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [goalAddFor, setGoalAddFor] = useState(null);
  const [goalAddAmount, setGoalAddAmount] = useState("");

  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newDebtName, setNewDebtName] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtDirection, setNewDebtDirection] = useState("owe"); // owe = I owe them, owed = they owe me
  const [newDebtMethod, setNewDebtMethod] = useState("Cash");
  const [debtSettleFor, setDebtSettleFor] = useState(null);
  const [debtSettleMethod, setDebtSettleMethod] = useState("Cash");

  const saveTimer = useRef(null);

  /* ---------- Load ---------- */
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (result && result.value) {
          const d = JSON.parse(result.value);
          if (d.income1a !== undefined) setIncome1a(d.income1a);
          if (d.income1b !== undefined) setIncome1b(d.income1b);
          if (d.otherIncome1 !== undefined) setOtherIncome1(d.otherIncome1);
          if (d.income2a !== undefined) setIncome2a(d.income2a);
          if (d.income2b !== undefined) setIncome2b(d.income2b);
          if (d.otherIncome2 !== undefined) setOtherIncome2(d.otherIncome2);
          if (d.categories) setCategories(d.categories);
          if (d.months) setMonths(d.months);
          if (d.wallets) setWallets(d.wallets);
          if (d.walletLog) setWalletLog(d.walletLog);
          if (d.bills) setBills(d.bills);
          if (d.goals) setGoals(d.goals);
          if (d.debts) setDebts(d.debts);
          if (d.debtLog) setDebtLog(d.debtLog);
        }
      } catch {
        // first run
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  /* ---------- Save ---------- */
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({
          income1a, income1b, otherIncome1, income2a, income2b, otherIncome2,
          categories, months, wallets, walletLog, bills, goals, debts, debtLog,
        }), false);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [income1a, income1b, otherIncome1, income2a, income2b, otherIncome2, categories, months, wallets, walletLog, bills, goals, debts, debtLog, loaded]);

  if (!loaded) {
    return (
      <div style={{ fontFamily: "'Manrope', sans-serif", color: C.inkMuted, padding: "3rem", textAlign: "center" }}>
        <style>{fontImport}</style>
        Loading your ledger…
      </div>
    );
  }

  /* ---------- Derived ---------- */
  const txs = months[current]?.transactions || [];
  const spentByCat = {};
  for (const c of categories) spentByCat[c.id] = 0;
  for (const t of txs) spentByCat[t.catId] = (spentByCat[t.catId] || 0) + t.amount;

  const spentByMethod = {};
  for (const m of PAYMENT_METHODS) spentByMethod[m] = 0;
  for (const t of txs) { const m = t.method || "Cash"; spentByMethod[m] = (spentByMethod[m] || 0) + t.amount; }
  for (const b of bills) { if (b.paid && b.method) spentByMethod[b.method] = (spentByMethod[b.method] || 0) + b.amount; }
  for (const e of debtLog) { if (e.action === "settled" && e.method && e.direction === "owe") spentByMethod[e.method] = (spentByMethod[e.method] || 0) + e.amount; }

  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const totalIncome = income1a + income1b + otherIncome1 + income2a + income2b + otherIncome2;
  const unpaidBillsTotal = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const paidBillsTotal = bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const totalExpensesWithBills = totalSpent + paidBillsTotal;
  const incomeAfterBills = totalIncome - unpaidBillsTotal;
  const remaining = incomeAfterBills - totalExpensesWithBills;
  const totalWalletBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const sortedTxs = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalBillsAmount = bills.reduce((s, b) => s + b.amount, 0);

  const totalOwed = debts.filter((d) => d.direction === "owed").reduce((s, d) => s + d.amount, 0);
  const totalOwe = debts.filter((d) => d.direction === "owe").reduce((s, d) => s + d.amount, 0);

  /* ---------- Actions: categories/transactions ---------- */
  function addCategory() {
    const name = newCatName.trim(); const budget = parseFloat(newCatBudget);
    if (!name || isNaN(budget)) return;
    setCategories((p) => [...p, { id: uid(), name, budget }]);
    setNewCatName(""); setNewCatBudget(""); setShowAddCat(false);
  }
  function removeCategory(id) {
    setCategories((p) => p.filter((c) => c.id !== id));
    setMonths((p) => {
      const next = { ...p };
      for (const mk of Object.keys(next)) next[mk] = { ...next[mk], transactions: (next[mk].transactions || []).filter((t) => t.catId !== id) };
      return next;
    });
  }
  function updateCategoryBudget(id, value) {
    const budget = parseFloat(value);
    setCategories((p) => p.map((c) => (c.id === id ? { ...c, budget: isNaN(budget) ? 0 : budget } : c)));
  }
  function addTransaction() {
    const amount = parseFloat(txAmount);
    if (!txCat || isNaN(amount) || amount <= 0) return;
    const newTx = { id: uid(), catId: txCat, amount, note: txNote.trim(), method: txMethod, date: txDate };
    setMonths((p) => { const m = p[current] || { transactions: [] }; return { ...p, [current]: { ...m, transactions: [...(m.transactions || []), newTx] } }; });
    setTxAmount(""); setTxNote(""); setShowAddTx(false);
  }
  function removeTransaction(id) {
    setMonths((p) => { const m = p[current] || { transactions: [] }; return { ...p, [current]: { ...m, transactions: (m.transactions || []).filter((t) => t.id !== id) } }; });
  }
  const catName = (id) => categories.find((c) => c.id === id)?.name || "Uncategorized";

  /* ---------- Actions: wallets ---------- */
  function addWallet() {
    const name = newWalletName.trim(); const balance = parseFloat(newWalletBalance) || 0;
    if (!name) return;
    setWallets((p) => [...p, { id: uid(), name, balance, type: newWalletType, color: p.length % WALLET_COLORS.length }]);
    setNewWalletName(""); setNewWalletBalance(""); setShowAddWallet(false);
  }
  function removeWallet(id) { setWallets((p) => p.filter((w) => w.id !== id)); }
  function applyWalletMove() {
    const amount = parseFloat(moveAmount);
    if (!walletMoveFor || isNaN(amount) || amount <= 0) return;
    setWallets((p) => p.map((w) => w.id === walletMoveFor ? { ...w, balance: moveType === "withdrawal" ? w.balance - amount : w.balance + amount } : w));
    setWalletLog((p) => [...p, { id: uid(), walletId: walletMoveFor, type: moveType, amount, note: moveNote.trim(), date: new Date().toISOString().slice(0, 10) }]);
    setMoveAmount(""); setMoveNote(""); setWalletMoveFor(null);
  }
  function removeWalletLogEntry(id) {
    const entry = walletLog.find((e) => e.id === id);
    if (entry) setWallets((p) => p.map((w) => w.id === entry.walletId ? { ...w, balance: entry.type === "withdrawal" ? w.balance + entry.amount : w.balance - entry.amount } : w));
    setWalletLog((p) => p.filter((e) => e.id !== id));
  }

  /* ---------- Actions: bills ---------- */
  function addBill() {
    const name = newBillName.trim(); const amount = parseFloat(newBillAmount);
    if (!name || isNaN(amount)) return;
    setBills((p) => [...p, { id: uid(), name, amount, due: newBillDue, paid: false, method: null, settledDate: null }]);
    setNewBillName(""); setNewBillAmount(""); setNewBillDue(""); setShowAddBill(false);
  }
  function openBillSettle(id) {
    const bill = bills.find((b) => b.id === id);
    if (bill?.paid) {
      // unmark as paid, no method needed
      setBills((p) => p.map((b) => b.id === id ? { ...b, paid: false, method: null, settledDate: null } : b));
      return;
    }
    setBillSettleMethod("Cash");
    setBillSettleFor(id);
  }
  function confirmBillSettle() {
    if (!billSettleFor) return;
    setBills((p) => p.map((b) => b.id === billSettleFor ? { ...b, paid: true, method: billSettleMethod, settledDate: new Date().toISOString().slice(0, 10) } : b));
    setBillSettleFor(null);
  }
  function removeBill(id) { setBills((p) => p.filter((b) => b.id !== id)); }

  /* ---------- Actions: goals ---------- */
  function addGoal() {
    const name = newGoalName.trim(); const target = parseFloat(newGoalTarget);
    if (!name || isNaN(target)) return;
    setGoals((p) => [...p, { id: uid(), name, target, saved: 0 }]);
    setNewGoalName(""); setNewGoalTarget(""); setShowAddGoal(false);
  }
  function applyGoalAdd() {
    const amount = parseFloat(goalAddAmount);
    if (!goalAddFor || isNaN(amount) || amount <= 0) return;
    setGoals((p) => p.map((g) => g.id === goalAddFor ? { ...g, saved: g.saved + amount } : g));
    setGoalAddAmount(""); setGoalAddFor(null);
  }
  function removeGoal(id) { setGoals((p) => p.filter((g) => g.id !== id)); }

  /* ---------- Actions: debts ---------- */
  function addDebt() {
    const name = newDebtName.trim(); const amount = parseFloat(newDebtAmount);
    if (!name || isNaN(amount)) return;
    const id = uid();
    setDebts((p) => [...p, { id, name, amount, direction: newDebtDirection, method: newDebtMethod }]);
    setDebtLog((p) => [...p, { id: uid(), name, amount, direction: newDebtDirection, method: newDebtMethod, action: "added", date: new Date().toISOString().slice(0, 10) }]);
    setNewDebtName(""); setNewDebtAmount(""); setShowAddDebt(false);
  }
  function removeDebt(id) {
    const d = debts.find((x) => x.id === id);
    if (d) setDebtLog((p) => [...p, { id: uid(), name: d.name, amount: d.amount, direction: d.direction, method: d.method, action: "removed", date: new Date().toISOString().slice(0, 10) }]);
    setDebts((p) => p.filter((x) => x.id !== id));
  }
  function openDebtSettle(id) {
    setDebtSettleMethod("Cash");
    setDebtSettleFor(id);
  }
  function confirmDebtSettle() {
    const d = debts.find((x) => x.id === debtSettleFor);
    if (!d) return;
    setDebtLog((p) => [...p, { id: uid(), name: d.name, amount: d.amount, direction: d.direction, method: debtSettleMethod, action: "settled", date: new Date().toISOString().slice(0, 10) }]);
    setDebts((p) => p.filter((x) => x.id !== debtSettleFor));
    setDebtSettleFor(null);
  }

  /* ---------- Export / Import ---------- */
  function exportData() {
    const data = { income1a, income1b, otherIncome1, income2a, income2b, otherIncome2, categories, months, wallets, walletLog, bills, goals, debts, debtLog };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.income1a !== undefined) setIncome1a(d.income1a);
        if (d.income1b !== undefined) setIncome1b(d.income1b);
        if (d.otherIncome1 !== undefined) setOtherIncome1(d.otherIncome1);
        if (d.income2a !== undefined) setIncome2a(d.income2a);
        if (d.income2b !== undefined) setIncome2b(d.income2b);
        if (d.otherIncome2 !== undefined) setOtherIncome2(d.otherIncome2);
        if (d.categories) setCategories(d.categories);
        if (d.months) setMonths(d.months);
        if (d.wallets) setWallets(d.wallets);
        if (d.walletLog) setWalletLog(d.walletLog);
        if (d.bills) setBills(d.bills);
        if (d.goals) setGoals(d.goals);
        if (d.debts) setDebts(d.debts);
        if (d.debtLog) setDebtLog(d.debtLog);
        alert("Data imported successfully!");
      } catch { alert("Invalid backup file."); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  /* ================= RENDER ================= */
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: C.ink, background: C.bg, minHeight: "100vh", padding: "1.5rem 1rem 4rem" }}>
      <style>{fontImport}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10, rowGap: 12 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 26, margin: 0, letterSpacing: "-0.01em", color: C.ink, flexShrink: 0 }}>
            Ledger
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, flexShrink: 0 }}>
            <button onClick={() => setCurrent((c) => shiftMonth(c, -1))} aria-label="Previous month" style={{ ...iconBtn, border: `1px solid ${C.border}`, borderRadius: 8, width: 26, height: 26, justifyContent: "center", background: C.surface, flexShrink: 0 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ minWidth: 110, textAlign: "center", fontWeight: 600, whiteSpace: "nowrap" }}>{monthLabel(current)}</span>
            <button onClick={() => setCurrent((c) => shiftMonth(c, 1))} aria-label="Next month" style={{ ...iconBtn, border: `1px solid ${C.border}`, borderRadius: 8, width: 26, height: 26, justifyContent: "center", background: C.surface, flexShrink: 0 }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={exportData} style={{ ...btnGhost, whiteSpace: "nowrap", flexShrink: 0, padding: "6px 11px" }}><Download size={13} /> Export</button>
            <label style={{ ...btnGhost, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, padding: "6px 11px" }}>
              <Upload size={13} /> Import
              <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <TabNav active={tab} onChange={setTab} />

        {/* ============ OVERVIEW TAB ============ */}
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 14 }}>
              <Card style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>1st cut off</div>
                <IncomeGrid items={[
                  { label: "Income source 1", value: income1a, onChange: (v) => setIncome1a(isNaN(v) ? 0 : v) },
                  { label: "Income source 2", value: income1b, onChange: (v) => setIncome1b(isNaN(v) ? 0 : v) },
                  { label: "Other income", value: otherIncome1, onChange: (v) => setOtherIncome1(isNaN(v) ? 0 : v) },
                ]} />
              </Card>
              <Card style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>2nd cut off</div>
                <IncomeGrid items={[
                  { label: "Income source 1", value: income2a, onChange: (v) => setIncome2a(isNaN(v) ? 0 : v) },
                  { label: "Income source 2", value: income2b, onChange: (v) => setIncome2b(isNaN(v) ? 0 : v) },
                  { label: "Other income", value: otherIncome2, onChange: (v) => setOtherIncome2(isNaN(v) ? 0 : v) },
                ]} />
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 14 }}>
              <StatCard label="Total income" value={totalIncome} tone="primary" />
              <StatCard label="Unpaid bills" value={unpaidBillsTotal} tone="accent" />
              <StatCard label="Expenses (incl. paid bills)" value={totalExpensesWithBills} tone="bad" />
              <StatCard label="Remaining" value={remaining} tone={remaining < 0 ? "bad" : "good"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
              <StatCard label="Wallet balance" value={totalWalletBalance} tone="accent" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
              <div>
                <SectionHeader title="Budget envelopes" action={
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.inkMuted }}>₱{fmt(totalBudget)} budgeted</span>
                    <button onClick={() => setShowAddCat((s) => !s)} style={btnGhost}><Plus size={13} /> Add</button>
                  </div>
                } />
                {showAddCat && (
                  <Card style={{ padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" placeholder="Category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} style={{ ...inputBase, flex: "2 1 140px" }} />
                    <input type="number" placeholder="Budget" value={newCatBudget} onChange={(e) => setNewCatBudget(e.target.value)} style={{ ...numInputBase, flex: "1 1 90px" }} />
                    <button onClick={addCategory} style={btnPrimary}>Add</button>
                    <button onClick={() => setShowAddCat(false)} style={iconBtn}><X size={15} /></button>
                  </Card>
                )}
                <Card style={{ padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 26px", gap: 6, fontSize: 11, color: C.inkMuted, marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
                    <span>Category</span><span style={{ textAlign: "right" }}>budget</span><span style={{ textAlign: "right" }}>spent</span><span style={{ textAlign: "right" }}>left</span><span />
                  </div>
                  {categories.length === 0 && <div style={{ fontSize: 13, color: C.inkMuted, padding: "8px 0" }}>No envelopes yet — add one above.</div>}
                  {categories.map((c, i) => {
                    const actual = spentByCat[c.id] || 0;
                    const left = c.budget - actual;
                    return (
                      <div key={c.id}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 26px", gap: 6, alignItems: "center", padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                          <input type="number" value={c.budget} onChange={(e) => updateCategoryBudget(c.id, e.target.value)} style={{ ...numInputBase, width: "100%", textAlign: "right", padding: "4px 6px" }} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "right" }}>₱{fmt(actual)}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, textAlign: "right", color: left < 0 ? C.bad : C.good }}>₱{fmt(Math.abs(left))}</span>
                          <button onClick={() => removeCategory(c.id)} style={iconBtn}><Trash2 size={13} /></button>
                        </div>
                        <div style={{ marginBottom: 6 }}><MiniBar pct={(actual / (c.budget || 1)) * 100} color={actual > c.budget ? C.bad : C.primary} /></div>
                      </div>
                    );
                  })}
                </Card>
              </div>

              <div>
                <SectionHeader title="By payment method" action={<span style={{ fontSize: 11, color: C.inkMuted }}>incl. paid bills & settled debts</span>} />
                <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 12 }}>
                    {PAYMENT_METHODS.map((m) => (
                      <div key={m}>
                        <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 4 }}>{m}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600 }}>₱{fmt(spentByMethod[m] || 0)}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <SectionHeader title="Transactions" action={
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddTx((s) => !s)} style={btnGhost}><Plus size={13} /> Add</button>
                    <button onClick={() => setShowHistory(true)} style={btnGhost}><History size={13} /> History</button>
                  </div>
                } />
                {showAddTx && (
                  <Card style={{ padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={txCat} onChange={(e) => setTxCat(e.target.value)} style={{ ...inputBase, flex: "1 1 120px" }}>
                      <option value="">Category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="number" placeholder="Amount" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} style={{ ...numInputBase, flex: "1 1 80px" }} />
                    <input type="text" placeholder="Note" value={txNote} onChange={(e) => setTxNote(e.target.value)} style={{ ...inputBase, flex: "2 1 120px" }} />
                    <select value={txMethod} onChange={(e) => setTxMethod(e.target.value)} style={{ ...inputBase, flex: "1 1 100px" }}>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} style={{ ...inputBase, flex: "1 1 120px" }} />
                    <button onClick={addTransaction} style={btnPrimary}>Add</button>
                  </Card>
                )}
                <Card style={{ padding: 16, borderStyle: "dashed", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 13, color: C.inkMuted }}>
                    {sortedTxs.length === 0 ? `No transactions for ${monthLabel(current)} yet.` : `${sortedTxs.length} transaction${sortedTxs.length === 1 ? "" : "s"} logged.`}
                  </span>
                  {sortedTxs.length > 0 && <button onClick={() => setShowHistory(true)} style={btnGhost}><History size={13} /> View</button>}
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ============ WALLETS TAB ============ */}
        {tab === "wallets" && (
          <div>
            <Card style={{ padding: "20px 22px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600, marginBottom: 6 }}>Total balance</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700, color: C.ink }}>₱{fmt(totalWalletBalance)}</div>
              </div>
              <Pill tone="primary">{wallets.length} wallet{wallets.length === 1 ? "" : "s"}</Pill>
            </Card>

            <SectionHeader title="Wallets" action={<button onClick={() => setShowAddWallet((s) => !s)} style={btnGhost}><Plus size={13} /> Add wallet</button>} />
            {showAddWallet && (
              <Card style={{ padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" placeholder="Wallet name (e.g. BPI Savings)" value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} style={{ ...inputBase, flex: "2 1 160px" }} />
                <select value={newWalletType} onChange={(e) => setNewWalletType(e.target.value)} style={{ ...inputBase, flex: "1 1 110px" }}>
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                  <option value="Cash">Cash</option>
                  <option value="E-wallet">E-wallet</option>
                </select>
                <input type="number" placeholder="Starting balance" value={newWalletBalance} onChange={(e) => setNewWalletBalance(e.target.value)} style={{ ...numInputBase, flex: "1 1 110px" }} />
                <button onClick={addWallet} style={btnPrimary}>Add</button>
                <button onClick={() => setShowAddWallet(false)} style={iconBtn}><X size={15} /></button>
              </Card>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
              {wallets.map((w) => {
                const colorIdx = (w.color ?? 0) % WALLET_COLORS.length;
                const { from, to } = WALLET_COLORS[colorIdx];
                return (
                  <div key={w.id} style={{
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    borderRadius: 16,
                    padding: "16px 18px",
                    color: "#fff",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 140,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{w.type || "Debit"} • PHP</div>
                      </div>
                      <button onClick={() => removeWallet(w.id)} style={{ ...iconBtn, color: "rgba(255,255,255,0.85)" }}><Trash2 size={14} /></button>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.85, marginBottom: 4 }}>BALANCE</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>
                        {w.balance < 0 ? "-" : "+"}₱{fmt(Math.abs(w.balance))}
                      </div>
                    </div>
                    {walletMoveFor === w.id ? (
                      <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: 10, marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <select value={moveType} onChange={(e) => setMoveType(e.target.value)} style={{ ...inputBase, color: C.ink }}>
                          <option value="deposit">Deposit</option>
                          <option value="withdrawal">Withdrawal</option>
                        </select>
                        <input type="number" placeholder="Amount" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} style={{ ...numInputBase, color: C.ink }} />
                        <input type="text" placeholder="Note (optional)" value={moveNote} onChange={(e) => setMoveNote(e.target.value)} style={{ ...inputBase, color: C.ink }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={applyWalletMove} style={{ ...btnPrimary, flex: 1 }}>Confirm</button>
                          <button onClick={() => setWalletMoveFor(null)} style={{ ...btnGhost, color: C.ink }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setWalletMoveFor(w.id)} style={{
                        marginTop: 10, border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.15)",
                        color: "#fff", borderRadius: 9, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        <ArrowUpCircle size={13} /> Deposit / Withdraw
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <SectionHeader title="Wallet history" />
            {wallets.length === 0 ? (
              <Card style={{ padding: 16 }}><div style={{ fontSize: 13, color: C.inkMuted }}>No wallets yet.</div></Card>
            ) : (
              wallets.map((w) => {
                const entries = walletLog.filter((e) => e.walletId === w.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
                // running balance computed chronologically from the wallet's starting point
                const startingBalance = entries.reduce((bal, e) => bal - (e.type === "withdrawal" ? -e.amount : e.amount), w.balance);
                let runningBalance = startingBalance;
                const withRunning = entries.map((e) => {
                  runningBalance += e.type === "withdrawal" ? -e.amount : e.amount;
                  return { ...e, runningBalance };
                });
                return (
                  <div key={w.id} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{w.name}</div>
                    <Card style={{ padding: withRunning.length ? 0 : 16 }}>
                      {withRunning.length === 0 ? (
                        <div style={{ fontSize: 13, color: C.inkMuted, padding: 12 }}>No deposits or withdrawals logged yet.</div>
                      ) : (
                        [...withRunning].reverse().map((e, i) => (
                          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, fontSize: 13, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.inkMuted, width: 90, flexShrink: 0 }}>{e.date}</span>
                            <Pill tone={e.type === "withdrawal" ? "bad" : "good"}>{e.type}</Pill>
                            <span style={{ flex: 1, minWidth: 80, color: C.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.note}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: e.type === "withdrawal" ? C.bad : C.good, width: 90, textAlign: "right" }}>
                              {e.type === "withdrawal" ? "-" : "+"}₱{fmt(e.amount)}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.inkMuted, width: 100, textAlign: "right" }}>
                              bal ₱{fmt(e.runningBalance)}
                            </span>
                            <button onClick={() => removeWalletLogEntry(e.id)} style={iconBtn}><Trash2 size={14} /></button>
                          </div>
                        ))
                      )}
                    </Card>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============ BILLS TAB ============ */}
        {tab === "bills" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
              <StatCard label="Total bills" value={totalBillsAmount} tone="primary" />
              <StatCard label="Unpaid" value={unpaidBillsTotal} tone="bad" />
              <StatCard label="Paid" value={paidBillsTotal} tone="good" />
            </div>
            <SectionHeader title="Bills" action={<button onClick={() => setShowAddBill((s) => !s)} style={btnGhost}><Plus size={13} /> Add bill</button>} />
            {showAddBill && (
              <Card style={{ padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" placeholder="Bill name" value={newBillName} onChange={(e) => setNewBillName(e.target.value)} style={{ ...inputBase, flex: "2 1 140px" }} />
                <input type="number" placeholder="Amount" value={newBillAmount} onChange={(e) => setNewBillAmount(e.target.value)} style={{ ...numInputBase, flex: "1 1 90px" }} />
                <input type="date" value={newBillDue} onChange={(e) => setNewBillDue(e.target.value)} style={{ ...inputBase, flex: "1 1 130px" }} />
                <button onClick={addBill} style={btnPrimary}>Add</button>
                <button onClick={() => setShowAddBill(false)} style={iconBtn}><X size={15} /></button>
              </Card>
            )}
            <Card style={{ padding: bills.length ? 0 : 16 }}>
              {bills.length === 0 ? (
                <div style={{ fontSize: 13, color: C.inkMuted }}>No bills added yet.</div>
              ) : (
                [...bills].sort((a, b) => (a.due || "").localeCompare(b.due || "")).map((b, i) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, flexWrap: "wrap" }}>
                    <button onClick={() => openBillSettle(b.id)} style={iconBtn} aria-label="Toggle paid">
                      {b.paid ? <CheckCircle2 size={18} color={C.good} /> : <Circle size={18} color={C.inkMuted} />}
                    </button>
                    <span style={{ flex: 1, minWidth: 100, fontWeight: 600, fontSize: 14, textDecoration: b.paid ? "line-through" : "none", color: b.paid ? C.inkMuted : C.ink }}>{b.name}</span>
                    {b.due && <span style={{ fontSize: 12, color: C.inkMuted, fontFamily: "'JetBrains Mono', monospace" }}>due {b.due}</span>}
                    {b.paid && b.method && <Pill>{b.method}</Pill>}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>₱{fmt(b.amount)}</span>
                    <Pill tone={b.paid ? "good" : "accent"}>{b.paid ? `Paid ${b.settledDate || ""}` : "Unpaid"}</Pill>
                    <button onClick={() => removeBill(b.id)} style={iconBtn}><Trash2 size={14} /></button>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ============ GOALS TAB ============ */}
        {tab === "goals" && (
          <div>
            <SectionHeader title="Savings goals" action={<button onClick={() => setShowAddGoal((s) => !s)} style={btnGhost}><Plus size={13} /> Add goal</button>} />
            {showAddGoal && (
              <Card style={{ padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" placeholder="Goal name (e.g. Emergency fund)" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} style={{ ...inputBase, flex: "2 1 160px" }} />
                <input type="number" placeholder="Target amount" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} style={{ ...numInputBase, flex: "1 1 110px" }} />
                <button onClick={addGoal} style={btnPrimary}>Add</button>
                <button onClick={() => setShowAddGoal(false)} style={iconBtn}><X size={15} /></button>
              </Card>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {goals.length === 0 && <div style={{ fontSize: 13, color: C.inkMuted }}>No goals yet — add one above.</div>}
              {goals.map((g) => {
                const pct = (g.saved / (g.target || 1)) * 100;
                return (
                  <Card key={g.id} style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                      <button onClick={() => removeGoal(g.id)} style={iconBtn}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: C.primary, fontWeight: 700 }}>₱{fmt(g.saved)}</span>
                      <span style={{ color: C.inkMuted }}>of ₱{fmt(g.target)}</span>
                    </div>
                    <MiniBar pct={pct} color={pct >= 100 ? C.good : C.accent} />
                    <div style={{ marginTop: 10 }}>
                      {goalAddFor === g.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input type="number" placeholder="Amount" value={goalAddAmount} onChange={(e) => setGoalAddAmount(e.target.value)} style={{ ...numInputBase, flex: 1 }} />
                          <button onClick={applyGoalAdd} style={btnPrimary}>Add</button>
                          <button onClick={() => setGoalAddFor(null)} style={iconBtn}><X size={15} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setGoalAddFor(g.id)} style={{ ...btnGhost, width: "100%", justifyContent: "center" }}><Plus size={13} /> Add to goal</button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ DEBTS TAB ============ */}
        {tab === "debts" && (
          <div>
            <SectionHeader title="Debts" action={<button onClick={() => setShowAddDebt((s) => !s)} style={btnGhost}><Plus size={13} /> Add</button>} />
            {showAddDebt && (
              <Card style={{ padding: 12, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={newDebtDirection} onChange={(e) => setNewDebtDirection(e.target.value)} style={{ ...inputBase, flex: "1 1 140px" }}>
                  <option value="owe">I owe them</option>
                  <option value="owed">They owe me</option>
                </select>
                <input type="text" placeholder="Person / name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} style={{ ...inputBase, flex: "2 1 140px" }} />
                <input type="number" placeholder="Amount" value={newDebtAmount} onChange={(e) => setNewDebtAmount(e.target.value)} style={{ ...numInputBase, flex: "1 1 90px" }} />
                <select value={newDebtMethod} onChange={(e) => setNewDebtMethod(e.target.value)} style={{ ...inputBase, flex: "1 1 110px" }}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={addDebt} style={btnPrimary}>Add</button>
                <button onClick={() => setShowAddDebt(false)} style={iconBtn}><X size={15} /></button>
              </Card>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <StatCard label="You owe" value={totalOwe} tone="bad" />
              <StatCard label="Owed to you" value={totalOwed} tone="good" />
              <StatCard label="Net" value={totalOwed - totalOwe} tone={totalOwed - totalOwe < 0 ? "bad" : "good"} />
            </div>

            <Card style={{ padding: debts.length ? 0 : 16, marginBottom: 24 }}>
              {debts.length === 0 ? (
                <div style={{ fontSize: 13, color: C.inkMuted }}>No debts tracked.</div>
              ) : (
                debts.map((d, i) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, flexWrap: "wrap" }}>
                    {d.direction === "owe" ? <ArrowUpCircle size={16} color={C.bad} /> : <ArrowDownCircle size={16} color={C.good} />}
                    <span style={{ flex: 1, minWidth: 100, fontWeight: 600, fontSize: 14 }}>{d.name}</span>
                    <Pill tone={d.direction === "owe" ? "bad" : "good"}>{d.direction === "owe" ? "I owe" : "Owed to me"}</Pill>
                    {d.method && <Pill>{d.method}</Pill>}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>₱{fmt(d.amount)}</span>
                    <button onClick={() => openDebtSettle(d.id)} style={btnGhost}>Settle</button>
                    <button onClick={() => removeDebt(d.id)} style={iconBtn}><Trash2 size={14} /></button>
                  </div>
                ))
              )}
            </Card>

            <SectionHeader title="History" />
            <Card style={{ padding: debtLog.length ? 0 : 16 }}>
              {debtLog.length === 0 ? (
                <div style={{ fontSize: 13, color: C.inkMuted }}>No debt activity yet.</div>
              ) : (
                [...debtLog].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e, i) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, fontSize: 13, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.inkMuted, width: 90, flexShrink: 0 }}>{e.date}</span>
                    <span style={{ flex: 1, minWidth: 100, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                    <Pill tone={e.direction === "owe" ? "bad" : "good"}>{e.direction === "owe" ? "I owe" : "Owed to me"}</Pill>
                    {e.method && <Pill>{e.method}</Pill>}
                    <Pill tone={e.action === "settled" ? "good" : e.action === "removed" ? "neutral" : "accent"}>{e.action}</Pill>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>₱{fmt(e.amount)}</span>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Bill settle modal */}
      {billSettleFor && (
        <div onClick={() => setBillSettleFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(28,35,33,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, width: "100%", maxWidth: 360, padding: 20 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>How did you pay this bill?</h3>
            <select value={billSettleMethod} onChange={(e) => setBillSettleMethod(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 14 }}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmBillSettle} style={{ ...btnPrimary, flex: 1 }}>Mark as paid</button>
              <button onClick={() => setBillSettleFor(null)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Debt settle modal */}
      {debtSettleFor && (
        <div onClick={() => setDebtSettleFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(28,35,33,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, width: "100%", maxWidth: 360, padding: 20 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: "0 0 12px" }}>How was this debt settled?</h3>
            <select value={debtSettleMethod} onChange={(e) => setDebtSettleMethod(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 14 }}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmDebtSettle} style={{ ...btnPrimary, flex: 1 }}>Settle</button>
              <button onClick={() => setDebtSettleFor(null)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction history modal */}
      {showHistory && (
        <div onClick={() => setShowHistory(false)} style={{ position: "fixed", inset: 0, background: "rgba(28,35,33,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`, width: "100%", maxWidth: 640, maxHeight: "90vh", margin: "0 8px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 18, margin: 0 }}>Transactions — {monthLabel(current)}</h2>
              <button onClick={() => setShowHistory(false)} style={iconBtn}><X size={18} /></button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 20px 20px" }}>
              {sortedTxs.length === 0 ? (
                <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8, padding: "24px 16px", textAlign: "center", color: C.inkMuted, fontSize: 14, marginTop: 8 }}>
                  <PiggyBank size={20} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>No transactions logged for {monthLabel(current)} yet.</div>
                </div>
              ) : (
                <Card style={{ marginTop: 8 }}>
                  {sortedTxs.map((t, i) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i === 0 ? "none" : `1px solid ${C.border}`, fontSize: 14, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.inkMuted, width: 90, flexShrink: 0 }}>{t.date}</span>
                      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{catName(t.catId)}</span>
                        {t.note && <span style={{ fontSize: 12, color: C.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note}</span>}
                      </div>
                      <Pill>{t.method || "Cash"}</Pill>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>₱{fmt(t.amount)}</span>
                      <button onClick={() => removeTransaction(t.id)} style={iconBtn}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Reusable pieces defined after main component ---------- */
function IncomeGrid({ items }) {
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 12 }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: C.ink, fontWeight: 600, marginBottom: 4 }}>{it.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>₱</span>
              <input type="number" value={it.value} onChange={(e) => it.onChange(parseFloat(e.target.value))}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, border: "none", background: "transparent", width: "100%", color: C.ink, padding: 0 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600 }}>Sub total</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>₱{fmt(total)}</span>
      </div>
    </>
  );
}

function StatCard({ label, value, tone }) {
  const map = { primary: C.primary, good: C.good, bad: C.bad, accent: C.accent };
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: map[tone] || C.ink }}>
        ₱{fmt(Math.abs(value))}
      </div>
    </Card>
  );
}