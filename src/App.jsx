import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, PiggyBank, X, History } from "lucide-react";

const PALETTE = {
  paper: "#E8E1D3",
  card: "#FFFDF8",
  ink: "#232323",
  inkSoft: "#6B655A",
  primary: "#1F3A2E",
  accent: "#C9A227",
  positive: "#6B8F71",
  negative: "#C0533E",
  line: "#D8CFBC",
};

const STORAGE_KEY = "ledger-budget-data";

const DEFAULT_CATEGORIES = [
  { id: "rent", name: "Rent & utilities", budget: 15000 },
  { id: "groceries", name: "Groceries", budget: 6000 },
  { id: "transport", name: "Transport", budget: 2000 },
  { id: "fun", name: "Going out", budget: 3000 },
  { id: "savings", name: "Savings", budget: 5000 },
];

const PAYMENT_METHODS = ["Cash", "GCash", "Credit card"];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

function fmt(n) {
  const v = Math.round(n || 0);
  return v.toLocaleString("en-US");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

function RulerBar({ spent, budget }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const fillPct = Math.min(pct, 100);
  const over = spent > budget;
  const fillColor = over ? PALETTE.negative : PALETTE.positive;
  const ticks = [0, 25, 50, 75, 100];
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          position: "relative",
          height: 14,
          background: "#fff",
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillPct}%`,
            background: fillColor,
            transition: "width 0.3s ease",
          }}
        />
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: `${t}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: t === 0 || t === 100 ? "transparent" : "rgba(35,35,35,0.15)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: over ? PALETTE.negative : PALETTE.inkSoft,
        }}
      >
        <span>₱{fmt(spent)} spent</span>
        <span>
          {over ? `₱${fmt(spent - budget)} over` : `₱${fmt(budget - spent)} left`}
        </span>
      </div>
    </div>
  );
}

function IncomeExpenseBar({ income, expense }) {
  const max = Math.max(income, expense, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <BarRow label="Income" value={income} max={max} color={PALETTE.positive} />
      <BarRow label="Expenses" value={expense} max={max} color={PALETTE.negative} />
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: PALETTE.inkSoft,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>₱{fmt(value)}</span>
      </div>
      <div
        style={{
          height: 10,
          background: "#fff",
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function CutoffCard({ title, items }) {
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  return (
    <div
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: PALETTE.ink, marginBottom: 12 }}>
        {title}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginBottom: 4 }}>{it.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16 }}>₱</span>
              <input
                type="number"
                value={it.value}
                onChange={(e) => it.onChange(parseFloat(e.target.value))}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 16,
                  fontWeight: 500,
                  border: "none",
                  background: "transparent",
                  width: "100%",
                  color: PALETTE.ink,
                  padding: 0,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: `1px solid ${PALETTE.line}`,
          paddingTop: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 12, color: PALETTE.inkSoft }}>Sub total</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600 }}>
          ₱{fmt(total)}
        </span>
      </div>
    </div>
  );
}

function PaymentBreakdownCard({ data }) {
  return (
    <div
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 8,
        padding: "14px 16px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
        gap: 12,
        height: "100%",
      }}
    >
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginBottom: 4 }}>{d.label}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 500 }}>
            ₱{fmt(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TotalsCard({ items }) {
  return (
    <div
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        height: "100%",
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            paddingLeft: i > 0 ? 16 : 0,
            marginLeft: i > 0 ? 16 : 0,
            borderLeft: i > 0 ? `1px solid ${PALETTE.line}` : "none",
          }}
        >
          <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginBottom: 4 }}>{it.label}</div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              color: it.color || PALETTE.ink,
            }}
          >
            ₱{fmt(it.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BudgetLedger() {
  const [loaded, setLoaded] = useState(false);
  const [income1a, setIncome1a] = useState(0);
  const [income1b, setIncome1b] = useState(0);
  const [otherIncome1, setOtherIncome1] = useState(0);
  const [income2a, setIncome2a] = useState(0);
  const [income2b, setIncome2b] = useState(0);
  const [otherIncome2, setOtherIncome2] = useState(0);
  const [bankSavings, setBankSavings] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [months, setMonths] = useState({});
  const [current, setCurrent] = useState(monthKey(new Date()));
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
  const [savingsLog, setSavingsLog] = useState([]);
  const [showAddSaving, setShowAddSaving] = useState(false);
  const [savingType, setSavingType] = useState("withdrawal");
  const [savingAmount, setSavingAmount] = useState("");
  const [savingNote, setSavingNote] = useState("");
  const [savingDate, setSavingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (result && result.value) {
          const data = JSON.parse(result.value);
          if (data.income1a !== undefined) setIncome1a(data.income1a);
          else if (data.income1 !== undefined) setIncome1a(data.income1);
          if (data.income1b !== undefined) setIncome1b(data.income1b);
          if (data.income2a !== undefined) setIncome2a(data.income2a);
          else if (data.income2 !== undefined) setIncome2a(data.income2);
          if (data.income2b !== undefined) setIncome2b(data.income2b);
          if (data.otherIncome1 !== undefined) setOtherIncome1(data.otherIncome1);
          else if (data.otherIncome !== undefined) setOtherIncome1(data.otherIncome);
          if (data.otherIncome2 !== undefined) setOtherIncome2(data.otherIncome2);
          if (data.bankSavings !== undefined) setBankSavings(data.bankSavings);
          if (data.savingsLog) setSavingsLog(data.savingsLog);
          if (data.categories) setCategories(data.categories);
          if (data.months) setMonths(data.months);
        }
      } catch (e) {
        // no saved data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(
          STORAGE_KEY,
          JSON.stringify({
            income1a,
            income1b,
            otherIncome1,
            income2a,
            income2b,
            otherIncome2,
            bankSavings,
            savingsLog,
            categories,
            months,
          }),
          false
        );
      } catch (e) {
        // ignore save errors silently
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [
    income1a,
    income1b,
    otherIncome1,
    income2a,
    income2b,
    otherIncome2,
    bankSavings,
    savingsLog,
    categories,
    months,
    loaded,
  ]);

  if (!loaded) {
    return (
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          color: PALETTE.inkSoft,
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <style>{fontImport}</style>
        Loading your ledger…
      </div>
    );
  }

  const txs = months[current]?.transactions || [];

  const spentByCat = {};
  for (const c of categories) spentByCat[c.id] = 0;
  for (const t of txs) {
    spentByCat[t.catId] = (spentByCat[t.catId] || 0) + t.amount;
  }

  const spentByMethod = {};
  for (const m of PAYMENT_METHODS) spentByMethod[m] = 0;
  for (const t of txs) {
    const m = t.method || "Cash";
    spentByMethod[m] = (spentByMethod[m] || 0) + t.amount;
  }

  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const totalIncome = income1a + income1b + otherIncome1 + income2a + income2b + otherIncome2;
  const remaining = totalIncome - totalSpent;

  function addCategory() {
    const name = newCatName.trim();
    const budget = parseFloat(newCatBudget);
    if (!name || isNaN(budget)) return;
    setCategories((prev) => [...prev, { id: uid(), name, budget }]);
    setNewCatName("");
    setNewCatBudget("");
    setShowAddCat(false);
  }

  function removeCategory(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setMonths((prev) => {
      const next = { ...prev };
      for (const mk of Object.keys(next)) {
        next[mk] = {
          ...next[mk],
          transactions: (next[mk].transactions || []).filter((t) => t.catId !== id),
        };
      }
      return next;
    });
  }

  function updateCategoryBudget(id, value) {
    const budget = parseFloat(value);
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, budget: isNaN(budget) ? 0 : budget } : c))
    );
  }

  function addTransaction() {
    const amount = parseFloat(txAmount);
    if (!txCat || isNaN(amount) || amount <= 0) return;
    const newTx = {
      id: uid(),
      catId: txCat,
      amount,
      note: txNote.trim(),
      method: txMethod,
      date: txDate,
    };
    setMonths((prev) => {
      const m = prev[current] || { transactions: [] };
      return {
        ...prev,
        [current]: { ...m, transactions: [...(m.transactions || []), newTx] },
      };
    });
    setTxAmount("");
    setTxNote("");
    setShowAddTx(false);
  }

  function removeTransaction(id) {
    setMonths((prev) => {
      const m = prev[current] || { transactions: [] };
      return {
        ...prev,
        [current]: { ...m, transactions: (m.transactions || []).filter((t) => t.id !== id) },
      };
    });
  }

  function addSavingsEntry() {
    const amount = parseFloat(savingAmount);
    if (isNaN(amount) || amount <= 0) return;
    const entry = { id: uid(), type: savingType, amount, note: savingNote.trim(), date: savingDate };
    setSavingsLog((prev) => [...prev, entry]);
    setBankSavings((prev) => (savingType === "withdrawal" ? prev - amount : prev + amount));
    setSavingAmount("");
    setSavingNote("");
    setShowAddSaving(false);
  }

  function removeSavingsEntry(id) {
    const entry = savingsLog.find((e) => e.id === id);
    if (entry) {
      setBankSavings((b) => (entry.type === "withdrawal" ? b + entry.amount : b - entry.amount));
    }
    setSavingsLog((prev) => prev.filter((e) => e.id !== id));
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || "Uncategorized";

  const sortedTxs = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: PALETTE.ink,
        background: PALETTE.paper,
        minHeight: "100vh",
        padding: "2rem 1.5rem 4rem",
      }}
    >
      <style>{fontImport}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 32,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Ledger
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 15,
            }}
          >
            <button
              onClick={() => setCurrent((c) => shiftMonth(c, -1))}
              aria-label="Previous month"
              style={navBtnStyle}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ minWidth: 140, textAlign: "center" }}>{monthLabel(current)}</span>
            <button
              onClick={() => setCurrent((c) => shiftMonth(c, 1))}
              aria-label="Next month"
              style={navBtnStyle}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div
          style={{
            height: 2,
            background: PALETTE.primary,
            marginBottom: 24,
            opacity: 0.15,
          }}
        />

        {/* Income overview - full width */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <CutoffCard
            title="1st cut off"
            items={[
              { label: "Income source 1", value: income1a, onChange: (v) => setIncome1a(isNaN(v) ? 0 : v) },
              { label: "Income source 2", value: income1b, onChange: (v) => setIncome1b(isNaN(v) ? 0 : v) },
              { label: "Other income", value: otherIncome1, onChange: (v) => setOtherIncome1(isNaN(v) ? 0 : v) },
            ]}
          />
          <CutoffCard
            title="2nd cut off"
            items={[
              { label: "Income source 1", value: income2a, onChange: (v) => setIncome2a(isNaN(v) ? 0 : v) },
              { label: "Income source 2", value: income2b, onChange: (v) => setIncome2b(isNaN(v) ? 0 : v) },
              { label: "Other income", value: otherIncome2, onChange: (v) => setOtherIncome2(isNaN(v) ? 0 : v) },
            ]}
          />
        </div>

        {/* Expenses by payment method + totals - full width */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 32,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: PALETTE.ink, marginBottom: 12 }}>
              Expenses by payment method
            </div>
            <PaymentBreakdownCard
              data={PAYMENT_METHODS.map((m) => ({ label: m, value: spentByMethod[m] || 0 }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "transparent", marginBottom: 12 }}>
              .
            </div>
            <TotalsCard
              items={[
                { label: "Total income", value: totalIncome, color: PALETTE.primary },
                { label: "Expenses", value: totalSpent, color: PALETTE.negative },
                {
                  label: "Remaining",
                  value: remaining,
                  color: remaining < 0 ? PALETTE.negative : PALETTE.primary,
                },
              ]}
            />
          </div>
        </div>

        {/* Row: Dashboard | Savings */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div>
            {/* Dashboard with embedded envelopes */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>
                Dashboard
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: PALETTE.inkSoft }}>
                  ₱{fmt(totalBudget)} budgeted
                </span>
                <button onClick={() => setShowAddCat((s) => !s)} style={textBtnStyle}>
                  <Plus size={14} /> Add envelope
                </button>
              </div>
            </div>

            {showAddCat && (
              <div
                style={{
                  background: PALETTE.card,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ ...textInputStyle, flex: "2 1 160px" }}
                />
                <input
                  type="number"
                  placeholder="Monthly budget"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  style={{ ...textInputStyle, flex: "1 1 110px" }}
                />
                <button onClick={addCategory} style={primaryBtnStyle}>Add</button>
                <button onClick={() => setShowAddCat(false)} style={iconBtnStyle} aria-label="Cancel"><X size={15} /></button>
              </div>
            )}

            <div
              style={{
                background: PALETTE.card,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 8,
                padding: "16px 18px",
                marginBottom: 32,
              }}
            >
              <IncomeExpenseBar income={totalIncome} expense={totalSpent} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                <span style={{ color: PALETTE.inkSoft }}>Total (income − expenses)</span>
                <span style={{ fontWeight: 500, color: remaining < 0 ? PALETTE.negative : PALETTE.positive }}>
                  {remaining < 0 ? "-" : "+"}₱{fmt(Math.abs(remaining))}
                </span>
              </div>

              <div style={{ borderTop: `1px solid ${PALETTE.line}`, paddingTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                    fontSize: 11,
                    color: PALETTE.inkSoft,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ width: 90, textAlign: "right" }}>projected</span>
                  <span style={{ width: 90, textAlign: "right" }}>actual</span>
                  <span style={{ width: 100, textAlign: "right" }}>variance</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {categories.map((c, i) => {
                    const actual = spentByCat[c.id] || 0;
                    const diff = actual - c.budget;
                    const over = diff > 0;
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 0",
                          borderTop: i === 0 ? "none" : `1px solid ${PALETTE.line}`,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name}
                        </span>
                        <input
                          type="number"
                          value={c.budget}
                          onChange={(e) => updateCategoryBudget(c.id, e.target.value)}
                          style={{ ...miniInputStyle, width: 80 }}
                          title="Budget"
                        />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", width: 90, textAlign: "right" }}>
                          ₱{fmt(actual)}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", width: 80, textAlign: "right", color: diff === 0 ? PALETTE.inkSoft : over ? PALETTE.negative : PALETTE.positive }}>
                          {diff === 0 ? "—" : `${diff > 0 ? "+" : "-"}₱${fmt(Math.abs(diff))}`}
                        </span>
                        <button onClick={() => removeCategory(c.id)} aria-label={`Remove ${c.name}`} style={iconBtnStyle}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Savings */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>
                Savings
              </h2>
            </div>
            <div
              style={{
                background: PALETTE.card,
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 8,
                padding: "16px 18px",
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 16,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13, color: PALETTE.inkSoft }}>Current bank savings</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20 }}>₱</span>
                  <input
                    type="number"
                    value={bankSavings}
                    onChange={(e) =>
                      setBankSavings(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))
                    }
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 20,
                      fontWeight: 500,
                      border: "none",
                      background: "transparent",
                      color: PALETTE.ink,
                      width: 140,
                      textAlign: "right",
                      padding: 0,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: PALETTE.inkSoft }}>History</span>
                <button onClick={() => setShowAddSaving((s) => !s)} style={textBtnStyle}>
                  <Plus size={14} /> Add entry
                </button>
              </div>

              {showAddSaving && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                  <select value={savingType} onChange={(e) => setSavingType(e.target.value)} style={{ ...textInputStyle, flex: "1 1 110px" }}>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="deposit">Deposit</option>
                  </select>
                  <input type="number" placeholder="Amount" value={savingAmount} onChange={(e) => setSavingAmount(e.target.value)} style={{ ...textInputStyle, flex: "1 1 90px" }} />
                  <input type="text" placeholder="Note (optional)" value={savingNote} onChange={(e) => setSavingNote(e.target.value)} style={{ ...textInputStyle, flex: "2 1 140px" }} />
                  <input type="date" value={savingDate} onChange={(e) => setSavingDate(e.target.value)} style={{ ...textInputStyle, flex: "1 1 130px" }} />
                  <button onClick={addSavingsEntry} style={primaryBtnStyle}>Add</button>
                </div>
              )}

              {savingsLog.length === 0 ? (
                <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>No withdrawals or deposits logged yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[...savingsLog].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e, i) => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.line}`, fontSize: 13 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: PALETTE.inkSoft, width: 90, flexShrink: 0 }}>{e.date}</span>
                      <span style={{ fontSize: 11, textTransform: "capitalize", color: e.type === "withdrawal" ? PALETTE.negative : PALETTE.positive, border: `1px solid ${PALETTE.line}`, borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>{e.type}</span>
                      <span style={{ flex: 1, color: PALETTE.inkSoft, overflow: "hidden", textOverflow: "ellipsis" }}>{e.note}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: e.type === "withdrawal" ? PALETTE.negative : PALETTE.positive }}>
                        {e.type === "withdrawal" ? "-" : "+"}₱{fmt(e.amount)}
                      </span>
                      <button onClick={() => removeSavingsEntry(e.id)} aria-label="Delete entry" style={iconBtnStyle}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transactions - full width */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>
              Transactions
            </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowAddTx((s) => !s)} style={textBtnStyle}>
                  <Plus size={14} /> Add transaction
                </button>
                <button onClick={() => setShowHistory(true)} style={textBtnStyle}>
                  <History size={14} /> History
                </button>
              </div>
            </div>

            {showAddTx && (
              <div
                style={{
                  background: PALETTE.card,
                  border: `1px solid ${PALETTE.line}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <select value={txCat} onChange={(e) => setTxCat(e.target.value)} style={{ ...textInputStyle, flex: "1 1 140px" }}>
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  style={{ ...textInputStyle, flex: "1 1 90px" }}
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  style={{ ...textInputStyle, flex: "2 1 140px" }}
                />
                <select value={txMethod} onChange={(e) => setTxMethod(e.target.value)} style={{ ...textInputStyle, flex: "1 1 110px" }}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  style={{ ...textInputStyle, flex: "1 1 130px" }}
                />
                <button onClick={addTransaction} style={primaryBtnStyle}>
                  Add
                </button>
              </div>
            )}

            <div
              style={{
                background: PALETTE.card,
                border: `1px dashed ${PALETTE.line}`,
                borderRadius: 8,
                padding: "16px",
                fontSize: 13,
                color: PALETTE.inkSoft,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span>
                {sortedTxs.length === 0
                  ? `No transactions logged for ${monthLabel(current)} yet.`
                  : `${sortedTxs.length} transaction${sortedTxs.length === 1 ? "" : "s"} logged for ${monthLabel(current)}.`}
              </span>
              {sortedTxs.length > 0 && (
                <button onClick={() => setShowHistory(true)} style={textBtnStyle}>
                  <History size={14} /> View history
                </button>
              )}
            </div>
        </div>
      </div>

      {/* Transaction history modal */}
      {showHistory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(35, 35, 35, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: PALETTE.paper,
              borderRadius: 12,
              border: `1px solid ${PALETTE.line}`,
              width: "100%",
              maxWidth: 640,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: `1px solid ${PALETTE.line}`,
              }}
            >
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>
                Transaction history — {monthLabel(current)}
              </h2>
              <button onClick={() => setShowHistory(false)} aria-label="Close" style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 20px 20px" }}>
              {sortedTxs.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${PALETTE.line}`,
                    borderRadius: 8,
                    padding: "24px 16px",
                    textAlign: "center",
                    color: PALETTE.inkSoft,
                    fontSize: 14,
                    marginTop: 8,
                  }}
                >
                  <PiggyBank size={20} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <div>No transactions logged for {monthLabel(current)} yet.</div>
                </div>
              ) : (
                <div
                  style={{
                    background: PALETTE.card,
                    border: `1px solid ${PALETTE.line}`,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  {sortedTxs.map((t, i) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderTop: i === 0 ? "none" : `1px solid ${PALETTE.line}`,
                        fontSize: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: PALETTE.inkSoft, width: 90, flexShrink: 0 }}>
                        {t.date}
                      </span>
                      <span style={{ width: 140, flexShrink: 0, fontWeight: 500 }}>{catName(t.catId)}</span>
                      <span style={{ flex: 1, minWidth: 60, color: PALETTE.inkSoft, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.note}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: PALETTE.inkSoft,
                          border: `1px solid ${PALETTE.line}`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          flexShrink: 0,
                        }}
                      >
                        {t.method || "Cash"}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                        ₱{fmt(t.amount)}
                      </span>
                      <button onClick={() => removeTransaction(t.id)} aria-label="Delete transaction" style={iconBtnStyle}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.card,
  borderRadius: 6,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: PALETTE.ink,
};

const iconBtnStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: PALETTE.inkSoft,
  display: "flex",
  alignItems: "center",
  padding: 4,
};

const textBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.card,
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
  color: PALETTE.primary,
  fontWeight: 500,
};

const primaryBtnStyle = {
  border: "none",
  background: PALETTE.primary,
  color: "#fff",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const textInputStyle = {
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'Inter', sans-serif",
  background: "#fff",
  color: PALETTE.ink,
  minWidth: 0,
};

const miniInputStyle = {
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  background: "#fff",
  color: PALETTE.ink,
  width: 70,
  textAlign: "right",
};