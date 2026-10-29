import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Command,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  Layers,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Moon,
  TrendingUp,
  Upload,
  X,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import Chart from "./Chart";
import { api, BASE, money, percent, label, type Finding } from "./api";
const navigation = [
  ["Overview", LayoutDashboard],
  ["Data workspace", FolderOpen],
  ["Investigations", Search],
  ["Revenue", TrendingUp],
  ["Expenses", Wallet],
  ["Profitability", BarChart3],
  ["Anomalies", Activity],
  ["Scenarios", SlidersHorizontal],
  ["AI Analyst", Sparkles],
  ["Actions", ListChecks],
  ["Reports", FileText],
  ["Methodology", BookOpen],
  ["Settings", Settings],
] as const;
const statuses = [
  "New",
  "Investigating",
  "Awaiting Information",
  "Confirmed",
  "Resolved",
  "False Positive",
  "Archived",
];
function Empty({ text = "No records in this view." }: { text?: string }) {
  return (
    <div className="empty">
      <Layers size={28} />
      <h3>{text}</h3>
      <p>Import source data or adjust your filters to get started.</p>
    </div>
  );
}
function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Table({
  rows,
  columns,
  onRow,
}: {
  rows: any[];
  columns: {
    key: string;
    name: string;
    format?: (v: any, row: any) => React.ReactNode;
  }[];
  onRow?: (row: any) => void;
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map((c, j) => (
                <td key={c.key}>
                  {j === 0 && onRow ? (
                    <button className="table-link" onClick={() => onRow(row)}>
                      {c.format
                        ? c.format(row[c.key], row)
                        : String(row[c.key] ?? "—")}
                    </button>
                  ) : c.format ? (
                    c.format(row[c.key], row)
                  ) : (
                    String(row[c.key] ?? "—")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}
export default function App() {
  const client = useQueryClient();
  const [page, setPage] = useState(
    () => localStorage.getItem("mp-page") || "Overview",
  );
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("mp-theme") === "dark",
  );
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState(
    () => localStorage.getItem("mp-currency") || "USD",
  );
  const [start, setStart] = useState(
    () => localStorage.getItem("mp-start") || "2025-11-01",
  );
  const [end, setEnd] = useState(
    () => localStorage.getItem("mp-end") || "2026-10-29",
  );
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [selected, setSelected] = useState<Finding | null>(null);
  const [source, setSource] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const filter = `?start=${start}&end=${end}&currency=${currency}`;
  const dashboard = useQuery({
    queryKey: ["dashboard", start, end, currency],
    queryFn: () => api("/dashboard" + filter),
  });
  const findings = useQuery<Finding[]>({
    queryKey: ["findings"],
    queryFn: () => api("/findings"),
  });
  const workspaces = useQuery<any[]>({
    queryKey: ["workspaces"],
    queryFn: () => api("/workspaces"),
  });
  const d = dashboard.data;
  const fmt = (v: unknown) => money(v, currency);
  const alert = (s: string) => {
    if (toastTimer.current !== undefined) clearTimeout(toastTimer.current);
    setToast(s);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const mutate = async (path: string, body?: any, method = "POST") => {
    try {
      setBusy(true);
      const result = await api(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      await client.invalidateQueries();
      return result;
    } catch (e) {
      alert((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    localStorage.setItem("mp-page", page);
    setMobile(false);
  }, [page]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("mp-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    localStorage.setItem("mp-start", start);
    localStorage.setItem("mp-end", end);
    localStorage.setItem("mp-currency", currency);
  }, [start, end, currency]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setSource(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (!selected && !source) return;
    const previous = document.activeElement as HTMLElement;
    const dialogs = document.querySelectorAll<HTMLElement>("[role=dialog]");
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const nodes = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,a[href],input,select,textarea,[tabindex="0"]',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    nodes()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = nodes();
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => {
      dialog.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [selected?.id, Boolean(source)]);
  const visible = ((d?.findings as Finding[]) || findings.data || []).filter(
    (f) =>
      `${f.title} ${f.category} ${f.id} ${f.owner}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const trend = d?.trend || [];
  const colors = ["#4778ee", "#10a895", "#a6b9e9", "#e8b557", "#9f81d9"];
  const line = (keys: string[], names: string[]) => ({
    color: colors,
    tooltip: { trigger: "axis" as const, valueFormatter: (v: any) => fmt(v) },
    legend: {
      bottom: 0,
      icon: "circle",
      textStyle: { color: "#8490a4" },
      itemWidth: 8,
    },
    grid: { left: 60, right: 20, top: 24, bottom: 50 },
    xAxis: {
      type: "category" as const,
      data: trend.map((t: any) => t.month),
      axisLine: { lineStyle: { color: "#e7ebf2" } },
      axisLabel: { color: "#8490a4" },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#8490a4",
        formatter: (v: number) =>
          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v),
      },
      splitLine: { lineStyle: { color: "#e7ebf2", type: "dashed" as const } },
    },
    series: keys.map((key, i) => ({
      name: names[i],
      type: "line" as const,
      smooth: true,
      symbol: trend.length === 1 ? "circle" : "none",
      symbolSize: 7,
      lineStyle: { width: 3 },
      areaStyle: i === 0 ? { color: "rgba(71,120,238,.07)" } : undefined,
      data: trend.map((t: any) => (t[key] === null ? null : Number(t[key]))),
    })),
  });
  const bars = (rows: any[], key: string, value: string) => ({
    color: colors,
    tooltip: { trigger: "axis" as const, valueFormatter: (v: any) => fmt(v) },
    grid: { left: 140, right: 30, top: 10, bottom: 30 },
    xAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#8490a4",
        formatter: (v: number) => `${Math.round(v / 1000)}k`,
      },
      splitLine: { lineStyle: { color: "#e7ebf2", type: "dashed" as const } },
    },
    yAxis: {
      type: "category" as const,
      data: rows.map((r) => r[key]),
      axisLabel: {
        color: "#8490a4",
        width: 125,
        overflow: "truncate" as const,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar" as const,
        data: rows.map((r) => Number(r[value])),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
      },
    ],
  });
  const openRecords = async (kind: string) => {
    try {
      setSource({ kind, loading: true });
      const result = await api(
        `/records/${kind}?search=${encodeURIComponent(search)}`,
      );
      setSource({ kind, ...result });
    } catch (e) {
      setSource({ kind, error: (e as Error).message });
    }
  };
  const inspectEvidence = async (e: any) => {
    try {
      const datasets = await api<any[]>("/datasets");
      const ds = datasets.find((r) => r.id === e.dataset_id);
      if (!ds) {
        alert(
          "Source dataset is no longer available. Historical evidence is retained.",
        );
        return;
      }
      setSource({ kind: ds.kind, loading: true });
      const data = await api(
        `/records/${ds.kind}?search=${encodeURIComponent(e.source_id || e.record_id)}`,
      );
      setSource({ kind: ds.kind, ...data });
    } catch (error) {
      alert((error as Error).message);
    }
  };
  const exportLink = (type: string, format = "pdf") =>
    `${BASE}/reports/${type}${filter}&format=${format}`;
  const findingTable = (rows: Finding[]) => (
    <Table
      rows={rows}
      onRow={setSelected}
      columns={[
        {
          key: "title",
          name: "Investigation",
          format: (v, r) => (
            <div className="case-name">
              <span className={`case-icon ${r.severity}`}>
                <Search size={16} />
              </span>
              <span>
                {v}
                <small>{label(r.category)}</small>
              </span>
            </div>
          ),
        },
        {
          key: "severity",
          name: "Priority",
          format: (v) => <span className={`badge ${v}`}>{label(v)}</span>,
        },
        {
          key: "amount",
          name: "Potential exposure",
          format: (v, r) => money(v, r.currency),
        },
        {
          key: "status",
          name: "Status",
          format: (v) => (
            <span className="status">
              <i />
              {label(v)}
            </span>
          ),
        },
        { key: "id", name: "", format: () => <ChevronRight size={15} /> },
      ]}
    />
  );
  function overview() {
    return (
      <>
        {(d?.coverage?.missing_recognition_dates > 0 ||
          d?.coverage?.missing_labor_costs > 0) && (
          <div className="notice">
            <AlertTriangle size={18} />
            Some recognition dates or labor costs are missing. Affected revenue
            or contribution metrics are unavailable. Review Metrics &
            Methodology for coverage details.
          </div>
        )}
        <div className="insight-banner">
          <div className="insight-symbol">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>
              Your numbers have a story. Find what needs attention.
            </strong>
            <p>
              {d?.metrics.unresolved_findings ?? "—"} open findings across your
              business. Every finding connects back to its source records.
            </p>
          </div>
          <button
            className="banner-link"
            onClick={() => setPage("Investigations")}
          >
            Explore findings <ArrowRight size={16} />
          </button>
        </div>
        <div className="metric-grid">
          {[
            {
              name: "Recognized revenue",
              key: "recognized_revenue",
              icon: TrendingUp,
              sub: "Revenue earned in this period",
              className: "blue",
            },
            {
              name: "Total expenses",
              key: "expenses",
              icon: ArrowDownLeft,
              sub: "External recorded expenses; labor separate",
              className: "purple",
            },
            {
              name: "Contribution margin",
              key: "gross_margin",
              icon: Gauge,
              sub: "Revenue less expenses and delivery labor",
              className: "green",
            },
            {
              name: "Outstanding receivables",
              key: "outstanding",
              icon: Wallet,
              sub: "Unpaid balance · as of reporting end",
              className: "amber",
            },
          ].map((m) => (
            <button
              className="metric-card"
              key={m.key}
              onClick={() => setPage("Methodology")}
            >
              <div className="metric-label">
                {m.name}
                <span className={`metric-icon ${m.className}`}>
                  <m.icon size={17} />
                </span>
              </div>
              <div className="metric-value">
                {m.key === "gross_margin"
                  ? percent(d?.metrics[m.key])
                  : fmt(d?.metrics[m.key])}
              </div>
              <p>{m.sub}</p>
              <span className="metric-foot">
                <ShieldCheck size={12} /> Source-backed calculation{" "}
                <ArrowUpRight size={13} />
              </span>
            </button>
          ))}
        </div>
        <div className="two-col">
          <Panel
            title="Business performance"
            subtitle="Recognized revenue, recorded expenses and collected cash"
            action={<span className="quiet-tag">{currency}</span>}
          >
            <Chart
              label="Monthly revenue, expense and collected cash trend"
              option={line(
                ["revenue", "expenses", "cash"],
                ["Recognized revenue", "External expenses", "Cash collected"],
              )}
            />
          </Panel>
          <Panel
            title="Receivables at a glance"
            subtitle="Outstanding balances by invoice age"
          >
            <Chart
              label="Invoice aging distribution"
              onSelect={() => openRecords("invoices")}
              option={{
                color: colors,
                tooltip: {
                  trigger: "item",
                  valueFormatter: (v: any) => fmt(v),
                },
                legend: {
                  bottom: 0,
                  textStyle: { color: "#8490a4" },
                  icon: "circle",
                  itemWidth: 8,
                },
                series: [
                  {
                    type: "pie",
                    radius: ["49%", "72%"],
                    center: ["50%", "43%"],
                    label: { show: false },
                    itemStyle: {
                      borderWidth: 4,
                      borderColor: dark ? "#152139" : "#fff",
                      borderRadius: 5,
                    },
                    data: (d?.aging || []).map((a: any) => ({
                      name: a.bucket,
                      value: Number(a.amount),
                    })),
                  },
                ],
                graphic: [
                  {
                    type: "text",
                    left: "center",
                    top: "35%",
                    style: {
                      text: fmt(d?.metrics.outstanding),
                      fontSize: 24,
                      fontWeight: 600,
                      fill: dark ? "#e9eef7" : "#14213b",
                    },
                  },
                  {
                    type: "text",
                    left: "center",
                    top: "46%",
                    style: {
                      text: "TOTAL OUTSTANDING",
                      fontSize: 10,
                      fill: "#8490a4",
                    },
                  },
                ],
              }}
            />
          </Panel>
        </div>
        <Panel
          title="Your investigation queue"
          subtitle="Potential discrepancies to review, ordered by the analytical engine"
          action={
            <button
              className="text-button"
              onClick={() => setPage("Investigations")}
            >
              View all findings <ArrowRight size={15} />
            </button>
          }
        >
          {findingTable(visible.slice(0, 5))}
        </Panel>
        <div className="three-col">
          <div className="mini-stat">
            <span>Potential unbilled work</span>
            <strong>{fmt(d?.metrics.unbilled)}</strong>
            <small>Estimated contract-backed opportunity</small>
          </div>
          <div className="mini-stat">
            <span>Overdue receivables</span>
            <strong>{fmt(d?.metrics.overdue)}</strong>
            <small>Outstanding beyond contractual due date</small>
          </div>
          <div className="mini-stat">
            <span>Verified recovered revenue</span>
            <strong>{fmt(d?.metrics.recovered_revenue)}</strong>
            <small>
              {d?.metrics.completed_investigations ?? 0} completed
              investigations
            </small>
          </div>
        </div>
      </>
    );
  }
  function analysis() {
    if (page === "Revenue")
      return (
        <>
          <div className="three-col">
            {[
              ["Invoiced revenue", "invoiced_revenue"],
              ["Recognized revenue", "recognized_revenue"],
              ["Collected cash", "collected_cash"],
            ].map(([name, key]) => (
              <div className="mini-stat" key={key}>
                <span>{name}</span>
                <strong>{fmt(d?.metrics[key])}</strong>
                <small>Distinct accounting basis · selected period</small>
              </div>
            ))}
          </div>
          <div className="two-col">
            <Panel title="Revenue & collection performance">
              <Chart
                label="Revenue and collected cash over time"
                option={line(
                  ["revenue", "cash"],
                  ["Recognized revenue", "Collected cash"],
                )}
                onSelect={() => openRecords("invoices")}
              />
            </Panel>
            <Panel title="Client revenue concentration">
              <Chart
                label="Revenue by client"
                option={bars(
                  (d?.clients || []).slice(0, 8).reverse(),
                  "name",
                  "revenue",
                )}
                onSelect={() => openRecords("clients")}
              />
            </Panel>
          </div>
          <Panel
            title="Client balances"
            subtitle="Select a client to explore source records"
          >
            <Table
              rows={d?.clients || []}
              onRow={() => openRecords("clients")}
              columns={[
                { key: "name", name: "Client" },
                { key: "revenue", name: "Revenue", format: fmt },
                { key: "outstanding", name: "Outstanding", format: fmt },
              ]}
            />
          </Panel>
        </>
      );
    if (page === "Expenses")
      return (
        <>
          <div className="two-col">
            <Panel title="Expense trend">
              <Chart
                label="Monthly recorded expenses"
                option={line(["expenses"], ["Expenses"])}
                onSelect={() => openRecords("expenses")}
              />
            </Panel>
            <Panel title="Cost concentration">
              <Chart
                label="Expense category distribution"
                option={bars(d?.expense_categories || [], "category", "amount")}
                onSelect={() => openRecords("expenses")}
              />
            </Panel>
          </div>
          <Panel
            title="Expense records"
            action={
              <button
                onClick={() => openRecords("expenses")}
                className="text-button"
              >
                Browse source records <ArrowRight size={15} />
              </button>
            }
          >
            <Table
              rows={d?.expense_categories || []}
              columns={[
                { key: "category", name: "Category" },
                { key: "amount", name: "Recorded expenditure", format: fmt },
              ]}
            />
          </Panel>
          <Panel title="Expense findings">
            {findingTable(
              visible.filter((f) => /expense|cost|duplicate/.test(f.category)),
            )}
          </Panel>
        </>
      );
    return (
      <>
        <div className="notice">
          <ShieldCheck size={18} /> Contribution estimates use recorded revenue
          less available project expenses. They are not audited gross or net
          margins.
        </div>
        <div className="two-col">
          <Panel title="Profitability trend">
            <Chart
              label="Monthly project profit"
              option={line(["profit"], ["Contribution estimate"])}
            />
          </Panel>
          <Panel title="Project profit ranking">
            <Chart
              label="Contribution estimate by project"
              option={bars(
                [...(d?.projects || [])]
                  .sort((a, b) => Number(a.profit) - Number(b.profit))
                  .slice(-8),
                "name",
                "profit",
              )}
              onSelect={() => openRecords("projects")}
            />
          </Panel>
        </div>
        <Panel title="Project profitability">
          <Table
            rows={d?.projects || []}
            onRow={() => openRecords("projects")}
            columns={[
              { key: "name", name: "Project" },
              { key: "client", name: "Client" },
              { key: "revenue", name: "Revenue", format: fmt },
              { key: "cost", name: "Direct cost", format: fmt },
              { key: "profit", name: "Contribution estimate", format: fmt },
              { key: "margin", name: "Contribution margin", format: percent },
              { key: "hours", name: "Hours" },
            ]}
          />
        </Panel>
      </>
    );
  }
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {mobile && <div className="nav-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => setPage("Overview")}
        >
          <div className="brand-mark">
            <Layers size={25} />
          </div>
          <span>
            MarginProof<span className="brand-ai">AI</span>
          </span>
        </a>
        <button className="workspace" onClick={() => setPage("Settings")}>
          <span className="workspace-avatar">N</span>
          <span>
            <strong>
              {workspaces.data?.[0]?.name || "Northstar Digital Studio"}
            </strong>
            <small>Fictional demo workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => setPage(name)}
              className={page === name ? "active" : ""}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Investigations" && (
                <span className="nav-count">
                  {d?.metrics.unresolved_findings ?? 0}
                </span>
              )}
              {name === "AI Analyst" && <span className="ai-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-indicator">
            <i /> FICTIONAL DEMO <ShieldCheck size={14} />
          </div>
          <p>
            Real analytics. Sample data.
            <br />
            Development workspace only.
          </p>
          <button className="profile" onClick={() => setPage("Settings")}>
            <span className="profile-avatar">NS</span>
            <span>
              <strong>Northstar Studio</strong>
              <small>Local analyst</small>
            </span>
            <Settings size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>{page}</strong>
          </div>
          <div className="header-actions">
            <div className="search-input">
              <Search size={16} />
              <input
                aria-label="Search findings and records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setPage("Investigations");
                }}
                placeholder="Search anything…"
              />
              <kbd>↵</kbd>
            </div>
            <button
              className="icon-button"
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="header-avatar">NS</div>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                YOUR FINANCIAL INTELLIGENCE, CONNECTED
              </div>
              <h1>
                {page === "Overview"
                  ? "Business overview"
                  : page === "Investigations"
                    ? "Investigation center"
                    : page === "AI Analyst"
                      ? "Your financial analyst"
                      : page}
              </h1>
              <p>
                {page === "Overview"
                  ? "A clearer picture of your business. A smarter place to start."
                  : page === "Investigations"
                    ? "Follow the evidence. Understand the issue. Take the next step."
                    : "Evidence-backed insights from your connected business records."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    await mutate("/analysis-runs");
                    alert("Analysis complete. Findings and metrics refreshed.");
                  } catch {}
                }}
              >
                <RefreshCw size={15} className={busy ? "spin" : ""} /> Run
                analysis
              </button>
              <a
                className="button primary"
                href={exportLink("executive")}
                download
              >
                <Download size={15} /> Export report
              </a>
            </div>
          </div>
          <div className="filterbar">
            <div className="date-range">
              <label>
                From
                <input
                  aria-label="Start date"
                  type="date"
                  value={start}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <span>—</span>
              <label>
                To
                <input
                  aria-label="End date"
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <select
              aria-label="Date range preset"
              defaultValue="custom"
              onChange={(e) => {
                const months = Number(e.target.value);
                if (months) {
                  const date = new Date(end);
                  date.setMonth(date.getMonth() - months);
                  date.setDate(date.getDate() + 1);
                  setStart(date.toISOString().slice(0, 10));
                }
              }}
            >
              <option value="custom">Custom period</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </select>
            <select
              aria-label="Reporting currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {["USD", "INR", "EUR", "GBP"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="freshness">
              <i />{" "}
              {d
                ? `Data imported ${d.data_freshness ? new Date(d.data_freshness).toLocaleDateString() : "not available"}`
                : "Connecting to your data"}
            </span>
          </div>
          {dashboard.isLoading ? (
            <div className="skeleton-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="skeleton" key={n} />
              ))}
            </div>
          ) : dashboard.isError ? (
            <div className="error-state">
              <AlertTriangle />
              <h2>We couldn’t connect to your data</h2>
              <p>{dashboard.error.message}</p>
              <button
                className="button primary"
                onClick={() => dashboard.refetch()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {page === "Overview" ? (
                overview()
              ) : ["Revenue", "Expenses", "Profitability"].includes(page) ? (
                analysis()
              ) : page === "Data workspace" ? (
                <DataWorkspace alert={alert} openRecords={openRecords} />
              ) : ["Investigations", "Anomalies"].includes(page) ? (
                <FindingCenter
                  findings={visible}
                  table={findingTable}
                  anomalies={page === "Anomalies"}
                />
              ) : page === "Scenarios" ? (
                <Scenarios currency={currency} filter={filter} alert={alert} />
              ) : page === "AI Analyst" ? (
                <Analyst currency={currency} filter={filter} />
              ) : page === "Actions" ? (
                <Actions alert={alert} />
              ) : page === "Reports" ? (
                <Reports link={exportLink} />
              ) : page === "Settings" ? (
                <SettingsPage alert={alert} />
              ) : (
                <>
                  <Panel
                    title="Metrics & methodology"
                    subtitle="Deterministic calculations, explicit assumptions and traceable source records"
                  >
                    <Table
                      rows={d?.methodology || []}
                      columns={[
                        { key: "metric", name: "Metric" },
                        { key: "formula", name: "Calculation" },
                        { key: "limitations", name: "Limitations" },
                      ]}
                    />
                  </Panel>
                  <Panel
                    title="Dataset coverage"
                    subtitle="Missing or partial records can limit the conclusions that are supported"
                  >
                    <pre className="json-box">
                      {JSON.stringify(d?.coverage, null, 2)}
                    </pre>
                  </Panel>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={13} /> Evidence before conclusions.
            </span>
            <span>MarginProof AI · Fictional demo · {currency} only</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Finding evidence"
            className="evidence-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-top">
              <span className="eyebrow">INVESTIGATION / EVIDENCE</span>
              <button
                className="icon-button"
                aria-label="Close evidence"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <span className={`badge ${selected.severity}`}>
              {label(selected.severity)} priority
            </span>
            <h2>{selected.title}</h2>
            <code>{selected.id}</code>
            <div className="evidence-amount">
              <small>POTENTIAL EXPOSURE · ESTIMATED</small>
              <strong>{money(selected.amount, selected.currency)}</strong>
            </div>
            <p>{selected.description}</p>
            <div className="notice">
              <AlertTriangle size={18} /> A detected finding requires review. It
              is not a confirmed loss or evidence of fraud.
            </div>
            <label className="field">
              Investigation status
              <select
                value={selected.status}
                onChange={async (e) => {
                  try {
                    const result = await mutate(
                      `/findings/${selected.id}`,
                      { status: e.target.value },
                      "PATCH",
                    );
                    setSelected(result);
                    alert("Investigation status saved.");
                  } catch {}
                }}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                try {
                  const result = await mutate(
                    `/findings/${selected.id}`,
                    {
                      status: selected.status,
                      owner: data.get("owner"),
                      note: data.get("note"),
                    },
                    "PATCH",
                  );
                  setSelected(result);
                  alert("Investigation notes saved.");
                } catch {}
              }}
            >
              <label className="field">
                Assigned owner
                <input
                  name="owner"
                  defaultValue={selected.owner || ""}
                  placeholder="Add an owner"
                />
              </label>
              <label className="field">
                Investigation note
                <textarea
                  name="note"
                  placeholder="Record the result of your review"
                  required
                />
              </label>
              <button className="button" disabled={busy}>
                Save owner & note
              </button>
            </form>
            <h3>Suggested next step</h3>
            <p>{selected.next_action}</p>
            <h3>Supporting source evidence</h3>
            {selected.evidence.map((e, i) => (
              <div className="evidence-item" key={i}>
                <div>
                  <span className="quiet-tag">Source {i + 1}</span>
                  <button
                    className="text-button"
                    onClick={() => inspectEvidence(e)}
                  >
                    {e.source_id || e.record_id} <ArrowUpRight size={13} />
                  </button>
                </div>
                <dl>
                  {Object.entries(e).map(([k, v]) => (
                    <div key={k}>
                      <dt>{label(k)}</dt>
                      <dd>
                        {typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <small className="muted">
              Confidence: {selected.confidence}. Discovered{" "}
              {new Date(selected.discovered_at).toLocaleString()}; recalculated{" "}
              {new Date(selected.recalculated_at).toLocaleString()}.
            </small>
            <button
              className="button primary full"
              onClick={() => {
                setPage("Actions");
                setSelected(null);
              }}
            >
              <Plus size={16} /> Open action center
            </button>
          </section>
        </div>
      )}
      {source && (
        <div className="drawer-backdrop" onClick={() => setSource(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Source records"
            className="source-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-top">
              <h2>{label(source.kind)} · source records</h2>
              <button
                className="icon-button"
                aria-label="Close source records"
                onClick={() => setSource(null)}
              >
                <X />
              </button>
            </div>
            {source.loading ? (
              <p>Loading records…</p>
            ) : source.error ? (
              <p className="error-text">{source.error}</p>
            ) : (
              <>
                <p className="muted">
                  {source.total} records. Search in the header to narrow
                  results.
                </p>
                <Table
                  rows={source.items || []}
                  columns={Object.keys(source.items?.[0] || {})
                    .filter(
                      (k) => !["workspace_id", "organization_id"].includes(k),
                    )
                    .slice(0, 12)
                    .map((key) => ({
                      key,
                      name: label(key),
                      format: (v) =>
                        typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "—"),
                    }))}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function FindingCenter({
  findings,
  table,
  anomalies,
}: {
  findings: Finding[];
  table: (f: Finding[]) => React.ReactNode;
  anomalies: boolean;
}) {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = findings.filter(
    (f) =>
      (severity === "all" || f.severity === severity) &&
      (status === "all" || f.status === status) &&
      (!anomalies || /anomal|cost|margin|expense/.test(f.category)),
  );
  return (
    <>
      {anomalies && (
        <div className="notice">
          <Activity size={18} /> Robust statistical rules flag unusual records
          for review. Statistical outliers do not establish a business error or
          causation. Inspect each finding’s evidence for its threshold and
          reference values.
        </div>
      )}
      <div className="three-col">
        <div className="mini-stat">
          <span>Findings in view</span>
          <strong>{rows.length}</strong>
          <small>Evidence-backed rules</small>
        </div>
        <div className="mini-stat">
          <span>High priority</span>
          <strong>
            {
              rows.filter((f) => ["high", "critical"].includes(f.severity))
                .length
            }
          </strong>
          <small>Review the underlying records</small>
        </div>
        <div className="mini-stat">
          <span>Resolved</span>
          <strong>{rows.filter((f) => f.status === "Resolved").length}</strong>
          <small>Confirmed investigation outcomes</small>
        </div>
      </div>
      <Panel
        title={anomalies ? "Anomaly explorer" : "All investigations"}
        subtitle="Select an investigation to inspect calculations and source records"
        action={
          <div className="inline">
            <select
              aria-label="Filter severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="all">All priorities</option>
              {["critical", "high", "medium", "low"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {table(rows)}
      </Panel>
    </>
  );
}
function DataWorkspace({
  alert,
  openRecords,
}: {
  alert: (s: string) => void;
  openRecords: (k: string) => void;
}) {
  const client = useQueryClient();
  const datasets = useQuery<any[]>({
    queryKey: ["datasets"],
    queryFn: () => api("/datasets"),
  });
  const templates = useQuery<Record<string, string[]>>({
    queryKey: ["templates"],
    queryFn: () => api("/templates"),
  });
  const [kind, setKind] = useState("invoices");
  const [preview, setPreview] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    setLoading(true);
    setError("");
    setValidation(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const p = await api("/imports/preview", { method: "POST", body });
      setPreview(p);
      setMapping(p.suggested_mapping || {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="notice">
        <ShieldCheck size={18} /> CSV and XLSX files stay in this local
        development workspace. Review all rejected and flagged rows before
        committing.
      </div>
      <div className="two-col import-layout">
        <Panel
          title="Bring your data together"
          subtitle="1. Upload → 2. Map columns → 3. Validate → 4. Import"
        >
          <label className="field">
            Dataset type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setValidation(null);
              }}
            >
              {Object.keys(templates.data || { invoices: [] }).map((k) => (
                <option key={k} value={k}>
                  {label(k)}
                </option>
              ))}
            </select>
          </label>
          <label
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={29} />
            <strong>
              {loading ? "Processing your file…" : "Drop your spreadsheet here"}
            </strong>
            <span>or click to browse · CSV or XLSX</span>
            <input
              type="file"
              aria-label="Upload CSV or XLSX"
              accept=".csv,.xlsx"
              disabled={loading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          <div className="inline template-links">
            <span>Start with a template</span>
            <a href={`${BASE}/templates/${kind}?format=csv`} download>
              CSV <Download size={12} />
            </a>
            <a href={`${BASE}/templates/${kind}?format=xlsx`} download>
              XLSX <Download size={12} />
            </a>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {preview && (
            <div className="mapping">
              <h3>Map source columns</h3>
              {preview.sheets?.length > 1 && (
                <label className="field">
                  Workbook sheet
                  <select
                    value={preview.sheet}
                    onChange={async (e) => {
                      try {
                        const sheet = e.target.value;
                        const data = await api(
                          `/imports/preview/${preview.preview_id}?sheet=${encodeURIComponent(sheet)}`,
                        );
                        setPreview({ ...preview, ...data, sheet });
                        setMapping(
                          Object.fromEntries(
                            data.columns
                              .filter((c: string) =>
                                (templates.data?.[kind] || []).includes(c),
                              )
                              .map((c: string) => [c, c]),
                          ),
                        );
                        setValidation(null);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {preview.sheets.map((s: string) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              <p className="muted">
                Canonical field on the left, your source column on the right.
                Required fields must be mapped.
              </p>
              {(templates.data?.[kind] || preview.required_fields || []).map(
                (field: string) => (
                  <label className="mapping-row" key={field}>
                    <span>{label(field)}</span>
                    <select
                      aria-label={`Map ${field}`}
                      value={mapping[field] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field]: e.target.value })
                      }
                    >
                      <option value="">Not mapped</option>
                      {preview.columns?.map((c: string) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                ),
              )}
              <button
                className="button primary full"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    setValidation(
                      await api("/imports/validate", {
                        method: "POST",
                        body: JSON.stringify({
                          preview_id: preview.preview_id,
                          kind,
                          sheet: preview.sheet,
                          mapping,
                        }),
                      }),
                    );
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Validate mapping <ArrowRight size={15} />
              </button>
            </div>
          )}
        </Panel>
        <Panel
          title={validation ? "Validation results" : "Source preview"}
          subtitle={
            validation
              ? "Every row is accounted for before import."
              : "Your first source rows will appear here."
          }
        >
          {validation ? (
            <>
              <div className="validation-summary">
                <span>
                  <strong>{validation.valid_count}</strong> valid
                </span>
                <span>
                  <strong>{validation.rejected_count}</strong> rejected
                </span>
                <span>
                  <strong>{validation.flagged_count}</strong> flagged
                </span>
              </div>
              {validation.errors?.length > 0 && (
                <Table
                  rows={validation.errors}
                  columns={[
                    { key: "row", name: "Row" },
                    { key: "field", name: "Field" },
                    { key: "message", name: "Issue" },
                  ]}
                />
              )}
              <button
                className="button primary full"
                disabled={!validation.valid_count || loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await api("/imports/commit", {
                      method: "POST",
                      body: JSON.stringify({
                        validation_id: validation.validation_id,
                      }),
                    });
                    alert(
                      `Imported ${result.row_count} records. ${result.rejected_count || 0} rows rejected.`,
                    );
                    setPreview(null);
                    setValidation(null);
                    client.invalidateQueries();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Import {validation.valid_count} valid records
              </button>
            </>
          ) : preview ? (
            <Table
              rows={preview.rows || []}
              columns={(preview.columns || []).map((key: string) => ({
                key,
                name: key,
              }))}
            />
          ) : (
            <Empty text="Your data, connected." />
          )}
        </Panel>
      </div>
      <Panel
        title="Dataset history"
        subtitle="Select a dataset to inspect normalized records. Rollback removes only the selected import."
      >
        <Table
          rows={datasets.data || []}
          onRow={(r) => openRecords(r.kind)}
          columns={[
            { key: "name", name: "Dataset" },
            { key: "kind", name: "Type", format: label },
            { key: "row_count", name: "Imported rows" },
            { key: "rejected_count", name: "Rejected" },
            { key: "status", name: "Status" },
            {
              key: "created_at",
              name: "Imported",
              format: (v) => new Date(v).toLocaleDateString(),
            },
            {
              key: "id",
              name: "",
              format: (v) => (
                <button
                  className="text-button danger"
                  onClick={() => setRemove(v)}
                >
                  Rollback
                </button>
              ),
            },
          ]}
        />
      </Panel>
      {remove && (
        <div className="drawer-backdrop">
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm dataset rollback"
          >
            <AlertTriangle />
            <h2>Rollback this dataset?</h2>
            <p>
              This removes this import’s normalized records and recalculates
              analytics. Investigation notes remain available.
            </p>
            <div className="inline">
              <button className="button" onClick={() => setRemove(null)}>
                Keep dataset
              </button>
              <button
                className="button danger"
                onClick={async () => {
                  try {
                    await api(`/datasets/${remove}`, { method: "DELETE" });
                    setRemove(null);
                    client.invalidateQueries();
                    alert("Dataset rolled back.");
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                Confirm rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Scenarios({
  currency,
  filter,
  alert,
}: {
  currency: string;
  filter: string;
  alert: (s: string) => void;
}) {
  const [values, setValues] = useState({
    rate_change: 8,
    cost_change: 15,
    unbilled_reduction: 20,
    delay_days: 10,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fmt = (v: unknown) => money(v, currency);
  useEffect(() => setResult(null), [filter]);
  return (
    <>
      <div className="notice">
        <SlidersHorizontal size={18} /> Hypothetical projections based on
        current source records. These are decision aids, not guarantees or
        forecasts.
      </div>
      <div className="two-col scenario-layout">
        <Panel
          title="What would change?"
          subtitle="Adjust the assumptions, then calculate a scenario."
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                setResult(
                  await api("/scenarios" + filter, {
                    method: "POST",
                    body: JSON.stringify(values),
                  }),
                );
              } catch (e) {
                alert((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {[
              {
                key: "rate_change",
                name: "Client rate change",
                min: -30,
                max: 40,
                unit: "%",
              },
              {
                key: "cost_change",
                name: "Delivery cost change",
                min: -30,
                max: 50,
                unit: "%",
              },
              {
                key: "unbilled_reduction",
                name: "Potential unbilled work reduction",
                min: 0,
                max: 100,
                unit: "%",
              },
              {
                key: "delay_days",
                name: "Payment delay reduction",
                min: 0,
                max: 60,
                unit: "days",
              },
            ].map((c) => (
              <label className="slider-field" key={c.key}>
                <span>
                  {c.name}
                  <strong>
                    {values[c.key as keyof typeof values]} {c.unit}
                  </strong>
                </span>
                <input
                  aria-label={c.name}
                  type="range"
                  min={c.min}
                  max={c.max}
                  value={values[c.key as keyof typeof values]}
                  onChange={(e) =>
                    setValues({ ...values, [c.key]: Number(e.target.value) })
                  }
                />
                <small>
                  {c.min} {c.unit}
                  <span>
                    {c.max} {c.unit}
                  </span>
                </small>
              </label>
            ))}
            <button className="button primary full" disabled={loading}>
              {loading ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}{" "}
              Calculate scenario
            </button>
          </form>
        </Panel>
        <Panel
          title="Projected impact"
          subtitle="Compare your baseline with the modified assumptions"
        >
          {result ? (
            <>
              <Table
                rows={["revenue", "cost", "profit", "margin"].map((key) => ({
                  id: key,
                  metric: label(key),
                  baseline:
                    key === "margin"
                      ? percent(result.baseline[key])
                      : fmt(result.baseline[key]),
                  projected:
                    key === "margin"
                      ? percent(result.projected?.[key])
                      : fmt(result.projected?.[key]),
                }))}
                columns={[
                  { key: "metric", name: "Metric" },
                  { key: "baseline", name: "Baseline" },
                  { key: "projected", name: "Projected" },
                ]}
              />
              <div className="scenario-results">
                <div>
                  <small>Working capital release</small>
                  <strong>{fmt(result.working_capital_release)}</strong>
                </div>
                <div>
                  <small>Unbilled opportunity</small>
                  <strong>{fmt(result.unbilled_opportunity)}</strong>
                </div>
              </div>
              <h3>Assumptions & limitations</h3>
              {result.assumptions.map((s: string, i: number) => (
                <p className="muted" key={i}>
                  {s}
                </p>
              ))}
            </>
          ) : (
            <Empty text="See the impact before you decide." />
          )}
        </Panel>
      </div>
      {result && (
        <Panel
          title="Rate sensitivity"
          subtitle="Hypothetical profit under alternative rate assumptions"
        >
          <Chart
            label="Profit sensitivity to rate changes"
            option={{
              color: ["#4778ee"],
              tooltip: { trigger: "axis", valueFormatter: (v: any) => fmt(v) },
              xAxis: {
                type: "category",
                name: "Rate change %",
                data: result.sensitivity.map((s: any) => s.rate_change),
              },
              yAxis: { type: "value" },
              grid: { left: 80, right: 60, bottom: 40 },
              series: [
                {
                  type: "line",
                  smooth: true,
                  data: result.sensitivity.map((s: any) => Number(s.profit)),
                },
              ],
            }}
          />
        </Panel>
      )}
    </>
  );
}
function Analyst({ currency, filter }: { currency: string; filter: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMessages([]), [filter]);
  const ask = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setQuestion("");
    try {
      const result = await api("/analyst" + filter, {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setMessages((m) => [...m, { question: q, ...result }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { question: q, answer: (e as Error).message, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="analyst-shell">
      <div className="analyst-intro">
        <div className="analyst-symbol">
          <Sparkles size={30} />
        </div>
        <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
        <h2>Ask your numbers a better question.</h2>
        <p>
          Explore your finances with a source-grounded analytical assistant.
          <br />
          Deterministic answers. Traceable records. No API key required.
        </p>
        <span className="quiet-tag">Rule-based analytical engine</span>
      </div>
      {!messages.length && (
        <div className="question-grid">
          {[
            "Which financial findings should I investigate first?",
            "Which clients have the highest overdue balances?",
            "Which projects are below target margin?",
            "What changed in expenses?",
          ].map((q) => (
            <button key={q} onClick={() => ask(q)} disabled={busy}>
              {q}
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      )}
      {messages.map((m, i) => (
        <div className="analyst-message" key={i}>
          <div className="question-bubble">
            <MessageSquare size={17} />
            {m.question}
          </div>
          <div className={m.error ? "answer error-text" : "answer"}>
            <Sparkles size={20} />
            <div>
              <p>{m.answer}</p>
              {m.records?.length > 0 && (
                <Table
                  rows={m.records}
                  columns={[
                    { key: "id", name: "Source record" },
                    { key: "label", name: "Description" },
                    {
                      key: "amount",
                      name: "Amount",
                      format: (v) => money(v, currency),
                    },
                  ]}
                />
              )}
              <small>
                <strong>Method:</strong> {m.method}
              </small>
              <p className="muted">
                {Array.isArray(m.limitations)
                  ? m.limitations.join(" ")
                  : m.limitations}
              </p>
            </div>
          </div>
        </div>
      ))}
      <form
        className="analyst-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          aria-label="Ask the financial analyst"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about revenue, expenses, margins or findings…"
          required
        />
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <ArrowRight size={18} />
          )}
          <span>Ask analyst</span>
        </button>
      </form>
      <p className="analyst-note">
        Answers use approved calculations and your current workspace records.
        Review evidence before making decisions.
      </p>
    </div>
  );
}
function Actions({ alert }: { alert: (s: string) => void }) {
  const client = useQueryClient();
  const actions = useQuery<any[]>({
    queryKey: ["actions"],
    queryFn: () => api("/actions"),
  });
  const [form, setForm] = useState(false);
  return (
    <>
      <Panel
        title="Turn findings into progress"
        subtitle="Assign an owner, track the work, and record verified outcomes."
        action={
          <button className="button primary" onClick={() => setForm(!form)}>
            <Plus size={15} /> Create action
          </button>
        }
      >
        {form && (
          <form
            className="action-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api("/actions", {
                  method: "POST",
                  body: JSON.stringify({
                    ...data,
                    status: "Open",
                    outcome: "",
                  }),
                });
                setForm(false);
                client.invalidateQueries({ queryKey: ["actions"] });
                alert("Action created.");
              } catch (e) {
                alert((e as Error).message);
              }
            }}
          >
            <label className="field">
              Action title
              <input
                name="title"
                required
                placeholder="Review outstanding balance"
              />
            </label>
            <label className="field">
              Owner
              <input name="owner" required placeholder="Assigned analyst" />
            </label>
            <label className="field">
              Due date
              <input type="date" name="due_date" required />
            </label>
            <label className="field">
              Related finding ID
              <input name="finding_id" placeholder="Optional source finding" />
            </label>
            <label className="field">
              Notes
              <textarea
                name="note"
                placeholder="Review steps and supporting records"
              />
            </label>
            <button className="button primary">Save action</button>
          </form>
        )}
        <Table
          rows={actions.data || []}
          columns={[
            { key: "title", name: "Action" },
            { key: "owner", name: "Owner" },
            { key: "due_date", name: "Due date" },
            {
              key: "status",
              name: "Status",
              format: (v, r) => (
                <select
                  aria-label={`Status for ${r.title}`}
                  value={v}
                  onChange={async (e) => {
                    try {
                      await api(`/actions/${r.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: e.target.value }),
                      });
                      client.invalidateQueries();
                      alert("Action updated.");
                    } catch (e) {
                      alert((e as Error).message);
                    }
                  }}
                >
                  {["Open", "In Progress", "Done"].map((s) => (
                    <option value={s} key={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              ),
            },
            { key: "note", name: "Notes" },
            {
              key: "outcome",
              name: "Outcome note",
              format: (v, r) => (
                <form
                  className="inline"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api(`/actions/${r.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          outcome: new FormData(e.currentTarget).get("outcome"),
                        }),
                      });
                      client.invalidateQueries();
                      alert("Outcome note recorded.");
                    } catch (e) {
                      alert((e as Error).message);
                    }
                  }}
                >
                  <input
                    aria-label={`Outcome note for ${r.title}`}
                    className="outcome-input"
                    type="text"
                    name="outcome"
                    defaultValue={v || ""}
                  />
                  <button
                    className="icon-button"
                    aria-label="Save outcome note"
                  >
                    <Check size={16} />
                  </button>
                </form>
              ),
            },
          ]}
        />
      </Panel>
      <div className="notice">
        <ShieldCheck size={18} /> Outcome notes record investigation results.
        Verified financial recovery requires an auditable link to supporting
        records and is unavailable in this demonstration.
      </div>
    </>
  );
}
function Reports({ link }: { link: (type: string, format: string) => string }) {
  return (
    <>
      <div className="notice">
        <FileText size={18} /> Reports use the selected reporting period and
        currency above. Exports include calculation basis, source references and
        limitations.
      </div>
      <div className="report-grid">
        {[
          [
            "business",
            "Business performance",
            "A complete view of revenue, expenses and performance.",
          ],
          [
            "revenue",
            "Revenue analysis",
            "Recognized revenue, collection and client balances.",
          ],
          [
            "expenses",
            "Expense investigation",
            "Spending patterns and expense review candidates.",
          ],
          [
            "profitability",
            "Project profitability",
            "Revenue, direct delivery costs and contribution estimates.",
          ],
          [
            "aging",
            "Invoice aging",
            "Outstanding receivables and contractual due dates.",
          ],
          [
            "findings",
            "Financial discrepancies",
            "Detected findings with reproducible evidence.",
          ],
          [
            "executive",
            "Executive summary",
            "An evidence-backed snapshot for decision makers.",
          ],
          [
            "case",
            "Case investigation",
            "Investigation details, status and source evidence.",
          ],
        ].map(([key, name, description]) => (
          <section className="report-card" key={key}>
            <div className="report-icon">
              <FileText size={23} />
            </div>
            <h2>{name}</h2>
            <p>{description}</p>
            <div className="report-downloads">
              {["pdf", "csv", "xlsx"].map((format) => (
                <a key={format} href={link(key, format)} download>
                  {format.toUpperCase()}
                  <Download size={13} />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
function SettingsPage({ alert }: { alert: (s: string) => void }) {
  const client = useQueryClient();
  const settings = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => api("/settings"),
  });
  return (
    <>
      <div className="two-col">
        <Panel
          title="Workspace preferences"
          subtitle="Local demo settings apply to this fictional business."
        >
          {settings.data ? (
            <form
              key={JSON.stringify(settings.data)}
              onSubmit={async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await api("/settings", {
                    method: "PATCH",
                    body: JSON.stringify({
                      ...data,
                      target_margin: Number(data.target_margin),
                      overdue_days: Number(data.overdue_days),
                      anomaly_threshold: Number(data.anomaly_threshold),
                    }),
                  });
                  client.invalidateQueries();
                  alert("Workspace settings saved.");
                } catch (e) {
                  alert((e as Error).message);
                }
              }}
            >
              <label className="field">
                Business name
                <input
                  name="business_name"
                  defaultValue={settings.data.business_name}
                  required
                />
              </label>
              <label className="field">
                Base currency
                <select name="currency" defaultValue={settings.data.currency}>
                  {["USD", "INR", "EUR", "GBP"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Target gross margin (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  name="target_margin"
                  defaultValue={settings.data.target_margin}
                  required
                />
              </label>
              <label className="field">
                Overdue review threshold (days)
                <input
                  type="number"
                  min="0"
                  max="90"
                  name="overdue_days"
                  defaultValue={settings.data.overdue_days}
                  required
                />
              </label>
              <label className="field">
                Anomaly threshold
                <input
                  type="number"
                  min="2"
                  max="10"
                  step="0.1"
                  name="anomaly_threshold"
                  defaultValue={settings.data.anomaly_threshold}
                  required
                />
              </label>
              <button className="button primary">Save preferences</button>
            </form>
          ) : (
            <p>Loading preferences…</p>
          )}
        </Panel>
        <div>
          <Panel title="Security & privacy">
            <div className="settings-state">
              <ShieldCheck />
              <div>
                <strong>Local development mode</strong>
                <p>
                  This demonstration uses fictional records and does not require
                  authentication. It is not intended for public deployment or
                  private production financial data.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Analyst configuration">
            <div className="settings-state">
              <Sparkles />
              <div>
                <strong>Deterministic fallback enabled</strong>
                <p>
                  The analyst works without external services. Optional Gemini
                  configuration belongs in server environment variables; secrets
                  are never stored in this browser.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Data controls">
            <p className="muted">
              Manage individual imports and confirm rollback in Data workspace.
              No currency conversion is performed; each reporting currency is
              analyzed separately.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
