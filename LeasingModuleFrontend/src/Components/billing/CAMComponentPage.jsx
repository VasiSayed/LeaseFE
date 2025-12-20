import React, { useEffect, useMemo, useState } from "react";
import { billingAPI } from "../../services/api";

/* ---------- storage helpers ---------- */
const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/* ---------- ACTIVE ctx from localStorage(active + scope_tree) ---------- */
const getActiveCtx = () => {
  try {
    const active = readJSON("active");
    if (!active) return null;

    const scopeType = (active.scope_type || active.scopeType || active.type || "ORG").toUpperCase();
    const scopeId = active.scope_id || active.scopeId || active.id || active.pk || null;

    const tree = readJSON("scope_tree", []);

    // ORG selected
    if (scopeType === "ORG") {
      const orgId = active.org_id || active.orgId || scopeId;
      return {
        scopeType,
        scopeId,
        orgId: Number(orgId) || null,
        siteId: null,
        label: active.label || active.name || "ORG",
        tree,
      };
    }

    // SITE selected => find parent ORG in scope_tree
    if (scopeType === "SITE") {
      const siteId = Number(scopeId) || null;

      const org = Array.isArray(tree)
        ? tree.find((o) => Array.isArray(o?.sites) && o.sites.some((s) => String(s.id) === String(siteId)))
        : null;

      return {
        scopeType,
        scopeId,
        orgId: Number(org?.id) || null,
        siteId,
        label: active.label || active.name || "SITE",
        tree,
      };
    }

    // fallback
    return {
      scopeType,
      scopeId,
      orgId: Number(active.org_id || active.orgId) || null,
      siteId: Number(active.site_id || active.siteId) || null,
      label: active.label || active.name || scopeType,
      tree,
    };
  } catch {
    return null;
  }
};

const fmtMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "0");
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const asStr = (v) => (v === null || v === undefined ? "" : String(v));

const to2 = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "0.00";
  return n.toFixed(2);
};

const localDateYYYYMMDD = (d = new Date()) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const localDateTimeForInput = (d = new Date()) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${hh}:${mi}`;
};

const toIsoWithOffset = (d) => {
  // returns YYYY-MM-DDTHH:mm:ss+05:30 (local offset)
  const pad = (n) => String(n).padStart(2, "0");
  const yy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  const offMin = -d.getTimezoneOffset(); // minutes ahead of UTC
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);

  return `${yy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${oh}:${om}`;
};

const Card = ({ title, subtitle, right, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {subtitle ? <div className="text-xs text-gray-500 mt-1">{subtitle}</div> : null}
      </div>
      {right ? <div className="text-xs text-gray-500 whitespace-nowrap">{right}</div> : null}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Pill = ({ tone = "gray", children }) => {
  const styles =
    tone === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${styles}`}>{children}</span>;
};
/* ---------- Invoice View Modal (clean template) ---------- */
const InvoiceViewModal = ({ open, inv, onClose }) => {
  if (!open || !inv) return null;

  const id = inv?.id;
  const status = String(inv?.status || "—").toUpperCase();
  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  const types = getInvoiceChargeTypes(inv);

  const totalsByType = types.map((t) => ({
    type: t,
    amount: invoiceTotalByType(inv, t),
  }));

  const grandTotal = invoiceTotalAll(inv);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-gray-900">Invoice</div>
              <Pill tone={statusTone(status)}>{status}</Pill>
              {id ? <Pill tone="gray">INV #{asStr(id)}</Pill> : null}
            </div>

            <div className="text-xs text-gray-500 mt-1">
              Lease: <b>{asStr(inv?.lease_id)}</b> • Tenant: <b>{asStr(inv?.tenant_id)}</b>
              {inv?.meta?.site_id ? ` • Site: ${asStr(inv.meta.site_id)}` : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              title="Print this invoice"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bill To */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Bill To</div>
              <div className="text-sm text-gray-900">
                Tenant #{asStr(inv?.tenant_id)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (If you have tenant name/address in API, show it here)
              </div>
            </div>

            {/* Invoice Details */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Invoice Details</div>
              <div className="text-xs text-gray-700 space-y-1">
                <div>
                  <span className="text-gray-500">Invoice #:</span>{" "}
                  <b className="text-gray-900">{asStr(inv?.id)}</b>
                </div>
                <div>
                  <span className="text-gray-500">Period:</span>{" "}
                  <b className="text-gray-900">
                    {asStr(inv?.period_start)} → {asStr(inv?.period_end)}
                  </b>
                </div>
                <div>
                  <span className="text-gray-500">Due Date:</span>{" "}
                  <b className="text-gray-900">{asStr(inv?.due_date)}</b>
                </div>
                <div>
                  <span className="text-gray-500">Lease #:</span>{" "}
                  <b className="text-gray-900">{asStr(inv?.lease_id)}</b>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Summary</div>

              <div className="flex flex-wrap gap-2 mb-3">
                {types.length ? (
                  types.map((t) => (
                    <Pill key={`type-${t}`} tone="gray">
                      {t}
                    </Pill>
                  ))
                ) : (
                  <Pill tone="gray">NO_TYPES</Pill>
                )}
              </div>

              <div className="text-sm text-gray-900">
                Grand Total: <b>₹ {fmtMoney(grandTotal)}</b>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Totals are derived from invoice lines.
              </div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
              <span>Line Items</span>
              <span className="text-gray-500">{lines.length} lines</span>
            </div>

            {lines.length ? (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((ln) => (
                      <tr key={ln.id}>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 font-medium">
                            {asStr(ln?.description || ln?.charge_type)}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            LineID: {asStr(ln?.id)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone="gray">{asStr(ln?.charge_type)}</Pill>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{asStr(ln?.unit_id || "—")}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ₹ {fmtMoney(ln?.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-gray-500">No lines.</div>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2" />

            <div className="border border-gray-200 rounded-md p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Totals</div>

              {totalsByType.length ? (
                <div className="space-y-2">
                  {totalsByType.map((x) => (
                    <div key={`tot-${x.type}`} className="flex justify-between text-sm">
                      <span className="text-gray-700">{x.type}</span>
                      <span className="font-semibold text-gray-900">₹ {fmtMoney(x.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-gray-700">Grand Total</span>
                    <span className="font-semibold text-gray-900">₹ {fmtMoney(grandTotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No charge types found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 text-[11px] text-gray-500">
          This is a UI preview template. Connect tenant/company details to render “Bill To / From” properly.
        </div>
      </div>
    </div>
  );
};

/* ---------- invoice helpers (use lines[].charge_type) ---------- */
const getInvoiceChargeTypes = (inv) => {
  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  const set = new Set();
  for (const ln of lines) {
    const t = String(ln?.charge_type || "").toUpperCase().trim();
    if (t) set.add(t);
  }
  return Array.from(set);
};

const invoiceHasType = (inv, type) => {
  const want = String(type || "").toUpperCase();
  if (!want || want === "ALL") return true;
  const types = getInvoiceChargeTypes(inv);
  return types.includes(want);
};

const invoiceTotalByType = (inv, type) => {
  const want = String(type || "").toUpperCase();
  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  const sum = lines.reduce((acc, ln) => {
    const t = String(ln?.charge_type || "").toUpperCase().trim();
    if (!want || want === "ALL" || t === want) return acc + (Number(ln?.amount) || 0);
    return acc;
  }, 0);
  return sum;
};

const invoiceTotalAll = (inv) => {
  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  return lines.reduce((acc, ln) => acc + (Number(ln?.amount) || 0), 0);
};

const statusTone = (st) => {
  const s = String(st || "").toUpperCase();
  if (s === "DRAFT") return "amber";
  if (s === "CANCELLED") return "red";
  return "green";
};

const isEditable = (inv) => String(inv?.status || "").toUpperCase() === "DRAFT";
const isPayable = (inv) => {
  const s = String(inv?.status || "").toUpperCase();
  return s === "ISSUED" || s === "PARTIALLY_PAID" || s === "PAID";
};

/* ---------- MAIN PAGE ---------- */
const CAMGeneratePage = () => {
  // ✅ tab toggle: GENERATE | VIEW
  const [tab, setTab] = useState("GENERATE");

  // reactive active ctx
  const [activeCtx, setActiveCtx] = useState(() => getActiveCtx());
  useEffect(() => {
    const sync = () => setActiveCtx(getActiveCtx());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("active-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("active-changed", sync);
    };
  }, []);

  // UI: expand/collapse invoice lines (keeps the list clean)
const [expandedIds, setExpandedIds] = useState(() => new Set());

const toggleExpanded = (id) => {
  setExpandedIds((prev) => {
    const next = new Set(prev);
    const key = Number(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
};


  const orgId = useMemo(() => Number(activeCtx?.orgId) || null, [activeCtx?.orgId]);

  // sites list from scope_tree (for ORG selection case)
  const sitesForOrg = useMemo(() => {
    const tree = activeCtx?.tree || readJSON("scope_tree", []);
    if (!orgId || !Array.isArray(tree)) return [];
    const org = tree.find((o) => String(o?.id) === String(orgId));
    const sites = Array.isArray(org?.sites) ? org.sites : [];
    return sites.map((s) => ({ id: Number(s.id), name: s.name || s.label || `Site ${s.id}` }));
  }, [activeCtx?.tree, orgId]);

  // selectedSiteId logic
  const storageKey = useMemo(() => (orgId ? `cam_selected_site_id_org_${orgId}` : "cam_selected_site_id"), [orgId]);

  const [selectedSiteId, setSelectedSiteId] = useState(() => {
    const ctx = getActiveCtx();
    if (ctx?.siteId) return Number(ctx.siteId) || null;
    const saved = localStorage.getItem(storageKey);
    return saved ? Number(saved) || null : null;
  });

  useEffect(() => {
    if (activeCtx?.siteId) {
      setSelectedSiteId(Number(activeCtx.siteId) || null);
      return;
    }
    if (!activeCtx?.siteId && sitesForOrg.length) {
      const saved = localStorage.getItem(storageKey);
      const savedNum = saved ? Number(saved) : null;
      const exists = savedNum && sitesForOrg.some((s) => String(s.id) === String(savedNum));
      if (exists) setSelectedSiteId(savedNum);
      else {
        setSelectedSiteId(sitesForOrg[0].id);
        localStorage.setItem(storageKey, String(sitesForOrg[0].id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCtx?.siteId, sitesForOrg.length, storageKey]);

  const siteId = useMemo(() => Number(selectedSiteId) || null, [selectedSiteId]);

  /* ---------- CAM generate form ---------- */
  const [mode, setMode] = useState("RATE"); // RATE | TOTAL
  const [periodStart, setPeriodStart] = useState("2025-12-01");
  const [periodEnd, setPeriodEnd] = useState("2025-12-31");
  const [ratePerSqft, setRatePerSqft] = useState("12.50");
  const [totalAmount, setTotalAmount] = useState("500000.00");
  const [basis, setBasis] = useState("OCCUPIED_AREA");
  const [dueDate, setDueDate] = useState("2026-01-05");
  const [autoIssue, setAutoIssue] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  // camGenerate returns {items:[...]}
  const rows = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.results)) return result.results;
    return [];
  }, [result]);

  const generateTotals = useMemo(() => {
    const sum = rows.reduce((acc, r) => acc + (Number(r?.cam_amount || 0) || 0), 0);
    return { count: rows.length, sum };
  }, [rows]);

  const validate = () => {
    if (!orgId) return "Active ORG not found. Please select ORG first.";
    if (!siteId) return "Please select SITE (CAM generate runs on site_id).";
    if (!periodStart || !periodEnd) return "Period start/end required.";
    if (mode === "RATE" && !ratePerSqft) return "rate_per_sqft required for RATE mode.";
    if (mode === "TOTAL" && !totalAmount) return "total_amount required for TOTAL mode.";
    if (mode === "TOTAL" && !basis) return "basis required for TOTAL mode.";
    return "";
  };

  const makePayload = (dryRun) => {
    const base = { site_id: siteId, period_start: periodStart, period_end: periodEnd, mode, dry_run: !!dryRun };
    if (mode === "RATE") base.rate_per_sqft = String(ratePerSqft);
    else {
      base.total_amount = String(totalAmount);
      base.basis = basis;
    }
    if (!dryRun) {
      if (dueDate) base.due_date = dueDate;
      if (autoIssue) base.auto_issue = true;
    }
    return base;
  };

  const preview = async () => {
    const v = validate();
    if (v) return setErr(v);
    setLoading(true);
    setErr("");
    setResult(null);
    try {
      const data = await billingAPI.camGenerate(makePayload(true));
      setResult(data);
    } catch (e) {
      setErr(e?.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- VIEW: INVOICES (SERVER FILTERS + UI FILTERS) ---------- */
  const [invLoading, setInvLoading] = useState(false);
  const [invErr, setInvErr] = useState("");
  const [allInvoices, setAllInvoices] = useState([]);

  // client-side dropdown type filter (lines.charge_type)
  const [showType, setShowType] = useState("CAM"); // ALL | CAM | RENT | PENALTY | OTHER

  // client-side toggles
  const [onlyThisSite, setOnlyThisSite] = useState(true);
  const [search, setSearch] = useState("");

  // ✅ Server-side filters (query params)
  const [fTenantId, setFTenantId] = useState(""); // selected tenant from dropdown
  const [fLeaseId, setFLeaseId] = useState(""); // selected lease from dropdown
  const [fStatus, setFStatus] = useState("");
  const [fPeriodStart, setFPeriodStart] = useState("");
  const [fPeriodEnd, setFPeriodEnd] = useState("");

  // selection (used for bulk issue + payment)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
// Invoice Preview Modal
const [viewInvOpen, setViewInvOpen] = useState(false);
const [viewInv, setViewInv] = useState(null);

const openInvoiceView = (inv) => {
  setViewInv(inv);
  setViewInvOpen(true);
};
const closeInvoiceView = () => {
  setViewInvOpen(false);
  setViewInv(null);
};

  // actions (edit/issue/payment)
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErr, setActionErr] = useState("");

  // Issue single modal
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueInv, setIssueInv] = useState(null);
  const [issueNote, setIssueNote] = useState("Approved and issued by admin");

  // Bulk issue modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState("IDS"); // IDS | SITE
  const [bulkIdsText, setBulkIdsText] = useState("");
  const [bulkNote, setBulkNote] = useState("Issuing bulk");
  const [bulkDryRun, setBulkDryRun] = useState(false);
  const [bulkChargeType, setBulkChargeType] = useState("CAM");
  const [bulkSiteId, setBulkSiteId] = useState("");
  const [bulkPeriodStart, setBulkPeriodStart] = useState("");
  const [bulkPeriodEnd, setBulkPeriodEnd] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editMetaSiteId, setEditMetaSiteId] = useState("");
  const [editLines, setEditLines] = useState([]); // editable copy
  const [editOrig, setEditOrig] = useState({}); // { due_date, meta_site_id, linesById: {id:{amount,description}} }

  // ✅ Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payResult, setPayResult] = useState(null);

  const [payTenantId, setPayTenantId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payReceivedOn, setPayReceivedOn] = useState(localDateYYYYMMDD(new Date()));
  const [payMode, setPayMode] = useState("BANK"); // CASH | BANK | UPI | CHEQUE | OTHER
  const [payReferenceNo, setPayReferenceNo] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payBankName, setPayBankName] = useState("");
  const [payReceivedAt, setPayReceivedAt] = useState(localDateTimeForInput(new Date()));

  // allocations rows
  const [payAllocRows, setPayAllocRows] = useState([]); // [{key, invoice_id, invoice_line_id, description, charge_type, line_amount, allocated_amount}]

  const buildInvoiceQueryParams = () => {
    const params = {};
    if (String(fTenantId || "").trim()) params.tenant_id = String(fTenantId).trim();
    if (String(fLeaseId || "").trim()) params.lease_id = String(fLeaseId).trim();
    if (String(fStatus || "").trim()) params.status = String(fStatus).trim();
    if (fPeriodStart) params.period_start = fPeriodStart;
    if (fPeriodEnd) params.period_end = fPeriodEnd;
    return params;
  };

  const loadInvoices = async (paramsOverride = null) => {
    setInvLoading(true);
    setInvErr("");
    setActionErr("");
    try {
      const params = paramsOverride ? paramsOverride : buildInvoiceQueryParams();
      const data = await billingAPI.listInvoices(params);
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setAllInvoices(list);

      // keep selection only for still-visible
      setSelectedIds((prev) => {
        const next = new Set();
        const visible = new Set(list.map((x) => String(x?.id)));
        for (const id of prev) if (visible.has(String(id))) next.add(Number(id));
        return next;
      });
    } catch (e) {
      setAllInvoices([]);
      setInvErr(e?.message || "Failed to load invoices");
    } finally {
      setInvLoading(false);
    }
  };

  const applyServerFilters = async () => {
    await loadInvoices(buildInvoiceQueryParams());
  };

  const clearFilters = async () => {
    setFTenantId("");
    setFLeaseId("");
    setFStatus("");
    setFPeriodStart("");
    setFPeriodEnd("");
    setSearch("");
    setOnlyThisSite(true);
    setShowType("CAM");
    setSelectedIds(new Set());
    await loadInvoices({});
  };

  const generate = async () => {
    const v = validate();
    if (v) return setErr(v);
    setLoading(true);
    setErr("");
    try {
      const data = await billingAPI.camGenerate(makePayload(false));
      setResult(data);
    } catch (e) {
      setErr(e?.message || "Generate failed");
    } finally {
      setLoading(false);
    }
  };

  // Load invoices when view opens (with current server filters)
  useEffect(() => {
    if (orgId && tab === "VIEW") loadInvoices(buildInvoiceQueryParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, tab]);

  /* ----------------------------
     ✅ Tenant/Lease DROPDOWNS
  ---------------------------- */
  const tenantToLeases = useMemo(() => {
    const m = new Map(); // tenantId -> Set(leaseId)
    for (const inv of allInvoices || []) {
      const t = inv?.tenant_id;
      const l = inv?.lease_id;
      if (t == null || l == null) continue;
      const tk = String(t);
      const lk = String(l);
      if (!m.has(tk)) m.set(tk, new Set());
      m.get(tk).add(lk);
    }
    return m;
  }, [allInvoices]);

  const leaseToTenants = useMemo(() => {
    const m = new Map(); // leaseId -> Set(tenantId)
    for (const inv of allInvoices || []) {
      const t = inv?.tenant_id;
      const l = inv?.lease_id;
      if (t == null || l == null) continue;
      const tk = String(t);
      const lk = String(l);
      if (!m.has(lk)) m.set(lk, new Set());
      m.get(lk).add(tk);
    }
    return m;
  }, [allInvoices]);

  const tenantOptions = useMemo(() => {
    const set = new Set();
    for (const inv of allInvoices || []) {
      if (inv?.tenant_id == null) continue;
      const tid = String(inv.tenant_id);
      if (fLeaseId && leaseToTenants.has(String(fLeaseId))) {
        if (!leaseToTenants.get(String(fLeaseId)).has(tid)) continue;
      }
      set.add(tid);
    }
    return Array.from(set)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .map(String);
  }, [allInvoices, fLeaseId, leaseToTenants]);

  const leaseOptions = useMemo(() => {
    const set = new Set();
    for (const inv of allInvoices || []) {
      if (inv?.lease_id == null) continue;
      const lid = String(inv.lease_id);
      if (fTenantId && tenantToLeases.has(String(fTenantId))) {
        if (!tenantToLeases.get(String(fTenantId)).has(lid)) continue;
      }
      set.add(lid);
    }
    return Array.from(set)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .map(String);
  }, [allInvoices, fTenantId, tenantToLeases]);

  const onChangeTenant = (nextTenantId) => {
    const t = String(nextTenantId || "");
    setFTenantId(t);

    const curLease = String(fLeaseId || "");
    if (t && curLease) {
      const ok = tenantToLeases.get(t)?.has(curLease);
      if (!ok) setFLeaseId("");
    }
  };

  const onChangeLease = (nextLeaseId) => {
    const l = String(nextLeaseId || "");
    setFLeaseId(l);

    const curTenant = String(fTenantId || "");
    if (l && curTenant) {
      const ok = leaseToTenants.get(l)?.has(curTenant);
      if (!ok) setFTenantId("");
    }
  };

  const filteredInvoices = useMemo(() => {
    let list = [...(allInvoices || [])];

    if (onlyThisSite && siteId) {
      list = list.filter((inv) => String(inv?.meta?.site_id || "") === String(siteId));
    }

    if (showType && showType !== "ALL") {
      list = list.filter((inv) => invoiceHasType(inv, showType));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((inv) => {
        const id = String(inv?.id ?? "");
        const tenant = String(inv?.tenant_id ?? "");
        const lease = String(inv?.lease_id ?? "");
        return id.toLowerCase().includes(q) || tenant.toLowerCase().includes(q) || lease.toLowerCase().includes(q);
      });
    }

    list.sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0));
    return list;
  }, [allInvoices, onlyThisSite, siteId, showType, search]);

  const invSummary = useMemo(() => {
    const count = filteredInvoices.length;
    const sum = filteredInvoices.reduce((acc, inv) => {
      if (showType && showType !== "ALL") return acc + (Number(invoiceTotalByType(inv, showType)) || 0);
      return acc + (Number(invoiceTotalAll(inv)) || 0);
    }, 0);
    return { count, sum };
  }, [filteredInvoices, showType]);

  const selectedInvoices = useMemo(() => {
    const set = selectedIds || new Set();
    return (filteredInvoices || []).filter((inv) => set.has(Number(inv?.id)));
  }, [filteredInvoices, selectedIds]);

  const selectedDraftIds = useMemo(() => {
    return selectedInvoices.filter(isEditable).map((x) => Number(x.id));
  }, [selectedInvoices]);

  const selectedPayableInvoices = useMemo(() => {
    return selectedInvoices.filter(isPayable);
  }, [selectedInvoices]);

  /* ---------- selection ---------- */
  const toggleSelect = (invoiceId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = Number(invoiceId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisibleDrafts = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const inv of filteredInvoices) {
        if (isEditable(inv)) next.add(Number(inv.id));
      }
      return next;
    });
  };

  const selectAllVisiblePayable = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const inv of filteredInvoices) {
        if (isPayable(inv)) next.add(Number(inv.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ---------- issue single ---------- */
  const openIssue = (inv) => {
    if (!isEditable(inv)) return;
    setIssueInv(inv);
    setIssueNote("Approved and issued by admin");
    setIssueOpen(true);
    setActionErr("");
  };
  const closeIssue = () => {
    setIssueOpen(false);
    setIssueInv(null);
    setIssueNote("Approved and issued by admin");
  };

  const doIssueSingle = async () => {
    if (!issueInv?.id) return;
    if (!isEditable(issueInv)) return;

    setActionLoading(true);
    setActionErr("");
    try {
      await billingAPI.issueInvoice(issueInv.id, { issue: true, note: issueNote });
      closeIssue();
      await loadInvoices(buildInvoiceQueryParams());
    } catch (e) {
      setActionErr(e?.message || "Issue failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- bulk issue ---------- */
  const openBulk = (prefillIds = null) => {
    setBulkResult(null);
    setBulkDryRun(false);
    setBulkNote("Issuing bulk");

    if (prefillIds && prefillIds.length) {
      setBulkMode("IDS");
      setBulkIdsText(prefillIds.join(","));
    } else {
      setBulkMode("IDS");
      setBulkIdsText("");
    }

    setBulkSiteId(siteId ? String(siteId) : "");
    setBulkPeriodStart(periodStart || "");
    setBulkPeriodEnd(periodEnd || "");
    setBulkChargeType(showType && showType !== "ALL" ? showType : "CAM");

    setBulkOpen(true);
    setActionErr("");
  };

  const openBulkFromSelection = () => {
    const ids = selectedDraftIds;
    if (!ids.length) {
      setActionErr("Select at least one DRAFT invoice for Bulk Issue (checkbox selection can include non-drafts too).");
      return;
    }
    openBulk(ids);
  };

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkResult(null);
  };

  const parseIds = (txt) => {
    const parts = String(txt || "")
      .split(/[, \n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const nums = [];
    for (const p of parts) {
      const n = Number(p);
      if (Number.isFinite(n)) nums.push(n);
    }
    return Array.from(new Set(nums));
  };

  const submitBulk = async () => {
    setActionLoading(true);
    setActionErr("");
    setBulkResult(null);

    try {
      let payload = { note: bulkNote };
      if (bulkDryRun) payload.dry_run = true;

      if (bulkMode === "IDS") {
        const invoiceIds = parseIds(bulkIdsText);
        if (!invoiceIds.length) throw new Error("Please provide invoice_ids for bulk issue.");
        payload.invoice_ids = invoiceIds;
      } else {
        if (!bulkSiteId) throw new Error("site_id required for site+period bulk issue.");
        if (!bulkPeriodStart || !bulkPeriodEnd) throw new Error("period_start and period_end required for site+period bulk issue.");
        payload.site_id = Number(bulkSiteId);
        payload.period_start = bulkPeriodStart;
        payload.period_end = bulkPeriodEnd;
        payload.charge_type = bulkChargeType || "CAM";
      }

      const res = await billingAPI.issueBulkInvoices(payload);
      setBulkResult(res);

      if (!bulkDryRun) {
        await loadInvoices(buildInvoiceQueryParams());
        clearSelection();
      }
    } catch (e) {
      setActionErr(e?.message || "Bulk issue failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- edit (PATCH invoice + PATCH line) ---------- */
  const openEdit = (inv) => {
    if (!isEditable(inv)) return;
    setActionErr("");

    setEditInv(inv);
    setEditDueDate(asStr(inv?.due_date || ""));
    setEditMetaSiteId(asStr(inv?.meta?.site_id || ""));

    const lines = Array.isArray(inv?.lines) ? inv.lines : [];
    const editableLines = lines.map((ln) => ({
      id: ln?.id,
      charge_type: asStr(ln?.charge_type),
      unit_id: asStr(ln?.unit_id || ""),
      description: asStr(ln?.description || ln?.charge_type),
      amount: String(ln?.amount ?? ""),
    }));
    setEditLines(editableLines);

    const linesById = {};
    for (const ln of editableLines) {
      if (ln?.id) {
        linesById[String(ln.id)] = { amount: String(ln.amount ?? ""), description: String(ln.description ?? "") };
      }
    }

    setEditOrig({
      due_date: asStr(inv?.due_date || ""),
      meta_site_id: asStr(inv?.meta?.site_id || ""),
      linesById,
    });

    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditInv(null);
    setEditDueDate("");
    setEditMetaSiteId("");
    setEditLines([]);
    setEditOrig({});
  };

  const saveEdit = async () => {
    if (!editInv?.id) return;
    if (!isEditable(editInv)) return;

    setActionLoading(true);
    setActionErr("");

    try {
      // 1) patch invoice if due/meta changed
      const invPatch = {};
      const dueChanged = String(editDueDate || "") !== String(editOrig?.due_date || "");
      const siteChanged = String(editMetaSiteId || "") !== String(editOrig?.meta_site_id || "");

      if (dueChanged) invPatch.due_date = editDueDate || null;
      if (siteChanged) invPatch.meta = { site_id: editMetaSiteId ? Number(editMetaSiteId) : null };

      if (Object.keys(invPatch).length) {
        await billingAPI.patchInvoice(editInv.id, invPatch);
      }

      // 2) patch invoice lines (amount/description)
      const updates = [];
      for (const ln of editLines) {
        if (!ln?.id) continue;
        const orig = editOrig?.linesById?.[String(ln.id)];
        const a0 = String(orig?.amount ?? "");
        const d0 = String(orig?.description ?? "");
        const a1 = String(ln.amount ?? "");
        const d1 = String(ln.description ?? "");

        if (a1 !== a0 || d1 !== d0) {
          const payload = {};
          if (a1 !== a0) payload.amount = a1 === "" ? null : String(a1);
          if (d1 !== d0) payload.description = d1;
          updates.push(billingAPI.patchInvoiceLine(ln.id, payload));
        }
      }

      if (updates.length) await Promise.all(updates);

      closeEdit();
      await loadInvoices(buildInvoiceQueryParams());
    } catch (e) {
      setActionErr(e?.message || "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- PAYMENT (receive-and-allocate) ---------- */
  const closePay = () => {
    setPayOpen(false);
    setPayErr("");
    setPayResult(null);
    setPayTenantId("");
    setPayAmount("");
    setPayReceivedOn(localDateYYYYMMDD(new Date()));
    setPayMode("BANK");
    setPayReferenceNo("");
    setPayNote("");
    setPayBankName("");
    setPayReceivedAt(localDateTimeForInput(new Date()));
    setPayAllocRows([]);
  };

  const autoAllocateToAmount = (amountStr, baseRows) => {
    const amt = Number(amountStr);
    const total = isFinite(amt) ? Math.max(0, amt) : 0;
    let remaining = total;

    const next = (baseRows || []).map((r) => ({ ...r, allocated_amount: "0.00" }));
    for (let i = 0; i < next.length; i++) {
      if (remaining <= 0) break;
      const max = Number(next[i].line_amount) || 0;
      const take = Math.min(max, remaining);
      next[i].allocated_amount = to2(take);
      remaining -= take;
    }
    return next;
  };

  const openPayFromSelection = () => {
    setPayErr("");
    setPayResult(null);

    const invoices = selectedPayableInvoices;
    if (!invoices.length) {
      setActionErr("Select at least one ISSUED / PARTIALLY_PAID / PAID invoice to receive payment.");
      return;
    }

    // enforce single tenant
    const tenantSet = new Set(invoices.map((x) => String(x?.tenant_id || "")).filter(Boolean));
    if (tenantSet.size !== 1) {
      setActionErr("Payment allocation must be for ONE tenant only. Selected invoices have multiple tenant_id.");
      return;
    }

    const tenantId = Array.from(tenantSet)[0];
    // build allocation rows from invoice lines (all lines from selected invoices)
    const rows = [];
    for (const inv of invoices) {
      const invId = inv?.id;
      const lines = Array.isArray(inv?.lines) ? inv.lines : [];
      for (const ln of lines) {
        if (!ln?.id) continue;
        rows.push({
          key: `${invId}:${ln.id}`,
          invoice_id: Number(invId),
          invoice_line_id: Number(ln.id),
          description: asStr(ln?.description || ln?.charge_type || "Line"),
          charge_type: asStr(ln?.charge_type || ""),
          line_amount: to2(ln?.amount ?? 0),
          allocated_amount: to2(ln?.amount ?? 0), // default full allocation
        });
      }
    }

    if (!rows.length) {
      setActionErr("Selected invoices have no invoice lines. Cannot allocate payment.");
      return;
    }

    // default amount = sum of all line amounts (so user can just submit for full payment)
    const sum = rows.reduce((acc, r) => acc + (Number(r?.line_amount) || 0), 0);

    setPayTenantId(tenantId);
    setPayAmount(to2(sum));
    setPayReceivedOn(localDateYYYYMMDD(new Date()));
    setPayMode("BANK");
    setPayReferenceNo("");
    setPayNote("");
    setPayBankName("");
    setPayReceivedAt(localDateTimeForInput(new Date()));
    setPayAllocRows(rows);

    setPayOpen(true);
  };

  const paySummary = useMemo(() => {
    const allocSum = (payAllocRows || []).reduce((acc, r) => acc + (Number(r?.allocated_amount) || 0), 0);
    const amt = Number(payAmount) || 0;
    return { allocSum, amt, diff: (Number(amt) || 0) - (Number(allocSum) || 0) };
  }, [payAllocRows, payAmount]);

  const submitPayment = async () => {
    setPayErr("");
    setPayResult(null);
    setActionErr("");

    try {
      if (!payTenantId) throw new Error("tenant_id is missing.");
      const amountNum = Number(payAmount);
      if (!isFinite(amountNum) || amountNum <= 0) throw new Error("Payment amount must be > 0.");
      if (!payReceivedOn) throw new Error("received_on is required.");
      if (!payMode) throw new Error("mode is required.");

      const allocs = (payAllocRows || [])
        .map((r) => ({
          invoice_line_id: r.invoice_line_id,
          allocated_amount: to2(r.allocated_amount),
          max_amount: Number(r.line_amount) || 0,
        }))
        .filter((a) => (Number(a.allocated_amount) || 0) > 0);

      if (!allocs.length) throw new Error("Please allocate amount to at least one invoice line.");

      // validations: sum allocations == amount (2 decimals)
      const allocSum = allocs.reduce((acc, a) => acc + (Number(a.allocated_amount) || 0), 0);
      const amt2 = Number(to2(amountNum));
      const sum2 = Number(to2(allocSum));
      if (sum2 !== amt2) {
        throw new Error(`Allocated total (₹ ${to2(sum2)}) must equal Payment amount (₹ ${to2(amt2)}).`);
      }

      // validations: per line cannot exceed line_amount (max)
      for (const a of allocs) {
        const v = Number(a.allocated_amount) || 0;
        if (v < 0) throw new Error("Allocated amount cannot be negative.");
        if (v - (a.max_amount || 0) > 0.00001) {
          throw new Error(`Allocated amount cannot exceed line amount. (line_id: ${a.invoice_line_id})`);
        }
      }

      // build payload (exact structure you shared)
      const receivedAtISO = payReceivedAt ? toIsoWithOffset(new Date(payReceivedAt)) : null;

      const payload = {
        payment: {
          tenant_id: Number(payTenantId),
          amount: to2(payAmount),
          received_on: payReceivedOn,
          mode: String(payMode).toUpperCase(),
          reference_no: payReferenceNo || "",
          note: payNote || "",
          meta: {
            ...(payBankName ? { bank_name: payBankName } : {}),
            ...(receivedAtISO ? { received_at: receivedAtISO } : {}),
          },
        },
        allocations: allocs.map((a) => ({
          invoice_line_id: Number(a.invoice_line_id),
          allocated_amount: to2(a.allocated_amount),
        })),
      };

      setActionLoading(true);

      // IMPORTANT: method name must match what you added in api.js
      // Example: billingAPI.receiveAndAllocatePayment(payload)
      if (typeof billingAPI.receiveAndAllocatePayment !== "function") {
        throw new Error(
          "billingAPI.receiveAndAllocatePayment(...) not found. Please ensure api.js exports this method with the same name."
        );
      }

      const res = await billingAPI.receiveAndAllocatePayment(payload);
      setPayResult(res);

      // refresh invoices (to update paid/partial statuses)
      await loadInvoices(buildInvoiceQueryParams());
      // keep modal open to show response; user can close.
    } catch (e) {
      setPayErr(e?.message || "Payment failed");
    } finally {
      setActionLoading(false);
    }
  };

  const HeaderRight = useMemo(() => {
    if (loading || invLoading || actionLoading) return "Working...";
    if (!orgId) return "ORG not selected";
    return `ORG: ${orgId}${siteId ? ` • SITE: ${siteId}` : ""}`;
  }, [loading, invLoading, actionLoading, orgId, siteId]);




  

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <Card
        title="Billing"
        right={HeaderRight}
      >
        {/* ORG warning */}
        {!orgId ? (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm">
            Active <b>ORG</b> not found in localStorage <b>active</b>. Select organization first.
          </div>
        ) : null}

        {/* SITE Picker (common for both tabs) */}
        {orgId ? (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
              <select
                value={siteId || ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedSiteId(v);
                  if (v) localStorage.setItem(storageKey, String(v));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">Select Site</option>
                {sitesForOrg.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (#{s.id})
                  </option>
                ))}
              </select>
             
            </div>

            <div className="flex items-end gap-2">
              <Pill tone={siteId ? "green" : "amber"}>{siteId ? "SITE ready" : "Select SITE"}</Pill>
              <Pill>{activeCtx?.scopeType || "—"}</Pill>
            </div>
          </div>
        ) : null}

        {/* ✅ TOGGLES */}
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => setTab("GENERATE")}
            className={`px-3 py-2 text-sm rounded-md border ${
              tab === "GENERATE"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Generation
          </button>

          <button
            onClick={() => setTab("VIEW")}
            className={`px-3 py-2 text-sm rounded-md border ${
              tab === "VIEW"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            View Invoices
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Pill tone={tab === "GENERATE" ? "amber" : "green"}>{tab}</Pill>
          </div>
        </div>

        {/* =========================
            TAB: GENERATION
           ========================= */}
        {tab === "GENERATE" ? (
          <>
            {/* CAM Generate controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="RATE">RATE (per sqft)</option>
                  <option value="TOTAL">TOTAL (split)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date (generate)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {mode === "RATE" ? (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rate per sqft</label>
                  <input
                    type="number"
                    value={ratePerSqft}
                    onChange={(e) => setRatePerSqft(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="12.50"
                  />
                </div>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount</label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="500000.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Basis</label>
                    <select
                      value={basis}
                      onChange={(e) => setBasis(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="OCCUPIED_AREA">OCCUPIED_AREA</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 md:col-span-4 mt-1">
                <input id="autoIssue" type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)} />
                <label htmlFor="autoIssue" className="text-sm text-gray-700">
                  Auto Issue
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={preview}
                disabled={!orgId || !siteId || loading}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
              >
                Preview (dry run)
              </button>

              <button
                onClick={generate}
                disabled={!orgId || !siteId || loading}
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Generate CAM Invoices
              </button>

              <div className="ml-auto flex items-center gap-2">
                <Pill tone={siteId ? "green" : "amber"}>{siteId ? "SITE selected" : "Select SITE"}</Pill>
                <Pill tone="gray">{mode}</Pill>
              </div>
            </div>

            {err ? <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{err}</div> : null}

            {/* Generate Result */}
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                <span>Generate Result</span>
                <span className="text-gray-500">
                  {generateTotals.count ? `${generateTotals.count} items • ₹ ${fmtMoney(generateTotals.sum)}` : "No data"}
                </span>
              </div>

              {loading ? (
                <div className="px-4 py-4 text-sm text-gray-500">Loading...</div>
              ) : rows.length ? (
                <div className="divide-y divide-gray-200">
                  {rows.map((r, idx) => {
                    const invoiceId = r?.invoice_id || null;
                    return (
                      <div key={`${r?.lease_id}-${r?.tenant_id}-${idx}`} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 truncate">Lease #{asStr(r?.lease_id)}</div>
                            <Pill tone={invoiceId ? "green" : "amber"}>{invoiceId ? "CREATED" : "DRY_RUN"}</Pill>
                            {invoiceId ? <Pill tone="gray">Invoice #{asStr(invoiceId)}</Pill> : null}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate">Tenant: {asStr(r?.tenant_id)}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">₹ {fmtMoney(r?.cam_amount)}</div>
                          <div className="text-xs text-gray-500">CAM</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-4 text-sm text-gray-500">Run Preview / Generate to see result.</div>
              )}
            </div>
          </>
        ) : null}

        {/* =========================
            TAB: VIEW INVOICES
           ========================= */}
        {tab === "VIEW" ? (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                <span>Invoices</span>
                <span className="text-gray-500">{invLoading ? "Loading..." : `${invSummary.count} shown • ₹ ${fmtMoney(invSummary.sum)}`}</span>
              </div>

              {/* SERVER FILTERS + UI FILTERS */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white space-y-4">
                {/* Server-side filters row */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">tenant_id (API)</label>
                    <select
                      value={fTenantId}
                      onChange={(e) => onChangeTenant(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      disabled={invLoading}
                    >
                      <option value="">Any</option>
                      {tenantOptions.map((tid) => (
                        <option key={tid} value={tid}>
                          Tenant #{tid}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">lease_id (API)</label>
                    <select
                      value={fLeaseId}
                      onChange={(e) => onChangeLease(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      disabled={invLoading}
                    >
                      <option value="">Any</option>
                      {leaseOptions.map((lid) => (
                        <option key={lid} value={lid}>
                          Lease #{lid}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">status (API)</label>
                    <select
                      value={fStatus}
                      onChange={(e) => setFStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">Any</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ISSUED">ISSUED</option>
                      <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                      <option value="PAID">PAID</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">period_start (API)</label>
                    <input
                      type="date"
                      value={fPeriodStart}
                      onChange={(e) => setFPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">period_end (API)</label>
                    <input
                      type="date"
                      value={fPeriodEnd}
                      onChange={(e) => setFPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={applyServerFilters}
                      disabled={invLoading}
                      className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Apply
                    </button>
                    <button
                      onClick={clearFilters}
                      disabled={invLoading}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Client-side filters row */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Show (UI)</label>
                    <select
                      value={showType}
                      onChange={(e) => setShowType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="ALL">ALL</option>
                      <option value="CAM">CAM</option>
                      <option value="RENT">RENT</option>
                      <option value="PENALTY">PENALTY</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Search (UI)</label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Invoice / Tenant / Lease"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <input id="onlyThisSite" type="checkbox" checked={onlyThisSite} onChange={(e) => setOnlyThisSite(e.target.checked)} />
                    <label htmlFor="onlyThisSite" className="text-sm text-gray-700">
                      Only this site (UI)
                    </label>
                  </div>

                  <div className="flex items-end gap-2 justify-end">
                    <button
                      onClick={() => loadInvoices(buildInvoiceQueryParams())}
                      disabled={invLoading}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                    >
                      {invLoading ? "Refreshing..." : "Refresh"}
                    </button>

                    <button
                      onClick={openBulkFromSelection}
                      disabled={actionLoading}
                      className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      title="Bulk issue only DRAFT invoices from your selection"
                    >
                      Issue
                    </button>

                    <button
                      onClick={openPayFromSelection}
                      disabled={actionLoading}
                      className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                      title="Receive payment and allocate to selected invoices (single tenant)"
                    >
                      Payment
                    </button>
                  </div>
                </div>
                

                {/* selection helpers */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={selectAllVisibleDrafts}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    disabled={invLoading}
                    title="Select visible DRAFT invoices (for issuing)"
                  >
                    Select all DRAFT (visible)
                  </button>

                  
                  <button
                    onClick={selectAllVisiblePayable}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    disabled={invLoading}
                    title="Select visible ISSUED/PARTIALLY_PAID/PAID invoices (for payment)"
                  >
                    Select all Payable (visible)
                  </button>

                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    disabled={invLoading}
                  >
                    Clear selection
                  </button>

                  <div className="text-xs text-gray-600 ml-auto">
                    Selected: <b>{selectedIds.size}</b>{" "}
                    <span className="text-gray-400">
                      (Draft: {selectedDraftIds.length} • Payable: {selectedPayableInvoices.length})
                    </span>
                  </div>
                </div>

                {/* quick hint */}
                
              </div>

              {invErr ? <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">{invErr}</div> : null}
              {actionErr ? <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">{actionErr}</div> : null}

              {invLoading ? (
  <div className="px-4 py-4 text-sm text-gray-500">Loading invoices...</div>
) : filteredInvoices.length ? (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr className="text-xs font-semibold text-gray-600">
          <th className="px-3 py-3 w-10"></th>
          <th className="px-3 py-3 text-left">Invoice</th>
          <th className="px-3 py-3 text-left">Tenant</th>
          <th className="px-3 py-3 text-left">Lease</th>
          <th className="px-3 py-3 text-left">Site</th>
          <th className="px-3 py-3 text-left">Period</th>
          <th className="px-3 py-3 text-left">Due</th>
          <th className="px-3 py-3 text-left">Status</th>
          <th className="px-3 py-3 text-left">Type</th>
          <th className="px-3 py-3 text-right">Total</th>
          <th className="px-3 py-3 text-right">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200 bg-white">
        {filteredInvoices.map((inv) => {
          const id = inv?.id;
          const status = String(inv?.status || "—").toUpperCase();
          const types = getInvoiceChargeTypes(inv);
          const total = showType !== "ALL" ? invoiceTotalByType(inv, showType) : invoiceTotalAll(inv);
          const isOpen = expandedIds.has(Number(id));

          // Compact type summary: show 1 pill + "+N"
          const typeSummary =
            showType !== "ALL" ? (
              <Pill tone="gray">{showType}</Pill>
            ) : types.length ? (
              <div className="flex items-center gap-2">
                <Pill tone="gray">{types[0]}</Pill>
                {types.length > 1 ? <span className="text-[11px] text-gray-500">+{types.length - 1}</span> : null}
              </div>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            );

          return (
            <React.Fragment key={id}>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(Number(id))}
                    onChange={() => toggleSelect(id)}
                    title="Select invoice (used for Bulk Issue and Payment)"
                  />
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-gray-900">INV #{asStr(id)}</div>
                  <button
                    onClick={() => toggleExpanded(id)}
                    className="mt-1 text-[11px] text-blue-600 hover:underline"
                  >
                    {isOpen ? "Hide lines" : "View lines"}
                  </button>
                </td>

                <td className="px-3 py-3 align-top text-gray-700">#{asStr(inv?.tenant_id)}</td>
                <td className="px-3 py-3 align-top text-gray-700">#{asStr(inv?.lease_id)}</td>
                <td className="px-3 py-3 align-top text-gray-700">{asStr(inv?.meta?.site_id || "—")}</td>

                <td className="px-3 py-3 align-top text-xs text-gray-700 whitespace-nowrap">
                  {asStr(inv?.period_start)} <span className="text-gray-400">→</span> {asStr(inv?.period_end)}
                </td>

                <td className="px-3 py-3 align-top text-xs text-gray-700 whitespace-nowrap">
                  {asStr(inv?.due_date || "—")}
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <Pill tone={statusTone(status)}>{asStr(status)}</Pill>
                    {isPayable(inv) ? <span className="text-[11px] text-green-700">Payable</span> : null}
                    {isEditable(inv) ? <span className="text-[11px] text-amber-700">Draft</span> : null}
                  </div>
                </td>

                <td className="px-3 py-3 align-top">{typeSummary}</td>

                <td className="px-3 py-3 align-top text-right">
                  <div className="font-semibold text-gray-900 whitespace-nowrap">₹ {fmtMoney(total)}</div>
                  <div className="text-[11px] text-gray-500">
                    {showType === "ALL" ? "Invoice Total" : `${showType} Total`}
                  </div>
                </td>

                <td className="px-3 py-3 align-top text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => openEdit(inv)}
                      disabled={!isEditable(inv) || actionLoading}
                      className={`px-2 py-1 text-xs rounded border ${
                        isEditable(inv)
                          ? "border-gray-300 hover:bg-gray-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      title={isEditable(inv) ? "Edit (DRAFT only)" : "Cannot edit after ISSUED"}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => openIssue(inv)}
                      disabled={!isEditable(inv) || actionLoading}
                      className={`px-2 py-1 text-xs rounded ${
                        isEditable(inv)
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                      title={isEditable(inv) ? "Issue invoice" : "Only DRAFT can be issued"}
                    >
                      Issue
                    </button>

                    <button
                      onClick={() => openInvoiceView(inv)}
                      className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>

              {/* Expandable lines row */}
              {isOpen ? (
                <tr className="bg-gray-50">
                  <td colSpan={11} className="px-4 py-4">
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                        <span>Invoice Lines</span>
                        <span className="text-gray-500">
                          {Array.isArray(inv?.lines) ? `${inv.lines.length} lines` : "0 lines"}
                        </span>
                      </div>

                      {Array.isArray(inv?.lines) && inv.lines.length ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-white border-b">
                              <tr className="text-xs text-gray-500">
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Unit</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {inv.lines
                                .filter((ln) =>
                                  showType === "ALL"
                                    ? true
                                    : String(ln?.charge_type || "").toUpperCase() === showType
                                )
                                .map((ln) => (
                                  <tr key={ln.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <div className="font-medium text-gray-900">
                                        {asStr(ln?.description || ln?.charge_type)}
                                      </div>
                                      <div className="text-[11px] text-gray-500">
                                        LineID: {asStr(ln?.id)}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <Pill tone="gray">{asStr(ln?.charge_type)}</Pill>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{asStr(ln?.unit_id || "—")}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                      ₹ {fmtMoney(ln?.amount)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-gray-500">No lines.</div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  </div>
) : (
  <div className="px-4 py-4 text-sm text-gray-500">No invoices match your selection.</div>
)}

            </div>

           

            {/* -------- Issue Single Modal -------- */}
            {issueOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white w-full max-w-lg rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Issue Invoice #{asStr(issueInv?.id)}</div>
                      <div className="text-xs text-gray-500">POST /api/billing/{asStr(issueInv?.id)}/invoices/issue/</div>
                    </div>
                    <button onClick={closeIssue} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">
                      Close
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {!isEditable(issueInv) ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm">
                        Only <b>DRAFT</b> invoices can be issued.
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                      <textarea
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={closeIssue} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={doIssueSingle}
                      disabled={!isEditable(issueInv) || actionLoading}
                      className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {actionLoading ? "Issuing..." : "Issue"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* -------- Bulk Issue Modal -------- */}
            {bulkOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Issue Bulk</div>
                      <div className="text-xs text-gray-500">POST /api/billing/invoices/issue-bulk/</div>
                    </div>
                    <button onClick={closeBulk} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">
                      Close
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBulkMode("IDS")}
                        className={`px-3 py-2 text-sm rounded border ${
                          bulkMode === "IDS" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        By Invoice IDs
                      </button>
                      <button
                        onClick={() => setBulkMode("SITE")}
                        className={`px-3 py-2 text-sm rounded border ${
                          bulkMode === "SITE" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        By Site + Period
                      </button>

                      <div className="ml-auto flex items-center gap-2">
                        <input id="bulkDryRun" type="checkbox" checked={bulkDryRun} onChange={(e) => setBulkDryRun(e.target.checked)} />
                        <label htmlFor="bulkDryRun" className="text-sm text-gray-700">
                          dry_run (preview)
                        </label>
                      </div>
                    </div>

                    {bulkMode === "IDS" ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">invoice_ids</label>
                        <textarea
                          value={bulkIdsText}
                          onChange={(e) => setBulkIdsText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={3}
                          placeholder="101,102,103"
                        />
                        <div className="text-[11px] text-gray-500 mt-1">You can paste comma/space/newline separated IDs.</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">site_id</label>
                          <input
                            value={bulkSiteId}
                            onChange={(e) => setBulkSiteId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="10"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">period_start</label>
                          <input
                            type="date"
                            value={bulkPeriodStart}
                            onChange={(e) => setBulkPeriodStart(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">period_end</label>
                          <input
                            type="date"
                            value={bulkPeriodEnd}
                            onChange={(e) => setBulkPeriodEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">charge_type</label>
                          <select
                            value={bulkChargeType}
                            onChange={(e) => setBulkChargeType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="CAM">CAM</option>
                            <option value="RENT">RENT</option>
                            <option value="PENALTY">PENALTY</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">note</label>
                      <input
                        value={bulkNote}
                        onChange={(e) => setBulkNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Issuing bulk"
                      />
                    </div>

                    {bulkResult ? (
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs overflow-auto max-h-56">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(bulkResult, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={closeBulk} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={submitBulk}
                      disabled={actionLoading}
                      className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {actionLoading ? (bulkDryRun ? "Previewing..." : "Issuing...") : bulkDryRun ? "Preview" : "Issue Bulk"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* -------- Edit Modal -------- */}
            {editOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Edit Invoice #{asStr(editInv?.id)}</div>
                      <div className="text-xs text-gray-500">
                        PATCH /api/billing/{asStr(editInv?.id)}/invoices/ and PATCH /api/billing/{`{invoice_line_id}`}/invoice-lines/
                      </div>
                    </div>
                    <button onClick={closeEdit} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">
                      Close
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {!isEditable(editInv) ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm">
                        This invoice is <b>{asStr(editInv?.status)}</b>. Once ISSUED, it cannot be edited.
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">due_date</label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          disabled={!isEditable(editInv)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">meta.site_id</label>
                        <input
                          value={editMetaSiteId}
                          onChange={(e) => setEditMetaSiteId(e.target.value)}
                          disabled={!isEditable(editInv)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="10"
                        />
                      </div>

                      <div className="md:col-span-2 text-xs text-gray-500 flex items-end">
                        Edit line amount/description (DRAFT only). Each changed line will hit PATCH invoice-lines endpoint.
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                        <span>Lines</span>
                        <span className="text-gray-500">{editLines.length} lines</span>
                      </div>

                      {editLines.length ? (
                        <div className="divide-y divide-gray-200">
                          {editLines.map((ln, idx) => (
                            <div key={ln.id || idx} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2">
                              <div className="md:col-span-5">
                                <label className="block text-[11px] text-gray-500 mb-1">
                                  description (line_id: {asStr(ln.id)})
                                </label>
                                <input
                                  value={ln.description}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setEditLines((prev) => prev.map((x, i) => (i === idx ? { ...x, description: v } : x)));
                                  }}
                                  disabled={!isEditable(editInv)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                <div className="mt-1 text-[11px] text-gray-500">
                                  Type: {asStr(ln.charge_type)} • Unit: {asStr(ln.unit_id || "—")}
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-[11px] text-gray-500 mb-1">amount</label>
                                <input
                                  type="number"
                                  value={ln.amount}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setEditLines((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: v } : x)));
                                  }}
                                  disabled={!isEditable(editInv)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>

                              <div className="md:col-span-4 flex items-end justify-end text-sm font-semibold text-gray-900">
                                ₹ {fmtMoney(ln.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-gray-500">No lines.</div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={closeEdit} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!isEditable(editInv) || actionLoading}
                      className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {actionLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* -------- Payment Modal -------- */}
            {payOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Receive Payment & Allocate</div>
                      <div className="text-xs text-gray-500">POST /api/billing/payments/receive-and-allocate/</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Selected payable invoices:{" "}
                        <b>{selectedPayableInvoices.map((x) => `#${x.id}`).join(", ") || "—"}</b>
                      </div>
                    </div>
                    <button onClick={closePay} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">
                      Close
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {payErr ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{payErr}</div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">tenant_id</label>
                        <input
                          value={payTenantId}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">amount</label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="80000.00"
                        />
                        <div className="text-[11px] text-gray-500 mt-1">
                          Allocated: ₹ <b>{to2(paySummary.allocSum)}</b> • Diff:{" "}
                          <b className={Math.abs(paySummary.diff) < 0.00001 ? "text-green-700" : "text-red-700"}>{to2(paySummary.diff)}</b>
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">received_on</label>
                        <input
                          type="date"
                          value={payReceivedOn}
                          onChange={(e) => setPayReceivedOn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">mode</label>
                        <select
                          value={payMode}
                          onChange={(e) => setPayMode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="CASH">CASH</option>
                          <option value="BANK">BANK</option>
                          <option value="UPI">UPI</option>
                          <option value="CHEQUE">CHEQUE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">reference_no</label>
                        <input
                          value={payReferenceNo}
                          onChange={(e) => setPayReferenceNo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="UTR123456"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">bank_name (meta)</label>
                        <input
                          value={payBankName}
                          onChange={(e) => setPayBankName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="HDFC"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">received_at (meta)</label>
                        <input
                          type="datetime-local"
                          value={payReceivedAt}
                          onChange={(e) => setPayReceivedAt(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <div className="text-[11px] text-gray-500 mt-1">
                          Will be sent as ISO with offset like <code>+05:30</code>.
                        </div>
                      </div>

                      <div className="md:col-span-12">
                        <label className="block text-xs font-medium text-gray-600 mb-1">note</label>
                        <input
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Dec rent part payment"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPayAllocRows((prev) => autoAllocateToAmount(payAmount, prev))}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Auto allocate to amount
                      </button>
                      <button
                        onClick={() => {
                          const sum = (payAllocRows || []).reduce((acc, r) => acc + (Number(r?.line_amount) || 0), 0);
                          setPayAmount(to2(sum));
                          setPayAllocRows((prev) => prev.map((r) => ({ ...r, allocated_amount: to2(r.line_amount) })));
                        }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Full allocate (set amount = total)
                      </button>

                      <div className="ml-auto text-xs text-gray-500">
                        Tip: If partial payment, set <b>amount</b> first, then click <b>Auto allocate</b>.
                      </div>
                    </div>
                    

                    {/* Allocation table */}
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                        <span>Allocations</span>
                        <span className="text-gray-500">{payAllocRows.length} lines</span>
                      </div>

                      {payAllocRows.length ? (
                        <div className="divide-y divide-gray-200">
                          {payAllocRows.map((r, idx) => (
                            <div key={r.key} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                              <div className="md:col-span-5">
                                <div className="text-xs font-semibold text-gray-800">
                                  INV #{r.invoice_id} • Line #{r.invoice_line_id}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  {r.description} {r.charge_type ? `• ${r.charge_type}` : ""}
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <div className="text-[11px] text-gray-500">line amount</div>
                                <div className="text-sm font-semibold text-gray-900">₹ {fmtMoney(r.line_amount)}</div>
                              </div>

                              <div className="md:col-span-4">
                                <label className="block text-[11px] text-gray-500 mb-1">allocated_amount</label>
                                <input
                                  type="number"
                                  value={r.allocated_amount}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPayAllocRows((prev) =>
                                      prev.map((x, i) => (i === idx ? { ...x, allocated_amount: v } : x))
                                    );
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  placeholder="0.00"
                                />
                                <div className="text-[11px] text-gray-500 mt-1">
                                  Max: ₹ {fmtMoney(r.line_amount)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-gray-500">No allocation lines.</div>
                      )}
                    </div>

                    {payResult ? (
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs overflow-auto max-h-56">
                        <div className="text-xs font-semibold text-gray-700 mb-2">API Response</div>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(payResult, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>

                  <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={closePay} className="px-3 py-2 text-sm border rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={submitPayment}
                      disabled={actionLoading}
                      className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {actionLoading ? "Submitting..." : "Submit Payment"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <InvoiceViewModal open={viewInvOpen} inv={viewInv} onClose={closeInvoiceView} />

          </>
        ) : null}
      </Card>
    </div>
  );
};

export default CAMGeneratePage;
