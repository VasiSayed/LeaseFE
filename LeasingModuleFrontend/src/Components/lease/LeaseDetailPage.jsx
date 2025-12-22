// src/pages/Lease/LeaseDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, AlertCircle, Trash2 } from "lucide-react";
import { setupAPI, tenantAPI, leaseAPI } from "../../services/api";

/* ---------------- helpers ---------------- */
const isNumberLike = (v) =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== "" &&
  !Number.isNaN(Number(v));

const toNum = (v, fallback = null) => {
  if (!isNumberLike(v)) return fallback;
  return Number(v);
};

const stripMoney = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[^0-9.\-]/g, "");
};

const monthsBetween = (start, end) => {
  try {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
    let months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) months -= 1;
    return Math.max(0, months);
  } catch {
    return "";
  }
};
const toFloat = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const isZero = (n) => Math.abs(Number(n || 0)) < 0.01;

const getActiveCtx = () => {
  try {
    const raw = localStorage.getItem("active");
    if (!raw) return null;

    const a = JSON.parse(raw);

    const scopeType = a.scope_type || a.scopeType || a.type || "ORG";
    const scopeId = a.scope_id || a.scopeId || a.id || a.pk || null;

    // orgId often same as scopeId for ORG
    const orgId = a.org_id || a.orgId || (scopeType === "ORG" ? scopeId : null);

    return scopeId ? { scopeType, scopeId, orgId } : null;
  } catch {
    return null;
  }
};

const addMonths = (dateStr, months) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + Number(months || 0));
  return nd.toISOString().slice(0, 10);
};

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatPrettyDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const month = d.toLocaleString(undefined, { month: "long" });
  const day = ordinal(d.getDate());
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
};

const fmtMoney = (num, symbol = "$") => {
  const n = Number(num || 0);
  if (!Number.isFinite(n)) return `${symbol}0.00`;
  return (
    symbol +
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const formatBytes = (bytes) => {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const pickId = (obj) =>
  obj?.id ??
  obj?.data?.id ??
  obj?.result?.id ??
  obj?.tenant?.id ??
  obj?.company?.id ??
  null;

const callFirstAvailable = async (candidates, ...args) => {
  for (const fn of candidates) {
    if (typeof fn === "function") return await fn(...args);
  }
  return null;
};

/* ---------------- UI -> API mappings ---------------- */
const STATUS_UI_TO_API = {
  Active: "ACTIVE",
  Pending: "PENDING",
  Expired: "EXPIRED",
  Terminated: "TERMINATED",
  Draft: "DRAFT",
};
const STATUS_API_TO_UI = Object.fromEntries(
  Object.entries(STATUS_UI_TO_API).map(([k, v]) => [v, k])
);

const BILL_FREQ_UI_TO_API = {
  Monthly: "MONTHLY",
  Quarterly: "QUARTERLY",
  Annually: "ANNUALLY",
};
const BILL_FREQ_API_TO_UI = Object.fromEntries(
  Object.entries(BILL_FREQ_UI_TO_API).map(([k, v]) => [v, k])
);

const ESC_UI_TO_API = {
  "Fixed Percentage": "FIXED_PERCENT",
  "CPI Index": "CPI_INDEX",
  "Market Rate": "MARKET_RATE",
  "Step Up": "STEP_UP",
};
const ESC_API_TO_UI = Object.fromEntries(
  Object.entries(ESC_UI_TO_API).map(([k, v]) => [v, k])
);

const CAM_BASIS_UI_TO_API = {
  "Pro-rata": "PRO_RATA",
  Fixed: "FIXED",
  Percentage: "PERCENTAGE",
};
const CAM_BASIS_API_TO_UI = Object.fromEntries(
  Object.entries(CAM_BASIS_UI_TO_API).map(([k, v]) => [v, k])
);

const REV_UI_TO_API = {
  "Straight-line": "STRAIGHT_LINE",
  "Cash Basis": "CASH_BASIS",
  Accrual: "ACCRUAL",
};
const REV_API_TO_UI = Object.fromEntries(
  Object.entries(REV_UI_TO_API).map(([k, v]) => [v, k])
);

const FITOUT_CAM_UI_TO_API = { Yes: "YES", No: "NO", Partial: "PARTIAL" };
const FITOUT_CAM_API_TO_UI = Object.fromEntries(
  Object.entries(FITOUT_CAM_UI_TO_API).map(([k, v]) => [v, k])
);

/* ✅ invoice rule options */
const INVOICE_RULE_OPTIONS = [
  { label: "1st Day of Month", value: "1ST_DAY_OF_MONTH" },
  { label: "5th Day of Month", value: "5TH_DAY_OF_MONTH" },
  { label: "10th Day of Month", value: "10TH_DAY_OF_MONTH" },
  { label: "On Lease Start Date", value: "ON_COMMENCEMENT_DATE" },
];

/* ✅ Step 0 is Tenant Setup */
const STEPS = [
  { key: "tenant", label: "Tenant Setup" },
  { key: "basic", label: "Basic & Parties" },
  { key: "property", label: "Property & Units" },
  { key: "term", label: "Term & Dates" },
  { key: "financials", label: "Financials" },
  { key: "escalation", label: "Escalation & Options" },
  { key: "docs", label: "Documents & Approvals" },
];

const UsageTypes = ["Office", "Retail", "Warehouse", "Other"];

/* =======================================================
   UI components moved OUTSIDE to stop input focus loss
   ======================================================= */

const Card = ({ title, children, rightTitle, subtitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {subtitle ? (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        ) : null}
      </div>
      {rightTitle ? (
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {rightTitle}
        </div>
      ) : null}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  disabled = false,
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {hint ? (
        <span className="ml-1 text-gray-400 cursor-help" title={hint}>
          <AlertCircle className="w-3 h-3 inline" />
        </span>
      ) : null}
    </label>

    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={type === "number" ? "decimal" : undefined}
      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        disabled ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
      }`}
    />
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  helper,
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <option value="">Select...</option>
      {(options || []).map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lab = typeof o === "string" ? o : o.label;
        return (
          <option key={String(val)} value={String(val)}>
            {lab}
          </option>
        );
      })}
    </select>
    {helper ? <div className="text-xs text-gray-500 mt-2">{helper}</div> : null}
  </div>
);

const Stepper = ({ stepIdx, setStepIdx, canGoTo }) => (
  <div className="bg-white border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="flex items-center gap-3 overflow-x-auto">
        {STEPS.map((s, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx;
          const disabled = !canGoTo(i);

          return (
            <button
              key={s.key}
              type="button"
              disabled={disabled}
              onClick={() => setStepIdx(i)}
              className={`flex items-center gap-2 min-w-max ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title={disabled ? "Complete Tenant Setup first" : s.label}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : done
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {i + 1}
              </div>
              <div
                className={`text-sm font-medium ${
                  active ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {s.label}
              </div>
              {i !== STEPS.length - 1 ? (
                <div className="w-10 h-px bg-gray-200 mx-2" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const TotalMonthlyPayableCard = ({
  totalAllocatedArea,
  totalMonthlyPayable,
  baseRentMonthlyTotal,
  camMonthlyTotal,
  taxesEstMonthly,
  symbol = "$",
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-5 bg-indigo-50">
      <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wide">
        Total Monthly Payable
      </div>

      <div className="mt-2 text-3xl font-bold text-indigo-900 tabular-nums">
        {fmtMoney(totalMonthlyPayable, symbol)}
      </div>

      <div className="mt-2 text-xs text-indigo-700">Base Rent + CAM + Taxes</div>

      <div className="mt-4 space-y-1 text-xs text-indigo-900">
        <div className="flex justify-between">
          <span>Base Rent</span>
          <span className="tabular-nums">
            {fmtMoney(baseRentMonthlyTotal, symbol)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>CAM</span>
          <span className="tabular-nums">{fmtMoney(camMonthlyTotal, symbol)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxes (est.)</span>
          <span className="tabular-nums">{fmtMoney(taxesEstMonthly, symbol)}</span>
        </div>
      </div>

      {Number(totalAllocatedArea || 0) <= 0 ? (
        <div className="mt-4 text-xs text-indigo-700">
          {/* Tip: totals update after you set Unit “Allocated Area” in Property & Units. */}
        </div>
      ) : null}
    </div>
  </div>
);

const ValidationMessagesCard = () => (
  <div className="bg-white rounded-lg shadow-sm border border-purple-300 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-200">
      <h3 className="text-base font-semibold text-gray-800">
        Validation Messages
      </h3>
    </div>
    <div className="p-5">
      <div className="text-sm text-green-600 font-medium">
        All financial details look good!
      </div>
    </div>
  </div>
);

const RentSchedulePreviewCard = ({ rows, symbol = "$" }) => (
  <div className="bg-white rounded-lg shadow-sm border border-purple-300 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-200">
      <h3 className="text-base font-semibold text-gray-800">
        Rent Schedule Preview
      </h3>
    </div>
    <div className="p-5">
      <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-gray-500 pb-2">
        <div>Year</div>
        <div>Monthly Rent</div>
        <div className="text-right">Effective Date</div>
      </div>

      <div className="mt-1 space-y-2">
        {(rows || []).map((r) => (
          <div
            key={r.year}
            className="grid grid-cols-3 gap-3 text-sm text-gray-800"
          >
            <div>{r.year}</div>
            <div className="tabular-nums">{fmtMoney(r.rent, symbol)}</div>
            <div className="text-right text-gray-500">
              {r.effective ? formatPrettyDate(r.effective) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TogglePills = ({ value, onChange, left, right, disabled = false }) => (
  <div
    className={`inline-flex rounded-lg border border-gray-200 overflow-hidden ${
      disabled ? "opacity-60" : ""
    }`}
  >
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(left.value)}
      className={`px-3 py-2 text-sm ${
        value === left.value
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {left.label}
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(right.value)}
      className={`px-3 py-2 text-sm ${
        value === right.value
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {right.label}
    </button>
  </div>
);

/* ✅ simple boolean switch */
const Switch = ({ label, checked, onChange, helper }) => (
  <div className="flex items-start justify-between gap-3 py-2">
    <div className="min-w-0">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      {helper ? <div className="text-xs text-gray-500 mt-0.5">{helper}</div> : null}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full border transition relative ${
        checked ? "bg-blue-600 border-blue-600" : "bg-gray-200 border-gray-300"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  </div>
);

const Modal = ({ open, title, children, onClose, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="text-base font-semibold text-gray-900">{title}</div>
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-md hover:bg-gray-100 text-sm"
            >
              Close
            </button>
          </div>
          <div className="p-5">{children}</div>
          {footer ? (
            <div className="px-5 py-4 border-t border-gray-200">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};



const Chip = ({ active, children, onClick, disabled = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`px-3 py-2 text-xs rounded-full border transition ${
      disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
    } ${
      active
        ? "bg-blue-50 border-blue-600 text-blue-700"
        : "bg-white border-gray-200 text-gray-700"
    }`}
  >
    {children}
  </button>
);

const Pill = ({ tone = "gray", children }) => {
  const tones = {
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const StatTile = ({ label, value, accent = false }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
    <div className="text-[11px] text-gray-500">{label}</div>
    <div className={`mt-1 text-sm font-semibold ${accent ? "text-gray-900" : "text-gray-800"} tabular-nums`}>
      {value}
    </div>
  </div>
);

const ModePill = ({ mode }) => {
  const m = String(mode || "").toUpperCase();
  if (m === "FULL") return <Pill tone="green">FULL</Pill>;
  if (m === "PARTIAL") return <Pill tone="blue">PARTIAL</Pill>;
  if (m === "LOCKED") return <Pill tone="red">LOCKED</Pill>;
  return <Pill tone="gray">{m || "—"}</Pill>;
};



/* ============================
   Main component
   ============================ */

const LeaseDetailPage = ({ onClose, leaseId, context }) => {
  const leaseDbId = useMemo(
    () => (isNumberLike(leaseId) ? Number(leaseId) : null),
    [leaseId]
  );
  
const [availabilityTree, setAvailabilityTree] = useState(null);
const [selectedTowerId, setSelectedTowerId] = useState(null);
const [selectedFloorId, setSelectedFloorId] = useState(null);

  // ✅ Index availability tree for fast lookups (floors/units -> ids)
const availabilityIndex = useMemo(() => {
  const floorsById = {};
  const unitsById = {};
  const unitsByFloorId = {};
  const unitToFloorId = {};

  for (const t of availabilityTree?.towers || []) {
    for (const f of t?.floors || []) {
      const fid = String(f.floor_id);
      floorsById[fid] = f;

      const units = Array.isArray(f.units) ? f.units : [];
      unitsByFloorId[fid] = units;

      for (const u of units) {
        const uid = String(u.unit_id);
        unitsById[uid] = u;
        unitToFloorId[uid] = fid;
      }
    }
  }

  return { floorsById, unitsById, unitsByFloorId, unitToFloorId };
}, [availabilityTree]);



  const ctx = useMemo(() => {
    const active = getActiveCtx();

    const scopeType = context?.scopeType || active?.scopeType || "ORG";
    const scopeId = context?.scopeId || active?.scopeId || null;

    // if not passed, derive orgId from active (or from scope when ORG)
    const orgId =
      context?.orgId || active?.orgId || (scopeType === "ORG" ? scopeId : null);

    return {
      scopeType,
      scopeId,
      orgId,
      unitType: context?.unitType || "COMMERCIAL",
    };
  }, [context]);

  const [stepIdx, setStepIdx] = useState(leaseDbId ? 1 : 0);
// ✅ NEW: multi-floor selection + builder UI like screenshots
const [selectedFloorIds, setSelectedFloorIds] = useState([]); // multi-select
const [builderMode, setBuilderMode] = useState("MANUAL"); // MANUAL | PERCENT | FULL | NEED
const [builderPercent, setBuilderPercent] = useState(50);
const [builderNeedArea, setBuilderNeedArea] = useState("");
const [floorTargets, setFloorTargets] = useState({}); // { [floorId]: targetSqft }

// ✅ NEW: modal for “View units”
const [unitsModalOpen, setUnitsModalOpen] = useState(false);

// ✅ NEW: modal for “Edit split”
const [editSplitUnitId, setEditSplitUnitId] = useState(null);

  const [sites, setSites] = useState([]);
  const [tenantsDir, setTenantsDir] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [leaseDocs, setLeaseDocs] = useState([]);

  // ✅ UI-only: unit search + filter (only for this step)
const [unitQuery, setUnitQuery] = useState("");
const [unitFilter, setUnitFilter] = useState("ALL"); // ALL | AVAILABLE | SELECTED





const removeSelectionsForFloor = (floorId) => {
  const fid = String(floorId);
  const units = availabilityIndex.unitsByFloorId[fid] || [];
  const unitIds = new Set(units.map((u) => String(u.unit_id)));

  setUnitSelections((prev) => {
    const next = { ...(prev || {}) };
    for (const uid of Object.keys(next)) {
      if (unitIds.has(String(uid))) delete next[uid];
    }
    return next;
  });

  setFloorTargets((prev) => {
    const next = { ...(prev || {}) };
    delete next[fid];
    return next;
  });
};

const toggleFloorChecked = (floorId) => {
  const fid = String(floorId);

  setSelectedFloorIds((prev) => {
    const has = (prev || []).some((x) => String(x) === fid);
    if (has) return (prev || []).filter((x) => String(x) !== fid);
    return [...(prev || []), fid];
  });

  // If unchecking, also remove its units from selections
  const isChecked = (selectedFloorIds || []).some((x) => String(x) === fid);
  if (isChecked) {
    removeSelectionsForFloor(fid);
  } else {
    setSelectedFloorId(fid); // focus this floor for “View units”
  }
};

const greedyPickUnits = (units, target) => {
  let remaining = toFloat(target, 0);
  const next = {};

  for (const u of units || []) {
    if (remaining <= 0.01) break;

    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) continue;

    const unitId = String(u.unit_id);
    const isResidential = String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
    const divisible = !!u.is_divisible && !isResidential;

    if (remaining >= avail - 0.01) {
      next[unitId] = { allocation_mode: "FULL", segments: [] };
      remaining -= avail;
      continue;
    }

    if (divisible) {
      const minDiv = toFloat(u.min_divisible_area_sqft, 0);
      if (remaining >= minDiv && remaining > 0.01) {
        next[unitId] = {
          allocation_mode: "PARTIAL",
          segments: [{ allocated_area_sqft: String(round2(remaining)) }],
        };
        remaining = 0;
      }
    }
  }

  const picked = round2(toFloat(target, 0) - remaining);
  return { selections: next, picked };
};

const applyPickForFloor = (floorId, mode, value) => {
  const fid = String(floorId);
  const f = availabilityIndex.floorsById[fid];
  const units = availabilityIndex.unitsByFloorId[fid] || [];

  const floorAvail = toFloat(f?.floor_available_area_sqft, 0);
  if (floorAvail <= 0) return;

  // ensure floor is checked
  setSelectedFloorIds((prev) => {
    const has = (prev || []).some((x) => String(x) === fid);
    return has ? prev : [...(prev || []), fid];
  });

  // remove existing selections for this floor first
  const unitIds = new Set(units.map((u) => String(u.unit_id)));

  let target = null;
  let pickedMap = {};

  if (mode === "FULL") {
    target = floorAvail;
    pickedMap = {};
    for (const u of units) {
      const avail = toFloat(u.available_area_sqft, 0);
      if (avail <= 0) continue;
      pickedMap[String(u.unit_id)] = { allocation_mode: "FULL", segments: [] };
    }
  } else if (mode === "PERCENT") {
    const pct = Math.max(0, Math.min(100, Number(value || 0)));
    target = (floorAvail * pct) / 100;
    pickedMap = greedyPickUnits(units, target).selections;
  } else if (mode === "CUSTOM") {
    const n = toFloat(value, 0);
    if (!(n > 0) || n > floorAvail) return;
    target = n;
    pickedMap = greedyPickUnits(units, target).selections;
  }

  setFloorTargets((prev) => ({ ...(prev || {}), [fid]: String(round2(target || 0)) }));

  setUnitSelections((prev) => {
    const next = { ...(prev || {}) };
    for (const uid of Object.keys(next)) {
      if (unitIds.has(String(uid))) delete next[uid];
    }
    return { ...next, ...pickedMap };
  });
};

const autoPickFromBuilder = () => {
  if (!selectedFloorIds?.length) return;

  const t = toFloat(targetArea, 0);
  if (!(t > 0)) return;

  // rebuild selections across selected floors in order
  let remaining = t;
  const next = {};

  for (const fid of selectedFloorIds) {
    if (remaining <= 0.01) break;
    const units = availabilityIndex.unitsByFloorId[String(fid)] || [];
    const { selections, picked } = greedyPickUnits(units, remaining);
    Object.assign(next, selections);
    remaining -= picked;
  }

  setUnitSelections(next);
  setFloorTargets({}); // builder is global; clear per-floor targets display
};

const clearAllAllocationUI = () => {
  setUnitSelections({});
  setFloorTargets({});
  setBuilderMode("MANUAL");
  setBuilderPercent(50);
  setBuilderNeedArea("");
};






  
// ✅ NEW: availability tree + hierarchy selection


// ✅ NEW: floor selection mode + targets
const [floorSelectMode, setFloorSelectMode] = useState("MANUAL"); 
// MANUAL | FULL_FLOOR | PERCENT | CUSTOM_AREA
const [floorPercent, setFloorPercent] = useState(50);
const [floorCustomArea, setFloorCustomArea] = useState("");

// ✅ NEW: unit selections map
// { [unit_id]: { allocation_mode: "FULL"|"PARTIAL", segments: [{allocated_area_sqft:""}] } }
const [unitSelections, setUnitSelections] = useState({});









  /* ✅ versions/amendments state */
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionQuery, setVersionQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [amendmentSummary, setAmendmentSummary] = useState("");
  const [creatingAmendment, setCreatingAmendment] = useState(false);

  const [viewVersion, setViewVersion] = useState(null);

  const [allocations, setAllocations] = useState([
    { unit_id: null, code: "", area: "", share: "", usage_type: "Office" },
  ]);

  // tenant selection vs create-new
  const [tenantMode, setTenantMode] = useState("existing"); // "existing" | "new"
  const [creatingTenant, setCreatingTenant] = useState(false);

  // docs upload UI state (only UI state; backend logic stays same)
  const [docType, setDocType] = useState("AGREEMENT");
  const [docTitle, setDocTitle] = useState("");

  // 4 blocks for create tenant
  const [newTenant, setNewTenant] = useState({
    legal_name: "",
    trade_name: "",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    is_primary: true,
  });

  const [newPreferences, setNewPreferences] = useState({
    billing_email: "",
    communication_email: "",
    preferred_language: "EN",
    timezone: "Asia/Kolkata",
  });

  const [newKYC, setNewKYC] = useState({
    pan: "",
    gstin: "",
    cin: "",
    kyc_status: "PENDING",
  });

  /* ✅ Ageing + AR state */
  const [ageingBuckets, setAgeingBuckets] = useState([
    { label: "0-30", from_days: "0", to_days: "30" },
    { label: "31-60", from_days: "31", to_days: "60" },
    { label: "61-90", from_days: "61", to_days: "90" },
    { label: "90+", from_days: "91", to_days: "" }, // empty => null in payload
  ]);

  const [arRules, setArRules] = useState({
    dispute_hold: true,
    stop_interest_on_dispute: true,
    stop_reminders_on_dispute: true,
    credit_note_allowed: true,
    credit_note_requires_approval: true,
  });

  const [formData, setFormData] = useState({
    leaseId: leaseDbId ? "" : "LSE-2024-001",
    versionNumber: "3.1",
    leaseCommencementDate: "",
    status: "Draft",
    agreementType: "Commercial Retail Lease",

    siteId: "",
    landlordEntity: "",
    tenantId: "",
    primaryContactId: "",

    initialTerm: "",
    leaseExpiryDate: "",
    lockInPeriodStartDate: "",
    lockInPeriodEndDate: "",
    noticeRenewal: "90",
    noticeLandlord: "90",

    rentFreeStartDate: "",
    rentFreeDays: "",
    rentFreeEndDate: "",
    fitoutStartDate: "",
    fitoutEndDate: "",
    camDuringFitout: "Yes",
    fitoutCompletionCertRequired: false,

    baseRentAmount: "",
    billingFrequency: "Monthly",
    paymentDueDate: "5th Day of Month",
    firstRentDueDate: "",

    escalationType: "Fixed Percentage",
    currentEscalationValue: "3.0%",
    nextReviewDate: "",
    effectiveFrom: "",
    effectiveTo: "",

    camAllocationBasis: "Pro-rata",
    estimatedCAMMonthly: "50",

    securityDepositAmount: "50000",
    depositHeldBy: "",
    refundConditions: "",

    revenueRecognitionMethod: "Straight-line",
    deferredRentSetup: "Yes",

    terminationClause: "",
    governingLaw: "",

    /* Billing & Invoice rules fields */
    invoiceGenerateRule: "1ST_DAY_OF_MONTH",
    invoiceGraceDays: "2",
    invoiceLateFeeFlat: "500",
    invoiceInterestAnnualPercent: "18",
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const statuses = ["Active", "Pending", "Expired", "Terminated", "Draft"];
  const agreementTypes = [
    "Commercial Retail Lease",
    "Office Lease",
    "Industrial Lease",
    "Warehouse Lease",
  ];
  const billingFrequencies = ["Monthly", "Quarterly", "Annually"];
  const escalationTypes = [
    "Fixed Percentage",
    "CPI Index",
    "Market Rate",
    "Step Up",
  ];
  const camBases = ["Pro-rata", "Fixed", "Percentage"];
  const revenueMethods = ["Straight-line", "Cash Basis", "Accrual"];

  const siteOptions = useMemo(
    () =>
      (sites || []).map((s) => ({
        value: String(s.id),
        label: `${s.name || s.code || "Site"} (ID: ${s.id})`,
      })),
    [sites]
  );
  const selectedTower = useMemo(() => {
  const towers = availabilityTree?.towers || [];
  return towers.find((t) => String(t.tower_id) === String(selectedTowerId)) || null;
}, [availabilityTree, selectedTowerId]);

const selectedFloor = useMemo(() => {
  const floors = selectedTower?.floors || [];
  return floors.find((f) => String(f.floor_id) === String(selectedFloorId)) || null;
}, [selectedTower, selectedFloorId]);

const floorUnits = useMemo(() => selectedFloor?.units || [], [selectedFloor]);
const filteredFloorUnits = useMemo(() => {
  const q = (unitQuery || "").trim().toLowerCase();

  return (floorUnits || []).filter((u) => {
    const unitId = String(u.unit_id);
    const selected = !!unitSelections?.[unitId];
    const avail = toFloat(u.available_area_sqft, 0);

    if (unitFilter === "AVAILABLE" && !(avail > 0)) return false;
    if (unitFilter === "SELECTED" && !selected) return false;

    if (!q) return true;

    const hay = [
      u.unit_name,
      u.unit_id,
      u.unit_type,
      u.total_area_sqft,
      u.available_area_sqft,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });
}, [floorUnits, unitQuery, unitFilter, unitSelections]);



const floorAvailable = useMemo(
  () => toFloat(selectedFloor?.floor_available_area_sqft, 0),
  [selectedFloor]
);

const selectedAreaTotal = useMemo(() => {
  let sum = 0;

  for (const [unitId, sel] of Object.entries(unitSelections || {})) {
    const u = availabilityIndex.unitsById[String(unitId)];
    if (!u) continue;

    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) continue;

    if (sel?.allocation_mode === "FULL") {
      sum += avail;
      continue;
    }

    const segs = Array.isArray(sel?.segments) ? sel.segments : [];
    const segSum = segs.reduce((s, x) => s + toFloat(x.allocated_area_sqft, 0), 0);
    sum += Math.min(segSum, avail);
  }

  return round2(sum);
}, [unitSelections, availabilityIndex]);



const selectedAreaByFloor = useMemo(() => {
  const map = {};
  for (const [unitId, sel] of Object.entries(unitSelections || {})) {
    const u = availabilityIndex.unitsById[String(unitId)];
    const fid = availabilityIndex.unitToFloorId[String(unitId)];
    if (!u || !fid) continue;

    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) continue;

    let picked = 0;
    if (sel?.allocation_mode === "FULL") picked = avail;
    else {
      const segs = Array.isArray(sel?.segments) ? sel.segments : [];
      picked = Math.min(
        segs.reduce((s, x) => s + toFloat(x.allocated_area_sqft, 0), 0),
        avail
      );
    }

    map[fid] = round2((map[fid] || 0) + picked);
  }
  return map;
}, [unitSelections, availabilityIndex]);

const selectedFloorsAvailableTotal = useMemo(() => {
  return round2(
    (selectedFloorIds || []).reduce((s, fid) => {
      const f = availabilityIndex.floorsById[String(fid)];
      return s + toFloat(f?.floor_available_area_sqft, 0);
    }, 0)
  );
}, [selectedFloorIds, availabilityIndex]);






const targetArea = useMemo(() => {
  if (builderMode === "FULL") return round2(selectedFloorsAvailableTotal);
  if (builderMode === "PERCENT") {
    return round2((selectedFloorsAvailableTotal * Number(builderPercent || 0)) / 100);
  }
  if (builderMode === "NEED") return round2(toFloat(builderNeedArea, 0));
  return null;
}, [builderMode, builderPercent, builderNeedArea, selectedFloorsAvailableTotal]);

const remainingArea = useMemo(() => {
  if (targetArea === null) return null;
  return round2(targetArea - selectedAreaTotal);
}, [targetArea, selectedAreaTotal]);



  const tenantOptions = useMemo(
    () =>
      (tenantsDir || []).map((t) => ({
        value: String(t.id),
        label:
          t.legal_name || t.name || t.company_name || `Tenant (ID: ${t.id})`,
      })),
    [tenantsDir]
  );

  const contactOptions = useMemo(
    () =>
      (contacts || []).map((c) => ({
        value: String(c.id),
        label: `${c.name || c.full_name || "Contact"}${
          c.email ? ` (${c.email})` : ""
        }`,
      })),
    [contacts]
  );

  const selectedSite = useMemo(() => {
    if (!formData.siteId) return null;
    return (
      (sites || []).find((s) => String(s.id) === String(formData.siteId)) || null
    );
  }, [sites, formData.siteId]);

  const selectedTenant = useMemo(() => {
    if (!formData.tenantId) return null;
    return (
      (tenantsDir || []).find((t) => String(t.id) === String(formData.tenantId)) ||
      null
    );
  }, [tenantsDir, formData.tenantId]);

  const tenantReady = useMemo(
    () => !!leaseDbId || !!formData.tenantId,
    [leaseDbId, formData.tenantId]
  );

  const canGoTo = (idx) => {
    if (idx === 0) return true;
    if (leaseDbId) return true;
    return tenantReady;
  };

  const totalAllocatedArea = useMemo(() => {
    return allocations.reduce(
      (sum, r) => sum + (parseFloat(stripMoney(r.area)) || 0),
      0
    );
  }, [allocations]);

  /* ---------------- FINANCIAL computed ---------------- */
  const baseRatePerSqft = useMemo(
    () => parseFloat(stripMoney(formData.baseRentAmount)) || 0,
    [formData.baseRentAmount]
  );
  const camRatePerSqft = useMemo(
    () => parseFloat(stripMoney(formData.estimatedCAMMonthly)) || 0,
    [formData.estimatedCAMMonthly]
  );

  const baseRentMonthlyTotal = useMemo(() => {
    if (!totalAllocatedArea) return 0;
    return baseRatePerSqft * totalAllocatedArea;
  }, [baseRatePerSqft, totalAllocatedArea]);

  const camMonthlyTotal = useMemo(() => {
    if (!totalAllocatedArea) return 0;
    return camRatePerSqft * totalAllocatedArea;
  }, [camRatePerSqft, totalAllocatedArea]);

  const taxesEstMonthly = 0;

  const totalMonthlyPayable = useMemo(() => {
    return (baseRentMonthlyTotal || 0) + (camMonthlyTotal || 0) + (taxesEstMonthly || 0);
  }, [baseRentMonthlyTotal, camMonthlyTotal, taxesEstMonthly]);

  const escalationPercent = useMemo(() => {
    const p = parseFloat(stripMoney(formData.currentEscalationValue)) || 0;
    return Math.max(0, p);
  }, [formData.currentEscalationValue]);

  const rentSchedulePreview = useMemo(() => {
    const start = formData.leaseCommencementDate || "";
    const rows = [];
    for (let year = 1; year <= 5; year += 1) {
      const factor = Math.pow(1 + escalationPercent / 100, year - 1);
      const rent = (baseRentMonthlyTotal || 0) * factor;
      const eff = start ? addMonths(start, (year - 1) * 12) : "";
      rows.push({ year, rent, effective: eff });
    }
    return rows;
  }, [formData.leaseCommencementDate, baseRentMonthlyTotal, escalationPercent]);

  /* ---------------- allocations operations ---------------- */
  const addAllocationRow = () => {
    setAllocations((prev) => [
      ...prev,
      { unit_id: null, code: "", area: "", share: "", usage_type: "Office" },
    ]);
  };

  const removeAllocationRow = (idx) => {
    setAllocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAllocation = (idx, patch) => {
    setAllocations((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const handleSelectUnit = (idx, unitIdStr) => {
    const unitId = Number(unitIdStr);
    const u = (unitOptions || []).find((x) => Number(x.id) === unitId);

    const code =
      u?.unit_no || u?.unit_code || u?.code || u?.name || u?.title || "";
    const maybeArea = u?.leasable_area_sqft ?? u?.area_sqft ?? u?.area ?? "";

    updateAllocation(idx, {
      unit_id: unitId,
      code,
      area: maybeArea !== "" && maybeArea != null ? String(maybeArea) : "",
    });
  };

  /* ageing bucket ops */
  const addAgeingBucket = () => {
    setAgeingBuckets((p) => [...p, { label: "", from_days: "", to_days: "" }]);
  };

  const removeAgeingBucket = (idx) => {
    setAgeingBuckets((p) => p.filter((_, i) => i !== idx));
  };

  const updateAgeingBucket = (idx, patch) => {
    setAgeingBuckets((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  /* ---------------- tenant mode handlers ---------------- */
  const handleTenantModeChange = (mode) => {
    if (leaseDbId) return;

    setTenantMode(mode);

    if (mode === "existing") {
      setNewTenant({
        legal_name: "",
        trade_name: "",
        email: "",
        phone: "",
        address_line1: "",
        city: "",
        state: "",
        pincode: "",
      });
      setNewContact({
        name: "",
        email: "",
        phone: "",
        designation: "",
        is_primary: true,
      });
      setNewPreferences({
        billing_email: "",
        communication_email: "",
        preferred_language: "EN",
        timezone: "Asia/Kolkata",
      });
      setNewKYC({ pan: "", gstin: "", cin: "", kyc_status: "PENDING" });
    } else {
      handleInputChange("tenantId", "");
      handleInputChange("primaryContactId", "");
      setContacts([]);
    }
  };

  const handleExistingTenantSelect = (tenantId) => {
    handleInputChange("tenantId", tenantId);
    handleInputChange("primaryContactId", "");
    if (tenantId) setTimeout(() => setStepIdx(1), 0);
  };

  const createTenantFlowAndGoNext = async () => {
    if (!ctx?.orgId) throw new Error("Active org_id missing. Select organization first.");
    if (!newTenant.legal_name?.trim()) throw new Error("New Tenant: Legal Name is required");
    if (!newContact.name?.trim()) throw new Error("New Contact: Name is required");

    setCreatingTenant(true);
    try {
      const orgIdNum = Number(ctx.orgId);

      // ✅ IMPORTANT: send org_id (backend required)
      const tenantPayload = {
        org_id: orgIdNum,
        org: orgIdNum,
        ...newTenant,
      };

      const tenantResp = await callFirstAvailable(
        [tenantAPI?.createTenant, tenantAPI?.createTenantCompany, tenantAPI?.createCompany],
        tenantPayload
      );

      if (!tenantResp) {
        throw new Error("tenantAPI.createTenant(...) not found. Add createTenant in services/api.js");
      }

      const tenantId = pickId(tenantResp);
      if (!tenantId) throw new Error("Tenant create succeeded but id not returned");

      // ✅ make contact payload compatible (some APIs want tenant_id)
      const contactPayload = {
        tenant: tenantId,
        tenant_id: tenantId,
        ...newContact,
      };

      const contactResp = await callFirstAvailable(
        [tenantAPI?.createContact, tenantAPI?.createTenantContact],
        contactPayload
      );

      const contactId = pickId(contactResp);

      await callFirstAvailable([tenantAPI?.createPreferences, tenantAPI?.upsertPreferences], {
        tenant: tenantId,
        tenant_id: tenantId,
        ...newPreferences,
      });

      await callFirstAvailable([tenantAPI?.createKYC, tenantAPI?.upsertKYC], {
        tenant: tenantId,
        tenant_id: tenantId,
        ...newKYC,
      });

      handleInputChange("tenantId", String(tenantId));
      if (contactId) handleInputChange("primaryContactId", String(contactId));

      // ✅ refresh tenants dropdown so new tenant appears in list
      try {
        const tenantsResp = await tenantAPI.getTenantsDirectory(orgIdNum, 1, 50);
        const tenantsList = tenantsResp?.results || tenantsResp || [];
        setTenantsDir(Array.isArray(tenantsList) ? tenantsList : []);
      } catch {}

      // ✅ fetch contacts for selected tenant
      try {
        const resp = await tenantAPI.getContacts(String(tenantId));
        const list = resp?.results || resp || [];
        setContacts(Array.isArray(list) ? list : []);
      } catch {}

      setStepIdx(1);
    } finally {
      setCreatingTenant(false);
    }
  };


const clearUnitSelections = () => setUnitSelections({});

const upsertSelection = (unit, patch) => {
  setUnitSelections((prev) => {
    const id = String(unit.unit_id);
    const current = prev[id] || null;
    return { ...prev, [id]: { ...(current || {}), ...patch } };
  });
};

const removeSelection = (unitId) => {
  setUnitSelections((prev) => {
    const next = { ...(prev || {}) };
    delete next[String(unitId)];
    return next;
  });
};

const toggleUnit = (unit) => {
  const unitId = String(unit.unit_id);
  const avail = toFloat(unit.available_area_sqft, 0);

  if (avail <= 0) return; // ✅ non-selectable

  setUnitSelections((prev) => {
    const next = { ...(prev || {}) };
    if (next[unitId]) {
      delete next[unitId];
      return next;
    }

    const isResidential = String(unit.unit_type || "").toUpperCase() === "RESIDENTIAL";
    const divisible = !!unit.is_divisible && !isResidential;

    // default: non-divisible/residential => FULL
    if (!divisible) {
      next[unitId] = { allocation_mode: "FULL", segments: [] };
      return next;
    }

    // divisible default => PARTIAL with 1 segment (min or small)
    const minDiv = toFloat(unit.min_divisible_area_sqft, 0);
    const defaultSeg = Math.min(avail, minDiv > 0 ? minDiv : Math.min(100, avail));

    next[unitId] = {
      allocation_mode: "PARTIAL",
      segments: [{ allocated_area_sqft: String(round2(defaultSeg)) }],
    };
    return next;
  });
};

const setUnitMode = (unit, mode) => {
  const avail = toFloat(unit.available_area_sqft, 0);
  if (avail <= 0) return;

  if (mode === "FULL") {
    upsertSelection(unit, { allocation_mode: "FULL", segments: [] });
  } else {
    // keep segments, ensure at least one
    setUnitSelections((prev) => {
      const id = String(unit.unit_id);
      const cur = prev?.[id] || { allocation_mode: "PARTIAL", segments: [] };
      const segs = Array.isArray(cur.segments) ? cur.segments : [];
      const unitMin = toFloat(unit.min_divisible_area_sqft, 0);
      const fallbackSeg = Math.min(avail, unitMin > 0 ? unitMin : Math.min(100, avail));

      return {
        ...(prev || {}),
        [id]: {
          allocation_mode: "PARTIAL",
          segments: segs.length ? segs : [{ allocated_area_sqft: String(round2(fallbackSeg)) }],
        },
      };
    });
  }
};
const selectionInvalid = useMemo(() => {
  if (!availabilityTree) return false;

  // No floors selected but trying to build a target
  if ((builderMode === "FULL" || builderMode === "PERCENT" || builderMode === "NEED") && (!selectedFloorIds || !selectedFloorIds.length)) {
    return true;
  }

  // need area cannot exceed selected floors availability
  if (builderMode === "NEED") {
    const n = toFloat(builderNeedArea, 0);
    if (!(n > 0) || n > selectedFloorsAvailableTotal) return true;
  }

  if (targetArea !== null && selectedAreaTotal - targetArea > 0.01) return true;

  // For FULL / PERCENT / NEED, require exact fill (remaining == 0)
  if (builderMode !== "MANUAL" && remainingArea !== null && !isZero(remainingArea)) return true;

  return false;
}, [
  availabilityTree,
  builderMode,
  builderNeedArea,
  selectedFloorIds,
  selectedAreaTotal,
  targetArea,
  remainingArea,
  selectedFloorsAvailableTotal,
]);



const buildItemsPayload = () => {
  // flatten all units from tree for lookup
  const allUnits = [];
  for (const t of availabilityTree?.towers || []) {
    for (const f of t?.floors || []) {
      for (const u of f?.units || []) allUnits.push(u);
    }
  }

  const items = [];

  for (const [unitId, sel] of Object.entries(unitSelections || {})) {
    const u = allUnits.find((x) => String(x.unit_id) === String(unitId));
    if (!u) continue;

    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) continue;

    const isResidential = String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
    const divisible = !!u.is_divisible && !isResidential;

    const base_rent_rate =
      String(u.default_base_rent ?? stripMoney(formData.baseRentAmount ?? "") ?? "");

    const cam_rate =
      String(u.default_cam_rate ?? stripMoney(formData.estimatedCAMMonthly ?? "") ?? "");

    const base_rent_rate_type = isResidential ? "FIXED" : "PER_SQFT";
    const cam_rate_type = isResidential ? "FIXED" : "PER_SQFT";

    // non-divisible or residential => FULL only
    if (!divisible || sel?.allocation_mode === "FULL") {
      items.push({
        unit_id: Number(u.unit_id),
        allocation_mode: "FULL",
        base_rent_rate,
        base_rent_rate_type,
        cam_rate,
        cam_rate_type,
      });
      continue;
    }

    // PARTIAL
    const segs = Array.isArray(sel?.segments) ? sel.segments : [];
    const cleanSegs = segs
      .map((s) => ({ allocated_area_sqft: String(stripMoney(s.allocated_area_sqft ?? "")) }))
      .filter((s) => toFloat(s.allocated_area_sqft, 0) > 0);

    if (cleanSegs.length >= 2) {
      items.push({
        unit_id: Number(u.unit_id),
        allocation_mode: "PARTIAL",
        segments: cleanSegs,
        base_rent_rate,
        base_rent_rate_type,
        cam_rate,
        cam_rate_type,
      });
    } else {
      const single = cleanSegs[0]?.allocated_area_sqft || "";
      items.push({
        unit_id: Number(u.unit_id),
        allocation_mode: "PARTIAL",
        allocated_area_sqft: String(single),
        base_rent_rate,
        base_rent_rate_type,
        cam_rate,
        cam_rate_type,
      });
    }
  }

  return items;
};

// ✅ Build floor_targets exactly like backend sample
const buildPropertyAllocationTerms = () => {
  const site_id = toNum(formData.siteId);
  const tower_id = selectedTowerId ? toNum(selectedTowerId) : null;

  const selected_floor_ids = (selectedFloorIds || [])
    .map((x) => toNum(x))
    .filter((x) => isNumberLike(x));

  const floor_targets = {};

  for (const fidRaw of selectedFloorIds || []) {
    const fid = String(fidRaw);
    const f = availabilityIndex.floorsById[fid];
    const floorAvail = round2(toFloat(f?.floor_available_area_sqft, 0));
    const picked = round2(toFloat(selectedAreaByFloor?.[fid] || 0, 0));

    let mode = "MANUAL";
    let target_area_sqft = picked;

    // Per-floor target applied
    if (floorTargets?.[fid] != null && String(floorTargets[fid]).trim() !== "") {
      mode = "CUSTOM";
      target_area_sqft = round2(toFloat(floorTargets[fid], 0));
    }

    // Global builder overrides per-floor display (if used)
    if (builderMode === "FULL") {
      mode = "FULL";
      target_area_sqft = floorAvail;
    } else if (builderMode === "PERCENT") {
      mode = "PERCENT";
      target_area_sqft = round2((floorAvail * Number(builderPercent || 0)) / 100);
      floor_targets[fid] = {
        target_area_sqft,
        mode,
        percent: Number(builderPercent || 0),
      };
      continue;
    } else if (builderMode === "NEED") {
      // When NEED is used, we send per-floor actual picked area
      mode = "CUSTOM";
      target_area_sqft = picked;
    }

    floor_targets[fid] = { target_area_sqft, mode };
  }

  return {
    site_id,
    tower_id,
    selected_floor_ids,
    floor_targets,
  };
};

const buildSubmitPayload = () => {
  const tenant_id = toNum(formData.tenantId);
  const primary_contact_id = toNum(formData.primaryContactId, null);
  const site_id = toNum(formData.siteId);

  const items = buildItemsPayload();

  // your existing "terms" (tenure/fitout/escalation/billing/ageing/ar...) re-used
  const baseTerms = buildBundlePayload("DRAFT")?.lease?.terms || {};

  // best-effort GST from tenant/kyc
  const gst_no =
    (selectedTenant?.gst_no ||
      selectedTenant?.gstin ||
      selectedTenant?.gst ||
      newKYC?.gstin ||
      "").trim() || null;

  const terms = {
    tenant: {
      billing_address_id: null, // keep null unless you have it in UI
      gst_no,
    },
    property_allocation: buildPropertyAllocationTerms(),

    // keep your existing detailed terms inside "financials" (safe for backend storage)
    financials: baseTerms,

    // explicit invoice_plan block (like sample)
    invoice_plan: {
      invoice_generate_rule: formData.invoiceGenerateRule || "1ST_DAY_OF_MONTH",
      grace_days: toNum(formData.invoiceGraceDays, 0),
      late_fee_flat: parseFloat(stripMoney(formData.invoiceLateFeeFlat)) || 0,
      interest_annual_percent: parseFloat(stripMoney(formData.invoiceInterestAnnualPercent)) || 0,
    },

    custom_fields: {},

    // if you don’t have file_id flow yet, keep empty
    attachments: [],
  };

  return {
    lease: {
      agreement_type: formData.agreementType,
      commencement_date: formData.leaseCommencementDate || null,
      expiry_date: formData.leaseExpiryDate || null,
      primary_contact_id,
      notes: (formData.notes || "").trim() || null,
      tenant_id,
      site_id,
      landlord_scope_type: ctx.scopeType,
      landlord_scope_id: toNum(ctx.scopeId),
    },
    items,
    terms,
  };
};



const addSegment = (unit) => {
  const avail = toFloat(unit.available_area_sqft, 0);
  if (avail <= 0) return;

  setUnitSelections((prev) => {
    const id = String(unit.unit_id);
    const cur = prev?.[id];
    if (!cur) return prev;

    const segs = Array.isArray(cur.segments) ? cur.segments : [];
    return {
      ...(prev || {}),
      [id]: { ...cur, allocation_mode: "PARTIAL", segments: [...segs, { allocated_area_sqft: "" }] },
    };
  });
};

const updateSegment = (unitId, segIdx, value) => {
  setUnitSelections((prev) => {
    const id = String(unitId);
    const cur = prev?.[id];
    if (!cur) return prev;

    const segs = Array.isArray(cur.segments) ? cur.segments : [];
    const nextSegs = segs.map((s, i) => (i === segIdx ? { ...s, allocated_area_sqft: value } : s));

    return { ...(prev || {}), [id]: { ...cur, segments: nextSegs } };
  });
};

const handleFinalSubmit = async () => {
  setSaving(true);
  try {
    const payload = buildSubmitPayload();

    if (!payload.lease.tenant_id) throw new Error("Tenant is required");
    if (!payload.lease.site_id) throw new Error("Site is required");
    if (!payload.lease.commencement_date) throw new Error("Commencement date is required");
    if (!payload.lease.expiry_date) throw new Error("Expiry date is required");
    if (!payload.items?.length) throw new Error("Select at least one unit / segment");
    if (selectionInvalid) throw new Error("Allocation doesn’t match the target. Fix Remaining = 0.");

    const resp = await leaseAPI.submitAgreement(payload);

    alert("Lease submitted successfully");
    if (onClose) onClose(resp);
  } catch (e) {
    alert(e?.message || "Submit failed");
  } finally {
    setSaving(false);
  }
};


const removeSegment = (unitId, segIdx) => {
  setUnitSelections((prev) => {
    const id = String(unitId);
    const cur = prev?.[id];
    if (!cur) return prev;

    const segs = Array.isArray(cur.segments) ? cur.segments : [];
    const nextSegs = segs.filter((_, i) => i !== segIdx);

    return { ...(prev || {}), [id]: { ...cur, segments: nextSegs } };
  });
};





  /* ---------------- versions/amendments ---------------- */
  const refreshVersions = async (leaseIdNum) => {
    if (!leaseIdNum) return;
    setVersionsLoading(true);
    try {
      const resp = await callFirstAvailable(
        [
          leaseAPI?.listVersions,
          leaseAPI?.getLeaseVersions,
          leaseAPI?.listAmendments,
          leaseAPI?.getVersionHistory,
        ],
        leaseIdNum
      );

      const list =
        (Array.isArray(resp) && resp) ||
        resp?.results ||
        resp?.versions ||
        resp?.history ||
        [];

      setVersions(Array.isArray(list) ? list : []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const createAmendment = async () => {
    if (!leaseDbId) {
      alert("Create the lease first (Save Draft) to create amendments.");
      return;
    }
    if (!amendmentSummary.trim()) {
      alert("Please enter an amendment summary.");
      return;
    }
    setCreatingAmendment(true);
    try {
      const resp = await callFirstAvailable(
        [leaseAPI?.createAmendment, leaseAPI?.createVersion, leaseAPI?.createLeaseVersion],
        leaseDbId,
        { summary: amendmentSummary.trim() }
      );
      if (!resp) {
        alert("createAmendment API not found in leaseAPI. Add it in services/api.js");
        return;
      }
      setAmendmentSummary("");
      await refreshVersions(leaseDbId);
      alert("Amendment created");
    } catch (e) {
      alert(e?.message || "Failed to create amendment");
    } finally {
      setCreatingAmendment(false);
    }
  };

  const restoreVersion = async (versionObj) => {
    if (!leaseDbId) return;
    const versionId = versionObj?.id ?? versionObj?.version_id ?? versionObj?.pk;
    if (!versionId) {
      alert("Version id missing.");
      return;
    }
    try {
      const resp = await callFirstAvailable(
        [leaseAPI?.restoreVersion, leaseAPI?.restoreLeaseVersion, leaseAPI?.rollbackVersion],
        leaseDbId,
        versionId
      );
      if (!resp) {
        alert("restoreVersion API not found in leaseAPI. Add it in services/api.js");
        return;
      }
      await refreshVersions(leaseDbId);
      alert("Version restored");
    } catch (e) {
      alert(e?.message || "Restore failed");
    }
  };

  /* ---------------- Load dropdowns + edit data ---------------- */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setPageError("");

      if (!ctx?.scopeId || !ctx?.orgId) {
        if (!mounted) return;
        setPageError("Active organization/scope not selected. Please select it first.");
        setLoading(false);
        return;
      }

      try {
        const [sitesResp, tenantsResp] = await Promise.all([
          setupAPI.getSitesByScope(ctx.scopeType, ctx.scopeId),
          tenantAPI.getTenantsDirectory(ctx.orgId, 1, 50),
        ]);

        const sitesList = Array.isArray(sitesResp) ? sitesResp : sitesResp?.results || [];
        const tenantsList = tenantsResp?.results || tenantsResp || [];

        if (!mounted) return;
        setSites(sitesList);
        setTenantsDir(Array.isArray(tenantsList) ? tenantsList : []);

        if (leaseDbId) {
          const [leaseDetail, allocs, docs] = await Promise.all([
            leaseAPI.getLeaseDetail(leaseDbId),
            leaseAPI.listAllocations(leaseDbId),
            leaseAPI.listDocuments(leaseDbId),
          ]);

          if (!mounted) return;

          const lease = leaseDetail || {};
          const terms = lease.terms || {};

          setTenantMode("existing");

          const tBilling = terms?.billing || {};
          const tAgeing = terms?.ageing || {};
          const tAr = terms?.ar || {};

          setFormData((prev) => ({
            ...prev,
            leaseId: lease.lease_id || prev.leaseId,
            versionNumber: lease.version_number || prev.versionNumber,
            status: STATUS_API_TO_UI[lease.status] || "Draft",
            agreementType: lease.agreement_type || prev.agreementType,
            siteId: lease.site_id ? String(lease.site_id) : "",
            tenantId: lease.tenant ? String(lease.tenant) : "",
            primaryContactId: lease.primary_contact_id ? String(lease.primary_contact_id) : "",
            leaseCommencementDate: lease.commencement_date || "",
            leaseExpiryDate: lease.expiry_date || "",
            initialTerm: terms?.tenure?.initial_term_months ?? prev.initialTerm,
            lockInPeriodStartDate: terms?.tenure?.lockin_start_date || "",
            lockInPeriodEndDate: terms?.tenure?.lockin_end_date || "",
            noticeRenewal: terms?.tenure?.notice_period_renewal_days ?? prev.noticeRenewal,
            noticeLandlord:
              terms?.tenure?.notice_period_termination_landlord_days ??
              prev.noticeLandlord,

            rentFreeStartDate: terms?.rent_free?.start_date || "",
            rentFreeEndDate: terms?.rent_free?.end_date || "",
            rentFreeDays: terms?.rent_free?.duration_months ?? "",

            fitoutStartDate: terms?.fitout?.start_date || "",
            fitoutEndDate: terms?.fitout?.expected_completion_date || "",
            camDuringFitout:
              FITOUT_CAM_API_TO_UI[terms?.fitout?.cam_during_fitout] || "Yes",
            fitoutCompletionCertRequired: !!terms?.fitout?.completion_certificate_required,

            billingFrequency:
              BILL_FREQ_API_TO_UI[terms?.base_rent?.billing_frequency] ||
              prev.billingFrequency,
            firstRentDueDate: terms?.base_rent?.first_rent_due_date || "",

            escalationType:
              ESC_API_TO_UI[terms?.escalation?.type] || prev.escalationType,
            currentEscalationValue:
              terms?.escalation?.value_percent != null
                ? `${terms.escalation.value_percent}%`
                : prev.currentEscalationValue,
            nextReviewDate: terms?.escalation?.next_review_date || "",
            effectiveFrom: terms?.escalation?.effective_from || "",
            effectiveTo: terms?.escalation?.effective_to || "",

            camAllocationBasis:
              CAM_BASIS_API_TO_UI[terms?.cam?.allocation_basis] ||
              prev.camAllocationBasis,
            estimatedCAMMonthly:
              terms?.cam?.estimated_monthly != null
                ? String(terms.cam.estimated_monthly)
                : prev.estimatedCAMMonthly,

            securityDepositAmount:
              terms?.deposit?.security_deposit_amount != null
                ? String(terms.deposit.security_deposit_amount)
                : prev.securityDepositAmount,

            depositHeldBy: terms?.deposit?.deposit_held_by || "",
            refundConditions: terms?.deposit?.refund_conditions || "",

            revenueRecognitionMethod:
              REV_API_TO_UI[terms?.revenue?.recognition_method] ||
              prev.revenueRecognitionMethod,
            deferredRentSetup: terms?.revenue?.deferred_rent_setup ? "Yes" : "No",

            /* billing fields */
            invoiceGenerateRule:
              tBilling?.invoice_generate_rule ||
              prev.invoiceGenerateRule ||
              "1ST_DAY_OF_MONTH",
            invoiceGraceDays:
              tBilling?.grace_days != null
                ? String(tBilling.grace_days)
                : prev.invoiceGraceDays,
            invoiceLateFeeFlat:
              tBilling?.late_fee_flat != null
                ? String(tBilling.late_fee_flat)
                : prev.invoiceLateFeeFlat,
            invoiceInterestAnnualPercent:
              tBilling?.interest_annual_percent != null
                ? String(tBilling.interest_annual_percent)
                : prev.invoiceInterestAnnualPercent,
          }));

          const buckets = Array.isArray(tAgeing?.buckets) ? tAgeing.buckets : null;
          if (buckets && buckets.length) {
            setAgeingBuckets(
              buckets.map((b) => ({
                label: b?.label ?? "",
                from_days: b?.from_days != null ? String(b.from_days) : "",
                to_days: b?.to_days != null ? String(b.to_days) : "",
              }))
            );
          }

          setArRules((prev) => ({
            ...prev,
            dispute_hold: tAr?.dispute_hold ?? prev.dispute_hold,
            stop_interest_on_dispute:
              tAr?.stop_interest_on_dispute ?? prev.stop_interest_on_dispute,
            stop_reminders_on_dispute:
              tAr?.stop_reminders_on_dispute ?? prev.stop_reminders_on_dispute,
            credit_note_allowed: tAr?.credit_note_allowed ?? prev.credit_note_allowed,
            credit_note_requires_approval:
              tAr?.credit_note_requires_approval ?? prev.credit_note_requires_approval,
          }));

          const rows = (allocs || []).map((a) => ({
            unit_id: a.unit_id ?? a.unit ?? null,
            code: a.unit_code || a.unit_no || a.unit_label || "",
            area: a.allocated_area_sqft ?? a.allocated_area ?? "",
            share: a.share_percent ?? a.share ?? "",
            usage_type: "Office",
          }));

          setAllocations(
            rows.length
              ? rows.map((r) => ({
                  ...r,
                  unit_id: r.unit_id ? Number(r.unit_id) : null,
                  area: r.area != null ? String(r.area) : "",
                  share: r.share != null ? String(r.share) : "",
                }))
              : [{ unit_id: null, code: "", area: "", share: "", usage_type: "Office" }]
          );

          setLeaseDocs(Array.isArray(docs) ? docs : docs?.results || []);

          setStepIdx((s) => (s === 0 ? 1 : s));
          refreshVersions(leaseDbId);
        }
      } catch (e) {
        if (!mounted) return;
        setPageError(e?.message || "Failed to load lease page data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [ctx.scopeId, ctx.scopeType, ctx.orgId, ctx.unitType, leaseDbId]);

  /* ---------------- tenant contacts ---------------- */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!formData.tenantId) {
        setContacts([]);
        return;
      }
      try {
        const resp = await tenantAPI.getContacts(formData.tenantId);
        const list = resp?.results || resp || [];
        if (!mounted) return;
        setContacts(Array.isArray(list) ? list : []);
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [formData.tenantId]);

  /* ---------------- site -> units table ---------------- */
  useEffect(() => {
  let mounted = true;

  const run = async () => {
    if (!formData.siteId) {
      setAvailabilityTree(null);
      setSelectedTowerId(null);
      setSelectedFloorId(null);
      setUnitSelections({});
      setFloorSelectMode("MANUAL");
      setFloorCustomArea("");
      return;
    }

    try {
      const resp = await leaseAPI.getAvailabilityTree(formData.siteId, 1);
if (!mounted) return;

const towers = resp?.towers || [];
const t0 = towers[0] || null;
const f0 = t0?.floors?.[0] || null;

setAvailabilityTree(resp || null);
setSelectedTowerId(t0?.tower_id ?? null);
setSelectedFloorId(f0?.floor_id ?? null);

// choose one behavior (default select first floor OR empty)
// Option A: default select first floor:
setSelectedFloorIds(f0?.floor_id ? [String(f0.floor_id)] : []);

// reset selections
setUnitSelections({});
setFloorTargets({});
setBuilderMode("MANUAL");
setBuilderNeedArea("");


    } catch (e) {
      if (!mounted) return;
      setAvailabilityTree(null);
      setUnitSelections({});
    }
  };

  run();
  return () => {
    mounted = false;
  };
}, [formData.siteId]);


  /* ---------------- auto-calc months ---------------- */
  useEffect(() => {
    const m = monthsBetween(formData.leaseCommencementDate, formData.leaseExpiryDate);
    if (m !== "" && String(formData.initialTerm || "") !== String(m)) {
      setFormData((p) => ({ ...p, initialTerm: String(m) }));
    }
  }, [formData.leaseCommencementDate, formData.leaseExpiryDate]);

  useEffect(() => {
    const m = monthsBetween(formData.rentFreeStartDate, formData.rentFreeEndDate);
    if (m !== "" && String(formData.rentFreeDays || "") !== String(m)) {
      setFormData((p) => ({ ...p, rentFreeDays: String(m) }));
    }
  }, [formData.rentFreeStartDate, formData.rentFreeEndDate]);

  /* ---------------- payload & save ---------------- */
  const buildBundlePayload = (statusApi) => {
    const tenantId = toNum(formData.tenantId);
    const primaryContactId = toNum(formData.primaryContactId, null);
    const siteId = toNum(formData.siteId);
    const escalationPct = parseFloat(stripMoney(formData.currentEscalationValue)) || 0;

    const ageingPayload = {
      buckets: (ageingBuckets || [])
        .filter((b) => String(b?.label || "").trim() !== "")
        .map((b) => ({
          label: String(b.label || "").trim(),
          from_days: toNum(b.from_days, 0),
          to_days: String(b.to_days ?? "").trim() === "" ? null : toNum(b.to_days, null),
        })),
    };

    return {
      lease: {
        lease_id: formData.leaseId,
        version_number: formData.versionNumber,
        status: statusApi,
        agreement_type: formData.agreementType,

        landlord_scope_type: ctx.scopeType,
        landlord_scope_id: Number(ctx.scopeId),

        tenant: tenantId,
        primary_contact_id: primaryContactId,

        site_id: siteId,

        commencement_date: formData.leaseCommencementDate || null,
        expiry_date: formData.leaseExpiryDate || null,

        terms: {
          tenure: {
            initial_term_months: toNum(formData.initialTerm, 0),
            lockin_start_date: formData.lockInPeriodStartDate || null,
            lockin_end_date: formData.lockInPeriodEndDate || null,
            notice_period_renewal_days: toNum(formData.noticeRenewal, 0),
            notice_period_termination_landlord_days: toNum(formData.noticeLandlord, 0),
          },
          rent_free: {
            start_date: formData.rentFreeStartDate || null,
            end_date: formData.rentFreeEndDate || null,
            duration_months: toNum(formData.rentFreeDays, 0),
          },
          fitout: {
            start_date: formData.fitoutStartDate || null,
            expected_completion_date: formData.fitoutEndDate || null,
            cam_during_fitout: FITOUT_CAM_UI_TO_API[formData.camDuringFitout] || "YES",
            completion_certificate_required: !!formData.fitoutCompletionCertRequired,
          },
          base_rent: {
            billing_frequency: BILL_FREQ_UI_TO_API[formData.billingFrequency] || "MONTHLY",
            payment_due_rule: "5TH_DAY",
            first_rent_due_date: formData.firstRentDueDate || null,
          },
          escalation: {
            type: ESC_UI_TO_API[formData.escalationType] || "FIXED_PERCENT",
            value_percent: escalationPct,
            next_review_date: formData.nextReviewDate || null,
            effective_from: formData.effectiveFrom || null,
            effective_to: formData.effectiveTo || null,
          },
          cam: {
            allocation_basis: CAM_BASIS_UI_TO_API[formData.camAllocationBasis] || "PRO_RATA",
            estimated_monthly: parseFloat(stripMoney(formData.estimatedCAMMonthly)) || 0,
            property_tax: "INCLUDED",
            utilities: "TENANT_DIRECT",
            insurance: "LANDLORD",
          },
          deposit: {
            security_deposit_amount: parseFloat(stripMoney(formData.securityDepositAmount)) || 0,
            deposit_held_by: formData.depositHeldBy || "",
            refund_conditions: formData.refundConditions || "",
          },
          revenue: {
            recognition_method: REV_UI_TO_API[formData.revenueRecognitionMethod] || "STRAIGHT_LINE",
            deferred_rent_setup: formData.deferredRentSetup === "Yes",
          },

          /* billing + ageing + ar */
          billing: {
            invoice_generate_rule: formData.invoiceGenerateRule || "1ST_DAY_OF_MONTH",
            grace_days: toNum(formData.invoiceGraceDays, 0),
            late_fee_flat: parseFloat(stripMoney(formData.invoiceLateFeeFlat)) || 0,
            interest_annual_percent: parseFloat(stripMoney(formData.invoiceInterestAnnualPercent)) || 0,
          },

          ageing: ageingPayload,

          ar: {
            dispute_hold: !!arRules.dispute_hold,
            stop_interest_on_dispute: !!arRules.stop_interest_on_dispute,
            stop_reminders_on_dispute: !!arRules.stop_reminders_on_dispute,
            credit_note_allowed: !!arRules.credit_note_allowed,
            credit_note_requires_approval: !!arRules.credit_note_requires_approval,
          },
        },
      },

      allocations: allocations
        .filter((r) => isNumberLike(r.unit_id))
        .map((r) => ({
          unit_id: Number(r.unit_id),
          allocated_area_sqft: String(r.area || ""),
          share_percent: String(r.share || ""),
          base_rent_rate: String(stripMoney(formData.baseRentAmount || "")),
          base_rent_rate_type: "PER_SQFT",
          cam_rate: String(stripMoney(formData.estimatedCAMMonthly || "")),
          cam_rate_type: "PER_SQFT",
        })),

      clauses: [],
      documents: [],
    };
  };

  // ✅ Save (Draft/Normal) — FIXED (await is inside async)
const handleSave = async (mode = "ACTIVE") => {
  setSaving(true);
  try {
    // If you want draft via submitAgreement:
    if (mode === "DRAFT") {
      const payload = buildSubmitPayload(); // buildSubmitPayload has no args in your code

      // Draft: keep validations light (adjust as you want)
      if (!payload?.lease?.tenant_id) throw new Error("Tenant is required");
      if (!payload?.lease?.site_id) throw new Error("Site is required");

      const resp = await leaseAPI.submitAgreement(payload);

      alert("Draft saved");
      if (onClose) onClose(resp);
      return;
    }

    // Normal save via bundle (your existing behavior)
    const statusApi = STATUS_UI_TO_API[formData.status] || "ACTIVE";
    const payload = buildBundlePayload(statusApi);

    if (!payload?.lease?.tenant) throw new Error("Tenant is required");
    if (!payload?.lease?.site_id) throw new Error("Site (Property/Building) is required");
    if (!payload?.lease?.lease_id) throw new Error("Lease ID is required");

    const resp = leaseDbId
      ? await leaseAPI.updateLeaseBundle(leaseDbId, payload)
      : await leaseAPI.createLeaseBundle(payload);

    alert("Lease saved");
    if (onClose) onClose(resp);
  } catch (e) {
    alert(e?.message || "Save failed");
  } finally {
    setSaving(false);
  }
};

  const uploadDoc = async (file, docTypeArg = "AGREEMENT", title = "") => {
    if (!leaseDbId) {
      alert("Save the lease first (create) before uploading documents.");
      return;
    }
    if (!file) return;

    try {
      const fd = new FormData();
      fd.append("lease", String(leaseDbId));
      fd.append("doc_type", docTypeArg);
      fd.append("title", title || file.name);
      fd.append("file", file);

      await leaseAPI.uploadLeaseDocument(fd);
      alert("Document uploaded");

      try {
        const docs = await leaseAPI.listDocuments(leaseDbId);
        setLeaseDocs(Array.isArray(docs) ? docs : docs?.results || []);
      } catch {
        // ignore
      }
    } catch (e) {
      alert(e?.message || "Upload failed");
    }
  };

  const deleteDoc = async (docId) => {
    if (!leaseDbId) return;
    if (!docId) return;
    if (!window.confirm("Delete this document?")) return;

    try {
      const resp = await callFirstAvailable(
        [leaseAPI?.deleteLeaseDocument, leaseAPI?.deleteDocument, leaseAPI?.removeDocument],
        docId
      );
      const docs = await leaseAPI.listDocuments(leaseDbId);
      setLeaseDocs(Array.isArray(docs) ? docs : docs?.results || []);
      if (resp?.detail) alert(resp.detail);
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  };

  const toggleDocMetaFlag = async (doc, key) => {
    if (!leaseDbId) {
      alert("Save the lease first.");
      return;
    }
    try {
      const currentMeta = (doc && typeof doc.meta === "object" && doc.meta) || {};
      const nextMeta = { ...currentMeta, [key]: !currentMeta[key] };

      const docId = doc?.id ?? doc?.pk;
      if (!docId) throw new Error("Doc id missing");

      await callFirstAvailable(
        [leaseAPI?.updateLeaseDocument, leaseAPI?.patchLeaseDocument, leaseAPI?.updateDocument],
        docId,
        { meta: nextMeta }
      );

      const docs = await leaseAPI.listDocuments(leaseDbId);
      setLeaseDocs(Array.isArray(docs) ? docs : docs?.results || []);
    } catch (e) {
      alert(e?.message || "Update failed");
    }
  };

  /* ---------------- derived filters ---------------- */
  const filteredVersions = useMemo(() => {
    const q = (versionQuery || "").trim().toLowerCase();
    if (!q) return versions || [];
    return (versions || []).filter((v) => {
      const txt = [
        v?.version_number,
        v?.label,
        v?.summary,
        v?.updated_by_name,
        v?.updated_by,
        v?.created_by_name,
        v?.created_by,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return txt.includes(q);
    });
  }, [versions, versionQuery]);

  const filteredDocs = useMemo(() => {
    const q = (docQuery || "").trim().toLowerCase();
    if (!q) return leaseDocs || [];
    return (leaseDocs || []).filter((d) => {
      const txt = [d?.title, d?.doc_type, d?.file_name, d?.uploaded_by_name, d?.uploaded_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return txt.includes(q);
    });
  }, [leaseDocs, docQuery]);




  // ✅ Floor quick-select actions (MISSING before -> crash)
const buildFullFloorSelections = (units) => {
  const next = {};
  (units || []).forEach((u) => {
    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) return;

    const unitId = String(u.unit_id);
    next[unitId] = { allocation_mode: "FULL", segments: [] };
  });
  return next;
};

const buildGreedySelections = (units, target) => {
  let remaining = toFloat(target, 0);
  const next = {};

  for (const u of units || []) {
    if (remaining <= 0.01) break;

    const avail = toFloat(u.available_area_sqft, 0);
    if (avail <= 0) continue;

    const unitId = String(u.unit_id);
    const isResidential = String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
    const divisible = !!u.is_divisible && !isResidential;

    // If remaining can take full unit, take FULL
    if (remaining >= avail - 0.01) {
      next[unitId] = { allocation_mode: "FULL", segments: [] };
      remaining -= avail;
      continue;
    }

    // Remaining is smaller than unit availability
    // Only possible if divisible: take PARTIAL segment
    if (divisible) {
      const minDiv = toFloat(u.min_divisible_area_sqft, 0);
      if (remaining >= minDiv && remaining > 0.01) {
        next[unitId] = {
          allocation_mode: "PARTIAL",
          segments: [{ allocated_area_sqft: String(round2(remaining)) }],
        };
        remaining = 0;
      }
    }

    // If not divisible and remaining < avail -> skip this unit (user can adjust manually)
  }

  return next;
};

const selectFullFloor = () => {
  setFloorSelectMode("FULL_FLOOR");
  setFloorPercent(100);
  setFloorCustomArea("");
  setUnitSelections(buildFullFloorSelections(floorUnits));
};

const selectPercentFloor = (p) => {
  const pct = Math.max(0, Math.min(100, Number(p || 0)));
  setFloorSelectMode("PERCENT");
  setFloorPercent(pct);
  setFloorCustomArea("");

  const target = (floorAvailable * pct) / 100;
  setUnitSelections(buildGreedySelections(floorUnits, target));
};

const selectCustomArea = (val) => {
  const v = String(val ?? "");

  // empty => back to manual
  if (v.trim() === "") {
    setFloorSelectMode("MANUAL");
    setFloorCustomArea("");
    setUnitSelections({});
    return;
  }

  setFloorSelectMode("CUSTOM_AREA");
  setFloorCustomArea(v);

  const target = toFloat(v, 0);
  setUnitSelections(buildGreedySelections(floorUnits, target));
};


  /* ---------------- step rendering ---------------- */
  const renderLeft = () => {
    switch (STEPS[stepIdx].key) {
      case "tenant":
        return (
          <Card
            title="Tenant Setup"
            // subtitle="Choose an existing tenant or create a new one to continue."
            rightTitle={!leaseDbId ? "Step 1 of 7" : "Locked for edits"}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-gray-800">
                How do you want to proceed?
              </div>
              <TogglePills
                value={tenantMode}
                onChange={handleTenantModeChange}
                left={{ value: "existing", label: "Select Existing" }}
                right={{ value: "new", label: "Create New" }}
                disabled={!!leaseDbId}
              />
            </div>

            {tenantMode === "existing" ? (
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Tenant*"
                  value={formData.tenantId}
                  onChange={(v) => handleExistingTenantSelect(v)}
                  options={tenantOptions}
                  disabled={creatingTenant}
                  helper="Selecting a tenant will automatically move you to the next step."
                />
                <div className="mt-7 text-sm text-gray-600">
                  <div className="font-medium text-gray-800">Tip</div>
                  <div className="text-xs text-gray-500 mt-1">
                    If the tenant is not in the list, switch to <b>Create New</b>.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="text-sm font-semibold text-blue-900">
                    Create New Tenant
                  </div>
                  <div className="text-xs text-blue-800 mt-1">
                    Fill below. On Continue we create: <b>Tenant → Contact → Preferences → KYC</b>
                  </div>
                </div>

                <Card title="1) Tenant Details" subtitle="Company / legal details used across leases.">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Legal Name*"
                      value={newTenant.legal_name}
                      onChange={(v) => setNewTenant((p) => ({ ...p, legal_name: v }))}
                      placeholder="e.g. ABC Pvt Ltd"
                    />
                    <Field
                      label="Trade Name"
                      value={newTenant.trade_name}
                      onChange={(v) => setNewTenant((p) => ({ ...p, trade_name: v }))}
                      placeholder="e.g. ABC Retail"
                    />
                    <Field
                      label="Email"
                      value={newTenant.email}
                      onChange={(v) => setNewTenant((p) => ({ ...p, email: v }))}
                      placeholder="accounts@company.com"
                    />
                    <Field
                      label="Phone"
                      value={newTenant.phone}
                      onChange={(v) => setNewTenant((p) => ({ ...p, phone: v }))}
                      placeholder="10-digit"
                    />
                    <Field
                      label="Address Line 1"
                      value={newTenant.address_line1}
                      onChange={(v) => setNewTenant((p) => ({ ...p, address_line1: v }))}
                      placeholder="Street / Building"
                    />
                    <Field
                      label="City"
                      value={newTenant.city}
                      onChange={(v) => setNewTenant((p) => ({ ...p, city: v }))}
                      placeholder="City"
                    />
                    <Field
                      label="State"
                      value={newTenant.state}
                      onChange={(v) => setNewTenant((p) => ({ ...p, state: v }))}
                      placeholder="State"
                    />
                    <Field
                      label="Pincode"
                      value={newTenant.pincode}
                      onChange={(v) => setNewTenant((p) => ({ ...p, pincode: v }))}
                      placeholder="e.g. 400001"
                    />
                  </div>
                </Card>

                <Card title="2) Primary Contact" subtitle="Linked to tenant; can be selected as Primary Contact on the lease.">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Name*"
                      value={newContact.name}
                      onChange={(v) => setNewContact((p) => ({ ...p, name: v }))}
                      placeholder="Contact Person"
                    />
                    <Field
                      label="Designation"
                      value={newContact.designation}
                      onChange={(v) => setNewContact((p) => ({ ...p, designation: v }))}
                      placeholder="e.g. Finance Manager"
                    />
                    <Field
                      label="Email"
                      value={newContact.email}
                      onChange={(v) => setNewContact((p) => ({ ...p, email: v }))}
                      placeholder="person@company.com"
                    />
                    <Field
                      label="Phone"
                      value={newContact.phone}
                      onChange={(v) => setNewContact((p) => ({ ...p, phone: v }))}
                      placeholder="10-digit"
                    />
                  </div>
                </Card>

                <Card title="3) Preferences" subtitle="Used for billing and communication defaults.">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Billing Email"
                      value={newPreferences.billing_email}
                      onChange={(v) => setNewPreferences((p) => ({ ...p, billing_email: v }))}
                      placeholder="billing@company.com"
                    />
                    <Field
                      label="Communication Email"
                      value={newPreferences.communication_email}
                      onChange={(v) => setNewPreferences((p) => ({ ...p, communication_email: v }))}
                      placeholder="ops@company.com"
                    />
                    <Field
                      label="Preferred Language"
                      value={newPreferences.preferred_language}
                      onChange={(v) => setNewPreferences((p) => ({ ...p, preferred_language: v }))}
                      placeholder="EN / HI / MR"
                    />
                    <Field
                      label="Timezone"
                      value={newPreferences.timezone}
                      onChange={(v) => setNewPreferences((p) => ({ ...p, timezone: v }))}
                      placeholder="Asia/Kolkata"
                    />
                  </div>
                </Card>

                <Card title="4) KYC" subtitle="Optional identifiers (as available).">
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="PAN"
                      value={newKYC.pan}
                      onChange={(v) => setNewKYC((p) => ({ ...p, pan: v }))}
                      placeholder="ABCDE1234F"
                    />
                    <Field
                      label="GSTIN"
                      value={newKYC.gstin}
                      onChange={(v) => setNewKYC((p) => ({ ...p, gstin: v }))}
                      placeholder="27ABCDE1234F1Z5"
                    />
                    <Field
                      label="CIN"
                      value={newKYC.cin}
                      onChange={(v) => setNewKYC((p) => ({ ...p, cin: v }))}
                      placeholder="U12345MH2010PTC123456"
                    />
                    <Field
                      label="KYC Status"
                      value={newKYC.kyc_status}
                      onChange={(v) => setNewKYC((p) => ({ ...p, kyc_status: v }))}
                      placeholder="PENDING / APPROVED"
                    />
                  </div>

                  {creatingTenant ? (
                    <div className="mt-3 text-sm text-blue-700">
                      Creating tenant... please wait
                    </div>
                  ) : null}
                </Card>
              </div>
            )}
          </Card>
        );
        case "property": {
  const towerOptionsLocal = (availabilityTree?.towers || []).map((t) => ({
    value: String(t.tower_id),
    label: t.tower_name || `Tower ${t.tower_id}`,
  }));

  const floors = selectedTower?.floors || [];

  // Selected Units table rows (across all selected floors)
  const selectedUnitRows = Object.entries(unitSelections || {})
    .map(([unitId, sel]) => {
      const u = availabilityIndex.unitsById[String(unitId)];
      if (!u) return null;

      const avail = round2(toFloat(u.available_area_sqft, 0));
      const isResidential = String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
      const divisible = !!u.is_divisible && !isResidential;

      let selectedSqft = 0;
      let mode = sel?.allocation_mode || (divisible ? "PARTIAL" : "FULL");

      if (mode === "FULL") selectedSqft = avail;
      else {
        const segs = Array.isArray(sel?.segments) ? sel.segments : [];
        selectedSqft = round2(segs.reduce((s, x) => s + toFloat(x.allocated_area_sqft, 0), 0));
        selectedSqft = Math.min(selectedSqft, avail);
        mode = "PARTIAL";
      }

      const typeLabel = `${u.unit_type || "—"}${
        divisible ? " (Divisible)" : isResidential ? "" : " (Non-div)"
      }`;

      return {
        unitId: String(unitId),
        name: u.unit_name || `Unit ${u.unit_id}`,
        typeLabel,
        avail,
        divisible,
        mode,
        selectedSqft,
      };
    })
    .filter(Boolean);

  const totalUnitsSelected = selectedUnitRows.length;
  const totalFloorsSelected = selectedFloorIds?.length || 0;

  return (
    <div className="space-y-4">
      {/* Top bar like screenshot */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-gray-900">Lease Allocation</div>
            <div className="text-xs text-gray-500 mt-1">
              Select floors, enter required area, auto-pick units. Edit split areas only if needed.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={formData.siteId || ""}
              onChange={(e) => handleInputChange("siteId", e.target.value)}
              disabled={!tenantReady}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              title="Site"
            >
              <option value="">Site: Select...</option>
              {siteOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTowerId || ""}
              onChange={(e) => {
                const nextTid = e.target.value || null;
                setSelectedTowerId(nextTid);

                const t = (availabilityTree?.towers || []).find(
                  (x) => String(x.tower_id) === String(nextTid)
                );
                const f0 = t?.floors?.[0] || null;

                setSelectedFloorId(f0?.floor_id ?? null);
                setSelectedFloorIds(f0?.floor_id ? [String(f0.floor_id)] : []);
                clearAllAllocationUI();
              }}
              disabled={!availabilityTree}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              title="Tower"
            >
              <option value="">Tower: Select...</option>
              {towerOptionsLocal.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearAllAllocationUI}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
            >
              Clear
            </button>

            {/* <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={saving || selectionInvalid || !totalUnitsSelected}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              Submit
            </button> */}
          </div>
        </div>
      </div>

      {!availabilityTree ? (
        <div className="text-sm text-gray-600">Select a Site to load availability...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Floors */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Floors</div>

              <button
                type="button"
                onClick={() => {
                  // apply 50% to each selected floor
                  for (const fid of selectedFloorIds || []) {
                    applyPickForFloor(fid, "PERCENT", 50);
                  }
                }}
                className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              >
                Apply 50% to Selected
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              {floors.map((f) => {
                const fid = String(f.floor_id);
                const checked = (selectedFloorIds || []).some((x) => String(x) === fid);

                const total = round2(toFloat(f.floor_total_area_sqft, 0));
                const avail = round2(toFloat(f.floor_available_area_sqft, 0));
                const reserved = round2(Math.max(0, total - avail));

                const picked = round2(toFloat(selectedAreaByFloor[fid] || 0, 0));

                const status =
                  avail <= 0
                    ? { t: "red", label: "UNAVAILABLE" }
                    : picked >= avail - 0.01
                    ? { t: "green", label: "FULL" }
                    : picked > 0
                    ? { t: "blue", label: "PARTIAL" }
                    : { t: "green", label: "AVAILABLE" };

                const floorTarget = floorTargets?.[fid] ? round2(toFloat(floorTargets[fid], 0)) : null;
                const floorRemaining = floorTarget == null ? null : round2(floorTarget - picked);

                return (
                  <div key={fid} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFloorChecked(fid)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {f.floor_name || `Floor ${f.floor_number ?? f.floor_id}`}
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-600">
                            <div>
                              <div className="text-gray-400">Total</div>
                              <div className="font-semibold text-gray-800 tabular-nums">{total.toLocaleString()} sqft</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Reserved</div>
                              <div className="font-semibold text-gray-800 tabular-nums">{reserved.toLocaleString()} sqft</div>
                            </div>
                            <div>
                              <div className="text-gray-400">Available</div>
                              <div className="font-semibold text-gray-800 tabular-nums">{avail.toLocaleString()} sqft</div>
                            </div>
                          </div>
                        </div>
                      </label>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <Pill tone={status.t}>{status.label}</Pill>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFloorId(fid);
                            setUnitsModalOpen(true);
                          }}
                          className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                        >
                          View units
                        </button>
                      </div>
                    </div>

                    {/* Per-floor quick chips like screenshot */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip disabled={!checked || avail <= 0} onClick={() => applyPickForFloor(fid, "FULL")}>
                        FULL
                      </Chip>
                      {[25, 50, 75].map((p) => (
                        <Chip
                          key={p}
                          disabled={!checked || avail <= 0}
                          onClick={() => applyPickForFloor(fid, "PERCENT", p)}
                        >
                          {p}%
                        </Chip>
                      ))}
                    </div>

                    {/* Custom area */}
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold text-gray-700 mb-1">Custom Area (sqft)</div>
                      <input
                        type="number"
                        disabled={!checked || avail <= 0}
                        placeholder="Enter sqft..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            applyPickForFloor(fid, "CUSTOM", e.currentTarget.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:opacity-60"
                      />
                      <div className="text-[11px] text-gray-500 mt-1">
                        Press Enter to apply (max {avail.toLocaleString()} sqft)
                      </div>
                    </div>

                    {/* Per-floor target/selected/remaining */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <StatTile label="Target" value={floorTarget == null ? "—" : `${floorTarget.toLocaleString()} sqft`} />
                      <StatTile label="Selected" value={`${picked.toLocaleString()} sqft`} accent />
                      <StatTile
                        label="Remaining"
                        value={floorRemaining == null ? "—" : `${floorRemaining.toLocaleString()} sqft`}
                        accent={floorRemaining != null && Math.abs(floorRemaining) < 0.01}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Allocation Builder + Selected Units */}
          <div className="lg:col-span-2 space-y-4">
            {/* Allocation Builder */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">Allocation Builder</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Enter required sqft OR use % chips, then Auto Pick
                  </div>
                </div>

                <button
                  type="button"
                  onClick={autoPickFromBuilder}
                  disabled={selectionInvalid || builderMode === "MANUAL"}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  Auto Pick
                </button>
              </div>

              <div className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Need area</div>
                    <input
                      value={builderNeedArea}
                      onChange={(e) => {
                        setBuilderNeedArea(e.target.value);
                        setBuilderMode(e.target.value.trim() ? "NEED" : "MANUAL");
                      }}
                      placeholder="Enter sqft (e.g., 4200)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">
                      Tip: Select floors first. FULL means “use all available area from selected floors”.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[25, 50, 75].map((p) => (
                      <Chip
                        key={p}
                        active={builderMode === "PERCENT" && Number(builderPercent) === p}
                        onClick={() => {
                          setBuilderMode("PERCENT");
                          setBuilderPercent(p);
                          setBuilderNeedArea("");
                        }}
                      >
                        {p}%
                      </Chip>
                    ))}
                    <Chip
                      active={builderMode === "FULL"}
                      onClick={() => {
                        setBuilderMode("FULL");
                        setBuilderNeedArea("");
                      }}
                    >
                      FULL
                    </Chip>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatTile label="Floors Selected" value={String(totalFloorsSelected)} />
                  <StatTile label="Floor Available Total" value={`${selectedFloorsAvailableTotal.toLocaleString()} sqft`} />
                  <StatTile
                    label="Remaining"
                    value={remainingArea == null ? "0" : `${remainingArea.toLocaleString()} sqft`}
                    accent
                  />
                </div>

                {selectionInvalid ? (
                  <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    Allocation doesn’t match the target (or target is invalid). Adjust floors/target and run Auto Pick again.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Selected Units */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">
                  Selected Units <span className="text-gray-500 font-normal">— {totalUnitsSelected} units selected</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnitSelections({})}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                >
                  Clear Selected
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr className="text-xs text-gray-500 border-b border-gray-200">
                      <th className="text-left px-4 py-3">Unit</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Avail</th>
                      <th className="text-left px-4 py-3">Mode</th>
                      <th className="text-left px-4 py-3">Selected</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {selectedUnitRows.length ? (
                      selectedUnitRows.map((r) => (
                        <tr key={r.unitId} className="align-top">
                          <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                          <td className="px-4 py-3 text-gray-700">{r.typeLabel}</td>
                          <td className="px-4 py-3 text-gray-700 tabular-nums">{r.avail.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <ModePill mode={r.avail <= 0 ? "LOCKED" : r.mode} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                            {r.selectedSqft.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {r.divisible ? (
                              <button
                                type="button"
                                onClick={() => setEditSplitUnitId(r.unitId)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Edit split
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                            <span className="text-gray-300 mx-2">·</span>
                            <button
                              type="button"
                              onClick={() => removeSelection(r.unitId)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-gray-500" colSpan={6}>
                          No units selected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile label="Total Floors" value={String(totalFloorsSelected)} />
                  <StatTile label="Total Units" value={String(totalUnitsSelected)} />
                  <StatTile label="Total Allocated" value={`${selectedAreaTotal.toLocaleString()} sqft`} accent />
                  <StatTile
                    label="Remaining"
                    value={remainingArea == null ? "0" : `${remainingArea.toLocaleString()} sqft`}
                    accent
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <StatTile label="Total Units" value={String(totalUnitsSelected)} />
                  <StatTile label="Total Selected Area" value={`${selectedAreaTotal.toLocaleString()} sqft`} accent />
                  <StatTile label="Target" value={targetArea == null ? "0" : `${targetArea.toLocaleString()} sqft`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  //      case "property":
  // return (
  //   <Card
  //     title="Property & Units"
  //     subtitle="Select Tenant → Site → Tower → Floor → Units (full/partial + segments)."
  //   >
  //     {/* ✅ TOP ROW: Tenant + Property (as you asked) */}
  //     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  //       <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
  //         <Select
  //           label="Tenant*"
  //           value={formData.tenantId}
  //           onChange={(v) => {
  //             // keep behaviour same as your existing tenant select
  //             if (leaseDbId) return;
  //             handleExistingTenantSelect(v);
  //           }}
  //           options={tenantOptions}
  //           disabled={!!leaseDbId}
  //           helper={
  //             leaseDbId
  //               ? "Tenant locked for existing lease."
  //               : "Select tenant here or from Tenant Setup step."
  //           }
  //         />

  //         <Select
  //           label="Property (Site)*"
  //           value={formData.siteId}
  //           onChange={(v) => handleInputChange("siteId", v)}
  //           options={siteOptions}
  //           disabled={!tenantReady}
  //           helper={!tenantReady ? "Select Tenant first." : ""}
  //         />
  //       </div>

  //       {/* ✅ Small status box (right side) */}
  //       <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
  //         <div className="text-xs font-semibold text-gray-700">Selection Summary</div>

  //         <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
  //           <div className="text-gray-500">Tower</div>
  //           <div className="text-gray-900 font-medium truncate">
  //             {selectedTower?.tower_name || (selectedTowerId ? `#${selectedTowerId}` : "—")}
  //           </div>

  //           <div className="text-gray-500">Floor</div>
  //           <div className="text-gray-900 font-medium truncate">
  //             {selectedFloor?.floor_name ||
  //               (selectedFloorId ? `#${selectedFloorId}` : "—")}
  //           </div>

  //           <div className="text-gray-500">Target</div>
  //           <div className="text-gray-900 font-medium">
  //             {targetArea === null ? "—" : `${round2(targetArea)} sqft`}
  //           </div>

  //           <div className="text-gray-500">Selected</div>
  //           <div className={`font-semibold ${selectionInvalid ? "text-red-700" : "text-gray-900"}`}>
  //             {round2(selectedAreaTotal)} sqft
  //           </div>

  //           <div className="text-gray-500">Remaining</div>
  //           <div className={`font-semibold ${remainingArea !== null && remainingArea < -0.01 ? "text-red-700" : "text-gray-900"}`}>
  //             {remainingArea === null ? "—" : `${round2(remainingArea)} sqft`}
  //           </div>
  //         </div>

  //         {!leaseDbId ? (
  //           <button
  //             type="button"
  //             onClick={() => setStepIdx(0)}
  //             className="mt-3 w-full px-3 py-2 text-xs border border-gray-200 bg-white rounded-md hover:bg-gray-50"
  //           >
  //             Change / Create Tenant
  //           </button>
  //         ) : null}
  //       </div>
  //     </div>

  //     {/* ✅ guard */}
  //     {!tenantReady ? (
  //       <div className="mt-4 text-sm text-gray-600">
  //         Select Tenant first to enable Property selection.
  //       </div>
  //     ) : null}

  //     {!availabilityTree ? (
  //       <div className="mt-4 text-sm text-gray-600">
  //         Select a Site to load availability...
  //       </div>
  //     ) : (
  //       <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
  //         {/* ================= LEFT: Towers ================= */}
  //         <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
  //           <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
  //             <div className="text-xs font-semibold text-gray-700">Towers</div>
  //             <div className="text-[11px] text-gray-500">
  //               {(availabilityTree?.towers || []).length} total
  //             </div>
  //           </div>

  //           <div className="divide-y divide-gray-200">
  //             {(availabilityTree?.towers || []).map((t) => {
  //               const active = String(t.tower_id) === String(selectedTowerId);
  //               return (
  //                 <button
  //                   key={t.tower_id}
  //                   type="button"
  //                   onClick={() => {
  //                     setSelectedTowerId(t.tower_id);
  //                     const f0 = t?.floors?.[0] || null;
  //                     setSelectedFloorId(f0?.floor_id ?? null);
  //                     setUnitSelections({});
  //                     setFloorSelectMode("MANUAL");
  //                     setFloorCustomArea("");
  //                     setUnitQuery("");
  //                     setUnitFilter("ALL");
  //                   }}
  //                   className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
  //                     active ? "bg-blue-50" : ""
  //                   }`}
  //                 >
  //                   <div className="flex items-center justify-between gap-2">
  //                     <div className="font-medium text-gray-900 truncate">
  //                       {t.tower_name || `Tower ${t.tower_id}`}
  //                     </div>
  //                     {active ? (
  //                       <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white">
  //                         Active
  //                       </span>
  //                     ) : null}
  //                   </div>
  //                   <div className="mt-0.5 text-xs text-gray-500">
  //                     {(t.floors || []).length} floors
  //                   </div>
  //                 </button>
  //               );
  //             })}
  //           </div>
  //         </div>

  //         {/* ================= MIDDLE: Floors ================= */}
  //         <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
  //           <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
  //             <div className="flex items-center justify-between">
  //               <div className="text-xs font-semibold text-gray-700">Floors</div>
  //               <button
  //                 type="button"
  //                 onClick={() => {
  //                   setFloorSelectMode("MANUAL");
  //                   setFloorCustomArea("");
  //                   setFloorPercent(50);
  //                   setUnitSelections({});
  //                 }}
  //                 className="text-[11px] px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
  //               >
  //                 Reset
  //               </button>
  //             </div>

  //             {/* quick pick */}
  //             <div className="mt-3 flex flex-wrap gap-2">
  //               <button
  //                 type="button"
  //                 onClick={selectFullFloor}
  //                 className="px-3 py-1.5 text-xs rounded-md border border-gray-200 bg-white hover:bg-gray-50"
  //               >
  //                 FULL Floor
  //               </button>
  //               {[25, 50, 75].map((p) => (
  //                 <button
  //                   key={p}
  //                   type="button"
  //                   onClick={() => selectPercentFloor(p)}
  //                   className={`px-3 py-1.5 text-xs rounded-md border ${
  //                     floorSelectMode === "PERCENT" && Number(floorPercent) === p
  //                       ? "border-blue-600 bg-blue-50 text-blue-700"
  //                       : "border-gray-200 bg-white hover:bg-gray-50"
  //                   }`}
  //                 >
  //                   {p}%
  //                 </button>
  //               ))}
  //             </div>

  //             {/* custom area */}
  //             <div className="mt-3">
  //               <label className="block text-xs font-semibold text-gray-700 mb-1">
  //                 Custom Area (sqft)
  //               </label>
  //               <input
  //                 type="number"
  //                 value={floorCustomArea}
  //                 onChange={(e) => selectCustomArea(e.target.value)}
  //                 placeholder={`<= ${round2(floorAvailable)} sqft`}
  //                 className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
  //                   floorSelectMode === "CUSTOM_AREA" && selectionInvalid
  //                     ? "border-red-300"
  //                     : "border-gray-300"
  //                 }`}
  //               />
  //               <div className="mt-2 text-[11px] text-gray-600">
  //                 Available: <span className="font-medium">{round2(floorAvailable)}</span> sqft
  //               </div>
  //             </div>
  //           </div>

  //           <div className="divide-y divide-gray-200">
  //             {(selectedTower?.floors || []).map((f) => {
  //               const isActive = String(f.floor_id) === String(selectedFloorId);
  //               const av = round2(toFloat(f.floor_available_area_sqft, 0));
  //               const tt = round2(toFloat(f.floor_total_area_sqft, 0));

  //               return (
  //                 <button
  //                   key={f.floor_id}
  //                   type="button"
  //                   onClick={() => {
  //                     setSelectedFloorId(f.floor_id);
  //                     setUnitSelections({});
  //                     setFloorSelectMode("MANUAL");
  //                     setFloorCustomArea("");
  //                     setUnitQuery("");
  //                     setUnitFilter("ALL");
  //                   }}
  //                   className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
  //                     isActive ? "bg-blue-50" : ""
  //                   }`}
  //                 >
  //                   <div className="flex items-center justify-between gap-2">
  //                     <div className="font-medium text-gray-900 truncate">
  //                       {f.floor_name || `Floor ${f.floor_number ?? f.floor_id}`}
  //                     </div>
  //                     <span
  //                       className={`text-[11px] px-2 py-0.5 rounded-full border ${
  //                         av > 0
  //                           ? "bg-green-50 border-green-200 text-green-700"
  //                           : "bg-red-50 border-red-200 text-red-700"
  //                       }`}
  //                     >
  //                       {av} avail
  //                     </span>
  //                   </div>
  //                   <div className="mt-0.5 text-xs text-gray-500">
  //                     Total: {tt} sqft
  //                   </div>
  //                 </button>
  //               );
  //             })}
  //           </div>
  //         </div>

  //         {/* ================= RIGHT: Units ================= */}
  //         <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
  //           <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
  //             <div className="flex items-center justify-between gap-2">
  //               <div className="text-xs font-semibold text-gray-700">Units</div>

  //               <div className="flex items-center gap-2">
  //                 <button
  //                   type="button"
  //                   onClick={() => setUnitFilter("ALL")}
  //                   className={`text-[11px] px-2 py-1 rounded-md border ${
  //                     unitFilter === "ALL"
  //                       ? "border-blue-600 bg-blue-50 text-blue-700"
  //                       : "border-gray-200 bg-white hover:bg-gray-50"
  //                   }`}
  //                 >
  //                   All
  //                 </button>
  //                 <button
  //                   type="button"
  //                   onClick={() => setUnitFilter("AVAILABLE")}
  //                   className={`text-[11px] px-2 py-1 rounded-md border ${
  //                     unitFilter === "AVAILABLE"
  //                       ? "border-blue-600 bg-blue-50 text-blue-700"
  //                       : "border-gray-200 bg-white hover:bg-gray-50"
  //                   }`}
  //                 >
  //                   Available
  //                 </button>
  //                 <button
  //                   type="button"
  //                   onClick={() => setUnitFilter("SELECTED")}
  //                   className={`text-[11px] px-2 py-1 rounded-md border ${
  //                     unitFilter === "SELECTED"
  //                       ? "border-blue-600 bg-blue-50 text-blue-700"
  //                       : "border-gray-200 bg-white hover:bg-gray-50"
  //                   }`}
  //                 >
  //                   Selected
  //                 </button>
  //               </div>
  //             </div>

  //             <div className="mt-3">
  //               <input
  //                 value={unitQuery}
  //                 onChange={(e) => setUnitQuery(e.target.value)}
  //                 placeholder="Search unit (name/type/id)..."
  //                 className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  //               />
  //             </div>
  //           </div>

  //           <div className="divide-y divide-gray-200">
  //             {(filteredFloorUnits || []).length ? (
  //               filteredFloorUnits.map((u) => {
  //                 const unitId = String(u.unit_id);
  //                 const avail = toFloat(u.available_area_sqft, 0);
  //                 const selected = !!unitSelections?.[unitId];

  //                 const isResidential =
  //                   String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
  //                 const divisible = !!u.is_divisible && !isResidential;
  //                 const disabled = avail <= 0;

  //                 const sel = unitSelections?.[unitId] || null;
  //                 const segs = Array.isArray(sel?.segments) ? sel.segments : [];
  //                 const segSum = round2(
  //                   segs.reduce((s, x) => s + toFloat(x.allocated_area_sqft, 0), 0)
  //                 );

  //                 return (
  //                   <div key={unitId} className={`px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
  //                     <div className="flex items-start justify-between gap-3">
  //                       <button
  //                         type="button"
  //                         disabled={disabled}
  //                         onClick={() => toggleUnit(u)}
  //                         className={`text-left flex-1 ${disabled ? "cursor-not-allowed" : ""}`}
  //                       >
  //                         <div className="flex items-center gap-2">
  //                           <div
  //                             className={`w-4 h-4 rounded border ${
  //                               selected
  //                                 ? "bg-blue-600 border-blue-600"
  //                                 : "bg-white border-gray-300"
  //                             }`}
  //                           />
  //                           <div className="font-medium text-gray-900 truncate">
  //                             {u.unit_name || `Unit ${u.unit_id}`}
  //                           </div>

  //                           <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
  //                             {u.unit_type || "—"}
  //                           </span>

  //                           {divisible ? (
  //                             <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
  //                               Divisible
  //                             </span>
  //                           ) : null}
  //                         </div>

  //                         <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
  //                           <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700">
  //                             Total: {round2(toFloat(u.total_area_sqft, 0))}
  //                           </span>
  //                           <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-700">
  //                             Reserved: {round2(toFloat(u.reserved_area_sqft, 0))}
  //                           </span>
  //                           <span
  //                             className={`px-2 py-0.5 rounded border ${
  //                               avail > 0
  //                                 ? "bg-green-50 border-green-200 text-green-700"
  //                                 : "bg-red-50 border-red-200 text-red-700"
  //                             }`}
  //                           >
  //                             Available: {round2(avail)}
  //                           </span>
  //                         </div>
  //                       </button>

  //                       {/* mode selector */}
  //                       {selected && divisible ? (
  //                         <select
  //                           value={sel?.allocation_mode || "PARTIAL"}
  //                           onChange={(e) => setUnitMode(u, e.target.value)}
  //                           className="shrink-0 px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
  //                         >
  //                           <option value="FULL">FULL</option>
  //                           <option value="PARTIAL">PARTIAL</option>
  //                         </select>
  //                       ) : selected ? (
  //                         <div className="shrink-0 text-xs font-semibold text-gray-800">
  //                           FULL
  //                         </div>
  //                       ) : null}
  //                     </div>

  //                     {/* details */}
  //                     {selected ? (
  //                       <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
  //                         {!divisible || sel?.allocation_mode === "FULL" ? (
  //                           <div className="text-xs text-gray-700">
  //                             Selected Area: <b>{round2(avail)}</b> sqft (FULL)
  //                           </div>
  //                         ) : (
  //                           <div className="space-y-2">
  //                             <div className="flex items-center justify-between text-xs text-gray-700">
  //                               <span>Segments total</span>
  //                               <span className="font-semibold">
  //                                 {segSum} / {round2(avail)} sqft
  //                               </span>
  //                             </div>

  //                             {segs.map((s, i) => (
  //                               <div key={i} className="flex items-center gap-2">
  //                                 <input
  //                                   type="number"
  //                                   value={s.allocated_area_sqft ?? ""}
  //                                   onChange={(e) => updateSegment(unitId, i, e.target.value)}
  //                                   className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
  //                                   placeholder={`>= ${u.min_divisible_area_sqft ?? 0}`}
  //                                 />
  //                                 <button
  //                                   type="button"
  //                                   onClick={() => removeSegment(unitId, i)}
  //                                   className="px-2 py-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50"
  //                                 >
  //                                   Remove
  //                                 </button>
  //                               </div>
  //                             ))}

  //                             <button
  //                               type="button"
  //                               onClick={() => addSegment(u)}
  //                               className="px-3 py-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50"
  //                             >
  //                               + Add segment
  //                             </button>

  //                             {selectionInvalid ? (
  //                               <div className="text-[11px] text-red-700">
  //                                 Your selection doesn’t match the target area (Percent/Custom). Adjust segments.
  //                               </div>
  //                             ) : null}
  //                           </div>
  //                         )}
  //                       </div>
  //                     ) : null}
  //                   </div>
  //                 );
  //               })
  //             ) : (
  //               <div className="px-4 py-6 text-sm text-gray-500">
  //                 No units found.
  //               </div>
  //             )}
  //           </div>

  //           <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
  //             <button
  //               type="button"
  //               onClick={clearUnitSelections}
  //               className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-md hover:bg-gray-50"
  //             >
  //               Clear Selection
  //             </button>

  //             <div className="text-[11px] text-gray-600">
  //               Selected:{" "}
  //               <span className="font-semibold">
  //                 {Object.keys(unitSelections || {}).length}
  //               </span>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     )}
  //   </Card>
  // );


      // case "property":
      //   return (
      //     <Card title="Property & Units">
      //       <div className="grid grid-cols-2 gap-4">
      //         <Select
      //           label="Property (Site)*"
      //           value={formData.siteId}
      //           onChange={(v) => handleInputChange("siteId", v)}
      //           options={siteOptions}
      //         />
      //         <div />
      //       </div>

      //       <div className="mt-4">
      //         <div className="text-sm font-semibold text-gray-800 mb-3">
      //           Unit Allocation
      //         </div>

      //         <div className="border border-gray-200 rounded-lg overflow-hidden">
      //           <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-700">
      //             <div>Unit Code</div>
      //             <div>Allocated Area (sq.ft)</div>
      //             <div>% Share in Lease</div>
      //             <div>Usage Type</div>
      //             <div className="text-right">Actions</div>
      //           </div>

      //           <div className="divide-y divide-gray-200">
      //             {allocations.map((row, idx) => (
      //               <div
      //                 key={idx}
      //                 className="grid grid-cols-5 gap-3 px-4 py-3 items-center"
      //               >
      //                 <select
      //                   value={row.unit_id ?? ""}
      //                   onChange={(e) => handleSelectUnit(idx, e.target.value)}
      //                   className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      //                 >
      //                   <option value="">Select</option>
      //                   {(unitOptions || []).map((u) => {
      //                     const label =
      //                       u.unit_no ||
      //                       u.unit_code ||
      //                       u.code ||
      //                       u.name ||
      //                       u.title ||
      //                       `Unit ID: ${u.id}`;
      //                     return (
      //                       <option key={u.id} value={String(u.id)}>
      //                         {String(label)}
      //                       </option>
      //                     );
      //                   })}
      //                 </select>

      //                 <input
      //                   type="number"
      //                   value={row.area ?? ""}
      //                   onChange={(e) => updateAllocation(idx, { area: e.target.value })}
      //                   placeholder="e.g., 2500"
      //                   className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      //                 />

      //                 <input
      //                   type="number"
      //                   value={row.share ?? ""}
      //                   onChange={(e) => updateAllocation(idx, { share: e.target.value })}
      //                   placeholder="e.g., 33.33"
      //                   className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      //                 />

      //                 <select
      //                   value={row.usage_type || "Office"}
      //                   onChange={(e) => updateAllocation(idx, { usage_type: e.target.value })}
      //                   className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      //                 >
      //                   {UsageTypes.map((t) => (
      //                     <option key={t} value={t}>
      //                       {t}
      //                     </option>
      //                   ))}
      //                 </select>

      //                 <div className="flex justify-end">
      //                   {allocations.length > 1 ? (
      //                     <button
      //                       type="button"
      //                       onClick={() => removeAllocationRow(idx)}
      //                       className="p-2 rounded-md hover:bg-red-50 text-red-600"
      //                       title="Remove"
      //                     >
      //                       <Trash2 className="w-4 h-4" />
      //                     </button>
      //                   ) : (
      //                     <div className="w-8" />
      //                   )}
      //                 </div>
      //               </div>
      //             ))}
      //           </div>
      //         </div>

      //         <button
      //           type="button"
      //           onClick={addAllocationRow}
      //           className="mt-3 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
      //         >
      //           + Add Unit
      //         </button>
      //       </div>
      //     </Card>
      //   );

      case "term":
        return (
          <>
            <Card
              title="Lease Term & Dates"
              // rightTitle="Define the duration and important milestones for the lease agreement."
            >
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Lease Start Date"
                  type="date"
                  value={formData.leaseCommencementDate}
                  onChange={(v) => handleInputChange("leaseCommencementDate", v)}
                />
                <Field
                  label="Lease End Date"
                  type="date"
                  value={formData.leaseExpiryDate}
                  onChange={(v) => handleInputChange("leaseExpiryDate", v)}
                />
                <Field
                  label="Lease Term (Months)"
                  type="number"
                  value={formData.initialTerm}
                  onChange={(v) => handleInputChange("initialTerm", v)}
                  hint="Auto-calculated from dates"
                />
                <Field
                  label="Notice Period (Days)"
                  type="number"
                  value={formData.noticeRenewal}
                  onChange={(v) => handleInputChange("noticeRenewal", v)}
                />

                <Field
                  label="Lock-in Period (Months)"
                  type="number"
                  value={
                    monthsBetween(formData.lockInPeriodStartDate, formData.lockInPeriodEndDate) ||
                    ""
                  }
                  onChange={() => {}}
                  disabled
                />
                <div />

                <Field
                  label="Lock-in Start Date"
                  type="date"
                  value={formData.lockInPeriodStartDate}
                  onChange={(v) => handleInputChange("lockInPeriodStartDate", v)}
                />
                <Field
                  label="Lock-in End Date"
                  type="date"
                  value={formData.lockInPeriodEndDate}
                  onChange={(v) => handleInputChange("lockInPeriodEndDate", v)}
                />
              </div>
            </Card>

            <Card title="Rent-Free & Fitout">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Rent-Free Start"
                  type="date"
                  value={formData.rentFreeStartDate}
                  onChange={(v) => handleInputChange("rentFreeStartDate", v)}
                />
                <Field
                  label="Rent-Free End"
                  type="date"
                  value={formData.rentFreeEndDate}
                  onChange={(v) => handleInputChange("rentFreeEndDate", v)}
                />
                <Field
                  label="Number of Rent-Free Months"
                  type="number"
                  value={formData.rentFreeDays}
                  onChange={(v) => handleInputChange("rentFreeDays", v)}
                  hint="Auto-calculated from dates"
                />
                <div />
                <Field
                  label="Possession Date"
                  type="date"
                  value={formData.fitoutStartDate}
                  onChange={(v) => handleInputChange("fitoutStartDate", v)}
                />
                <Field
                  label="Fit-out Completion Date"
                  type="date"
                  value={formData.fitoutEndDate}
                  onChange={(v) => handleInputChange("fitoutEndDate", v)}
                />
              </div>
            </Card>
          </>
        );

      case "financials":
        return (
          <>
            <Card title="Basic Rent Details">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Base Rent Rate per sq.ft (used for totals)"
                  type="number"
                  value={formData.baseRentAmount}
                  onChange={(v) => handleInputChange("baseRentAmount", v)}
                  placeholder="e.g. 120"
                />
                <Select
                  label="Billing Frequency"
                  value={formData.billingFrequency}
                  onChange={(v) => handleInputChange("billingFrequency", v)}
                  options={billingFrequencies}
                />
                <Field
                  label="Payment Due Date Rule"
                  value={formData.paymentDueDate}
                  onChange={(v) => handleInputChange("paymentDueDate", v)}
                />
                <Field
                  label="First Rent Due Date"
                  type="date"
                  value={formData.firstRentDueDate}
                  onChange={(v) => handleInputChange("firstRentDueDate", v)}
                />
              </div>
            </Card>

            <Card title="Deposit & CAM">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Security Deposit Amount"
                  type="number"
                  value={formData.securityDepositAmount}
                  onChange={(v) => handleInputChange("securityDepositAmount", v)}
                />
                <Select
                  label="CAM Basis"
                  value={formData.camAllocationBasis}
                  onChange={(v) => handleInputChange("camAllocationBasis", v)}
                  options={camBases}
                />
                <Field
                  label="CAM Rate per sq.ft (used for totals)"
                  type="number"
                  value={formData.estimatedCAMMonthly}
                  onChange={(v) => handleInputChange("estimatedCAMMonthly", v)}
                  placeholder="e.g. 10"
                />
                <Field
                  label="Deposit Held By"
                  value={formData.depositHeldBy}
                  onChange={(v) => handleInputChange("depositHeldBy", v)}
                />
              </div>

              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Conditions
                </label>
                <textarea
                  value={formData.refundConditions || ""}
                  onChange={(e) => handleInputChange("refundConditions", e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Card>

            <Card
              title="Billing & Invoice Rules"
              // subtitle="Invoice generation + grace/late fee/interest and dispute/credit-note rules."
            >
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Invoice Generate Rule"
                  value={formData.invoiceGenerateRule}
                  onChange={(v) => handleInputChange("invoiceGenerateRule", v)}
                  options={INVOICE_RULE_OPTIONS}
                  // helper="Controls when invoice is created each cycle."
                />
                <Field
                  label="Grace Days"
                  type="number"
                  value={formData.invoiceGraceDays}
                  onChange={(v) => handleInputChange("invoiceGraceDays", v)}
                  placeholder="e.g. 2"
                />
                <Field
                  label="Late Fee (Flat)"
                  type="number"
                  value={formData.invoiceLateFeeFlat}
                  onChange={(v) => handleInputChange("invoiceLateFeeFlat", v)}
                  placeholder="e.g. 500"
                />
                <Field
                  label="Interest (Annual %)"
                  type="number"
                  value={formData.invoiceInterestAnnualPercent}
                  onChange={(v) => handleInputChange("invoiceInterestAnnualPercent", v)}
                  placeholder="e.g. 18"
                />
              </div>

              <div className="mt-3 border-t border-gray-200 pt-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                  AR Rules
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <Switch
                    label="Dispute Hold"
                    checked={!!arRules.dispute_hold}
                    onChange={(v) => setArRules((p) => ({ ...p, dispute_hold: v }))}
                    // helper="If true, items in dispute won’t progress in collection flow."
                  />
                  <Switch
                    label="Credit Note Allowed"
                    checked={!!arRules.credit_note_allowed}
                    onChange={(v) => setArRules((p) => ({ ...p, credit_note_allowed: v }))}
                    // helper="Enable credit note adjustments."
                  />
                  <Switch
                    label="Stop Interest On Dispute"
                    checked={!!arRules.stop_interest_on_dispute}
                    onChange={(v) => setArRules((p) => ({ ...p, stop_interest_on_dispute: v }))}
                    // helper="No interest accrual for disputed invoices."
                  />
                  <Switch
                    label="Stop Reminders On Dispute"
                    checked={!!arRules.stop_reminders_on_dispute}
                    onChange={(v) => setArRules((p) => ({ ...p, stop_reminders_on_dispute: v }))}
                    // helper="Suppress payment reminders while disputed."
                  />
                  <Switch
                    label="Credit Note Requires Approval"
                    checked={!!arRules.credit_note_requires_approval}
                    onChange={(v) => setArRules((p) => ({ ...p, credit_note_requires_approval: v }))}
                    // helper="Add approval workflow gate (future-proof)."
                  />
                </div>
              </div>
            </Card>

            <Card
              title="Ageing Bucket Configuration"
              // subtitle="Define ageing buckets used in AR ageing reports and reminders."
            >
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-700">
                  <div className="col-span-3">Label</div>
                  <div className="col-span-2">From Days</div>
                  <div className="col-span-1">To Days</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-gray-200">
                  {(ageingBuckets || []).map((b, idx) => (
                    <div key={idx} className="grid grid-cols-7 gap-3 px-4 py-3 items-center">
                      <input
                        value={b.label ?? ""}
                        onChange={(e) => updateAgeingBucket(idx, { label: e.target.value })}
                        placeholder="e.g. 0-30"
                        className="col-span-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <input
                        type="number"
                        value={b.from_days ?? ""}
                        onChange={(e) => updateAgeingBucket(idx, { from_days: e.target.value })}
                        placeholder="0"
                        className="col-span-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <input
                        type="number"
                        value={b.to_days ?? ""}
                        onChange={(e) => updateAgeingBucket(idx, { to_days: e.target.value })}
                        placeholder="30 (empty = open ended)"
                        className="col-span-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <div className="col-span-1 flex justify-end">
                        {ageingBuckets.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeAgeingBucket(idx)}
                            className="p-2 rounded-md hover:bg-red-50 text-red-600"
                            title="Remove bucket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={addAgeingBucket}
                className="mt-3 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                + Add Bucket
              </button>

              
            </Card>
          </>
        );

      case "escalation":
        return (
          <>
            <Card title="Escalation Rules">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Escalation Template"
                  value={formData.escalationType}
                  onChange={(v) => handleInputChange("escalationType", v)}
                  options={escalationTypes}
                />
                <Field
                  label="First Escalation Date"
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={(v) => handleInputChange("nextReviewDate", v)}
                />
                <Field label="Escalation Frequency" value="Every 12 Months" onChange={() => {}} disabled />
                <div />
              </div>
            </Card>

            <Card title="Options">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Revenue Recognition Method"
                  value={formData.revenueRecognitionMethod}
                  onChange={(v) => handleInputChange("revenueRecognitionMethod", v)}
                  options={revenueMethods}
                />
                <div className="flex items-center gap-2 mt-7">
                  <input
                    type="checkbox"
                    checked={formData.deferredRentSetup === "Yes"}
                    onChange={(e) => handleInputChange("deferredRentSetup", e.target.checked ? "Yes" : "No")}
                  />
                  <div className="text-sm text-gray-700">Deferred Rent Setup</div>
                </div>
              </div>
            </Card>
          </>
        );

      case "docs":
        return (
          <div className="space-y-4">
            <Card
              title="Documents Library"
              // subtitle="Upload and track lease documents. Approvals are stored in document meta (future-proof)."
              rightTitle={!leaseDbId ? "Save Draft first to enable uploads" : `Lease DB ID: ${leaseDbId}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Doc Type"
                  value={docType}
                  onChange={setDocType}
                  options={[
                    { label: "Agreement", value: "AGREEMENT" },
                    { label: "Annexure", value: "ANNEXURE" },
                    { label: "NOC", value: "NOC" },
                    { label: "KYC / ID Proof", value: "KYC" },
                    { label: "Other", value: "OTHER" },
                  ]}
                  disabled={!leaseDbId}
                />
                <Field
                  label="Title"
                  value={docTitle}
                  onChange={setDocTitle}
                  placeholder="e.g. Lease Agreement (Signed)"
                  disabled={!leaseDbId}
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                  <input
                    type="file"
                    disabled={!leaseDbId}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadDoc(f, docType, docTitle);
                      e.target.value = "";
                      setDocTitle("");
                    }}
                    className="w-full text-sm"
                  />
                  {/* <div className="text-xs text-gray-500 mt-2">
                    Uses existing upload logic: <b>POST /api/leases/documents/</b> (or fallback).
                  </div> */}
                </div>
              </div>

              <div className="mt-2">
                <Field
                  label="Search documents"
                  value={docQuery}
                  onChange={setDocQuery}
                  placeholder="Search by title/type/uploader..."
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-700">
                  <div className="col-span-4">Document</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Uploaded</div>
                  <div className="col-span-2">Approvals</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-gray-200">
                  {(filteredDocs || []).length ? (
                    filteredDocs.map((d) => {
                      const url = d?.file_url || d?.file || d?.url || d?.download_url || "";
                      const meta = (d && typeof d.meta === "object" && d.meta) || {};
                      const approved = !!meta.approved;
                      const signed = !!meta.signed;
                      const uploadedAt = d?.uploaded_at || d?.created_at || d?.created || "";
                      const size = d?.file_size || d?.size_bytes || d?.bytes || null;

                      return (
                        <div key={d?.id || d?.pk} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {d?.title || d?.file_name || "Untitled"}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {size != null ? formatBytes(size) : "—"}
                                  {d?.uploaded_by_name ? ` • ${d.uploaded_by_name}` : ""}
                                </div>
                              </div>
                            </div>
                            {url ? (
                              <div className="mt-1">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  View / Download
                                </a>
                              </div>
                            ) : null}
                          </div>

                          <div className="col-span-2 text-sm text-gray-700">{d?.doc_type || "—"}</div>

                          <div className="col-span-3 text-sm text-gray-700">
                            {uploadedAt ? formatPrettyDate(uploadedAt) : "—"}
                          </div>

                          <div className="col-span-2">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={!leaseDbId}
                                onClick={() => toggleDocMetaFlag(d, "approved")}
                                className={`text-xs px-2 py-1 rounded-md border ${
                                  approved
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {approved ? "Approved" : "Mark Approved"}
                              </button>
                              <button
                                type="button"
                                disabled={!leaseDbId}
                                onClick={() => toggleDocMetaFlag(d, "signed")}
                                className={`text-xs px-2 py-1 rounded-md border ${
                                  signed
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {signed ? "Signed" : "Mark Signed"}
                              </button>
                            </div>
                          </div>

                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => deleteDoc(d?.id || d?.pk)}
                              className="p-2 rounded-md hover:bg-red-50 text-red-600"
                              title="Delete"
                              disabled={!leaseDbId}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-6 text-sm text-gray-500">No documents found.</div>
                  )}
                </div>
              </div>

              {!leaseDbId ? (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Save Draft once to create the lease in DB — then uploads & approvals will work.
                </div>
              ) : null}
            </Card>

            <Card
              title="Versions / Amendments"
              // subtitle="If your backend exposes version endpoints, you’ll see history here (safe fallback)."
              rightTitle={versionsLoading ? "Loading..." : `${(versions || []).length} versions`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field
                  label="Search versions"
                  value={versionQuery}
                  onChange={setVersionQuery}
                  placeholder="Search by version/summary/user..."
                />
                <Field
                  label="Create Amendment Summary"
                  value={amendmentSummary}
                  onChange={setAmendmentSummary}
                  placeholder="e.g. Updated escalation clause"
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <button
                    type="button"
                    disabled={!leaseDbId || creatingAmendment}
                    onClick={createAmendment}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {creatingAmendment ? "Creating..." : "Create Amendment"}
                  </button>
                  {/* <div className="text-xs text-gray-500 mt-2">
                    If your API isn’t added yet, this will warn and do nothing.
                  </div> */}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-700">
                  <div className="col-span-3">Version</div>
                  <div className="col-span-6">Summary</div>
                  <div className="col-span-2">Updated</div>
                  <div className="col-span-1 text-right">View</div>
                </div>

                <div className="divide-y divide-gray-200">
                  {(filteredVersions || []).length ? (
                    filteredVersions.map((v) => (
                      <div
                        key={v?.id || v?.version_id || v?.pk}
                        className="grid grid-cols-12 gap-3 px-4 py-3 items-center"
                      >
                        <div className="col-span-3 text-sm font-medium text-gray-900">
                          {v?.version_number || v?.label || v?.version || "—"}
                          {v?.is_current || v?.current || v?.active ? (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <div className="col-span-6 text-sm text-gray-700 truncate">
                          {v?.summary || v?.notes || v?.description || "—"}
                        </div>
                        <div className="col-span-2 text-sm text-gray-700">
                          {formatPrettyDate(v?.updated_at || v?.created_at || v?.timestamp)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setViewVersion(v)}
                            className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-gray-500">
                      No versions found (or API not available yet).
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        );

      case "basic":
      default:
        return (
          <>
            <Card title="Lease Details">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Lease ID*"
                  value={formData.leaseId}
                  onChange={(v) => handleInputChange("leaseId", v)}
                />
                <Select
                  label="Version Number"
                  value={formData.versionNumber}
                  onChange={(v) => handleInputChange("versionNumber", v)}
                  options={["1.0", "2.0", "3.0", "3.1", "4.0"]}
                />
                <Select
                  label="Agreement Type*"
                  value={formData.agreementType}
                  onChange={(v) => handleInputChange("agreementType", v)}
                  options={agreementTypes}
                />
                <Select
                  label="Lease Status*"
                  value={formData.status}
                  onChange={(v) => handleInputChange("status", v)}
                  options={statuses}
                />
              </div>
            </Card>

            <Card
              title="Party Information"
              // subtitle="Tenant is chosen in Tenant Setup. You can change it anytime before saving."
              rightTitle={
                !leaseDbId ? (
                  <button
                    type="button"
                    onClick={() => setStepIdx(0)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Change Tenant
                  </button>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Landlord / SPV Entity"
                  value={formData.landlordEntity}
                  onChange={(v) => handleInputChange("landlordEntity", v)}
                  placeholder={`Scope: ${ctx.scopeType} (${ctx.scopeId})`}
                />

                <Field
                  label="Selected Tenant"
                  value={
                    selectedTenant?.legal_name ||
                    selectedTenant?.name ||
                    selectedTenant?.company_name ||
                    (formData.tenantId ? `Tenant ID: ${formData.tenantId}` : "")
                  }
                  onChange={() => {}}
                  disabled
                  placeholder="Select tenant in Step 1"
                />

                <Select
                  label="Primary Tenant Contact"
                  value={formData.primaryContactId}
                  onChange={(v) => handleInputChange("primaryContactId", v)}
                  options={contactOptions}
                  disabled={!tenantReady}
                  helper={!tenantReady ? "Select tenant first." : ""}
                />
                <div />
              </div>
            </Card>
          </>
        );
    }
  };

  const renderRight = () => {
    switch (STEPS[stepIdx].key) {
      case "financials":
        return (
          <div className="space-y-4">
            <TotalMonthlyPayableCard
              totalAllocatedArea={totalAllocatedArea}
              totalMonthlyPayable={totalMonthlyPayable}
              baseRentMonthlyTotal={baseRentMonthlyTotal}
              camMonthlyTotal={camMonthlyTotal}
              taxesEstMonthly={taxesEstMonthly}
              symbol="$"
            />
            <ValidationMessagesCard />

            <Card title="AR / Billing Snapshot" >
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Rule</span>
                  <span className="font-medium text-gray-900">{formData.invoiceGenerateRule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Grace Days</span>
                  <span className="font-medium text-gray-900">{formData.invoiceGraceDays || "0"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Buckets</span>
                  <span className="font-medium text-gray-900">{(ageingBuckets || []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dispute Hold</span>
                  <span className="font-medium text-gray-900">{arRules.dispute_hold ? "ON" : "OFF"}</span>
                </div>
              </div>
            </Card>
          </div>
        );

      case "escalation":
        return <RentSchedulePreviewCard rows={rentSchedulePreview} symbol="$" />;

      case "docs":
        return (
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start h-fit">
            <Card title="Docs Summary">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Documents</span>
                  <span className="text-gray-800 font-medium">{(leaseDocs || []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="text-gray-800 font-medium">
                    {(leaseDocs || []).filter((d) => d?.meta?.approved).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Signed</span>
                  <span className="text-gray-800 font-medium">
                    {(leaseDocs || []).filter((d) => d?.meta?.signed).length}
                  </span>
                </div>
                {/* <div className="mt-3 text-xs text-gray-500">
                  Approvals are stored in doc <b>meta</b>. We’ll make it fully dynamic with templates in the next step.
                </div> */}
              </div>
            </Card>

            <Card title="Quick Actions">
              <button
                type="button"
                disabled={!leaseDbId}
                onClick={async () => {
                  if (!leaseDbId) return;
                  const docs = await leaseAPI.listDocuments(leaseDbId);
                  setLeaseDocs(Array.isArray(docs) ? docs : docs?.results || []);
                  refreshVersions(leaseDbId);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Refresh Docs & Versions
              </button>
            </Card>
          </div>
        );
        {STEPS?.[stepIdx]?.key === "docs" ? (
  <div className="sticky bottom-0 z-40 border-t border-gray-200 bg-white">
    <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
      <div className="text-xs text-gray-600">
        {selectionInvalid ? (
          <span className="text-red-700">
            Allocation invalid: Remaining must be 0 for FULL / % / NEED.
          </span>
        ) : (
          <span className="text-gray-600">
            Final submission will create/activate lease using selected units + terms.
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleFinalSubmit}
        disabled={
          saving ||
          selectionInvalid ||
          !formData.tenantId ||
          !formData.siteId ||
          !formData.leaseCommencementDate ||
          !formData.leaseExpiryDate ||
          !Object.keys(unitSelections || {}).length
        }
        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Submitting..." : "Submit Lease"}
      </button>
    </div>
  </div>
) : null}


      default:
        return (
          <Card title="Quick Summary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tenant</span>
                <span className="text-gray-800 font-medium">
                  {selectedTenant?.legal_name ||
                    selectedTenant?.name ||
                    (formData.tenantId ? `ID: ${formData.tenantId}` : "—")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Selected Units</span>
                <span className="text-gray-800 font-medium">
                  {allocations.filter((a) => isNumberLike(a.unit_id)).length || 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Total Allocated Area</span>
                <span className="text-gray-800 font-medium">
                  {totalAllocatedArea ? `${totalAllocatedArea.toFixed(2)} sq.ft` : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Property</span>
                <span className="text-gray-800 font-medium">
                  {selectedSite?.name || selectedSite?.code || "—"}
                </span>
              </div>
            </div>
          </Card>
        );
    }
  };

  const goNext = async () => {
    if (STEPS[stepIdx].key === "tenant") {
      if (leaseDbId) {
        setStepIdx(1);
        return;
      }

      if (tenantMode === "existing") {
        if (!formData.tenantId) {
          alert("Please select a Tenant or switch to Create New.");
          return;
        }
        setStepIdx(1);
        return;
      }

      try {
        await createTenantFlowAndGoNext();
      } catch (e) {
        alert(e?.message || "Failed to create tenant");
      }
      return;
    }

    setStepIdx((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goBack = () => setStepIdx((s) => Math.max(0, s - 1));

  if (loading) return <div className="min-h-screen bg-gray-100 p-6">Loading...</div>;

  const isLast = stepIdx === STEPS.length - 1;
  const isTenantStep = STEPS[stepIdx].key === "tenant";

  const nextLabel = isLast
    ? "Save"
    : isTenantStep
    ? tenantMode === "new"
      ? "Create & Continue"
      : "Continue"
    : "Next";

  const nextDisabled =
    saving ||
    creatingTenant ||
    (isTenantStep && !leaseDbId && tenantMode === "existing" && !formData.tenantId);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose ? (
              <button
                onClick={() => onClose()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : null}
            <h1 className="text-2xl font-bold text-gray-900">
              {leaseDbId ? `Lease - ${formData.leaseId || leaseDbId}` : "New Lease"}
            </h1>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper stepIdx={stepIdx} setStepIdx={setStepIdx} canGoTo={canGoTo} />

      {/* Error */}
      {pageError ? (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            {pageError}
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">{renderLeft()}</div>
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start h-fit">{renderRight()}</div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIdx === 0 || saving || creatingTenant}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => (onClose ? onClose() : null)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          {/* <button
            type="button"
            disabled={saving || creatingTenant}
            onClick={() => handleSave("DRAFT")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Save Draft
          </button> */}

         <button
  type="button"
  onClick={isLast ? handleFinalSubmit : goNext}
  disabled={nextDisabled || selectionInvalid}
  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
>
  {nextLabel}
</button>

        </div>
      </div>

      {/* View Version Modal */}
      <Modal
        open={!!viewVersion}
        title={`Version Details - ${
          viewVersion?.version_number || viewVersion?.label || viewVersion?.version || "—"
        }`}
        onClose={() => setViewVersion(null)}
        footer={
          viewVersion && !(viewVersion?.is_current || viewVersion?.current || viewVersion?.active) ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                onClick={() => setViewVersion(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                onClick={() => {
                  restoreVersion(viewVersion);
                  setViewVersion(null);
                }}
              >
                Restore this version
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                onClick={() => setViewVersion(null)}
              >
                Close
              </button>
            </div>
          )
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-700">
            <div className="font-medium text-gray-900">Summary</div>
            <div className="mt-1">
              {viewVersion?.summary || viewVersion?.notes || viewVersion?.description || "—"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-xs text-gray-500">Updated By</div>
              <div className="mt-1 font-medium text-gray-900">
                {viewVersion?.updated_by_name ||
                  viewVersion?.created_by_name ||
                  viewVersion?.updated_by ||
                  viewVersion?.created_by ||
                  "—"}
              </div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-xs text-gray-500">Updated At</div>
              <div className="mt-1 font-medium text-gray-900">
                {formatPrettyDate(viewVersion?.updated_at || viewVersion?.created_at || viewVersion?.timestamp)}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Note: If you want “diff view” (what changed), share your backend response for version detail and I’ll render it cleanly.
          </div>
        </div>
      </Modal>
      {/* Units modal (View units) */}
<Modal
  open={unitsModalOpen}
  title={`Units — ${
    selectedFloor?.floor_name || (selectedFloorId ? `Floor ${selectedFloorId}` : "")
  }`}
  onClose={() => setUnitsModalOpen(false)}
  footer={
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        onClick={() => setUnitsModalOpen(false)}
      >
        Done
      </button>
    </div>
  }
>
  <div className="space-y-3">
    <div className="flex gap-2">
      <input
        value={unitQuery}
        onChange={(e) => setUnitQuery(e.target.value)}
        placeholder="Search unit (name/type/id)..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
      <select
        value={unitFilter}
        onChange={(e) => setUnitFilter(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
      >
        <option value="ALL">All</option>
        <option value="AVAILABLE">Available</option>
        <option value="SELECTED">Selected</option>
      </select>
    </div>

    <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
      {(filteredFloorUnits || []).length ? (
        filteredFloorUnits.map((u) => {
          const unitId = String(u.unit_id);
          const avail = toFloat(u.available_area_sqft, 0);
          const selected = !!unitSelections?.[unitId];
          const disabled = avail <= 0;

          const isResidential = String(u.unit_type || "").toUpperCase() === "RESIDENTIAL";
          const divisible = !!u.is_divisible && !isResidential;

          return (
            <div key={unitId} className={`p-3 ${disabled ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleUnit(u)}
                  className={`flex-1 text-left ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border ${
                        selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                      }`}
                    />
                    <div className="font-medium text-gray-900 truncate">
                      {u.unit_name || `Unit ${u.unit_id}`}
                    </div>
                    <Pill tone="gray">{u.unit_type || "—"}</Pill>
                    {divisible ? <Pill tone="indigo">Divisible</Pill> : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                    <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">
                      Total: {round2(toFloat(u.total_area_sqft, 0))}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">
                      Reserved: {round2(toFloat(u.reserved_area_sqft, 0))}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-green-700">
                      Available: {round2(avail)}
                    </span>
                  </div>
                </button>

                {selected && divisible ? (
                  <select
                    value={unitSelections?.[unitId]?.allocation_mode || "PARTIAL"}
                    onChange={(e) => setUnitMode(u, e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white"
                  >
                    <option value="FULL">FULL</option>
                    <option value="PARTIAL">PARTIAL</option>
                  </select>
                ) : selected ? (
                  <div className="text-xs font-semibold text-gray-800">FULL</div>
                ) : null}
              </div>

              {selected && divisible && unitSelections?.[unitId]?.allocation_mode === "PARTIAL" ? (
                <div className="mt-2 text-[11px] text-gray-500">
                  Use “Edit split” from Selected Units to adjust segments.
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="p-4 text-sm text-gray-500">No units found.</div>
      )}
    </div>
  </div>
</Modal>

{/* Edit split modal */}
<Modal
  open={!!editSplitUnitId}
  title="Edit split (segments)"
  onClose={() => setEditSplitUnitId(null)}
  footer={
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        onClick={() => setEditSplitUnitId(null)}
      >
        Done
      </button>
    </div>
  }
>
  {(() => {
    const u = availabilityIndex.unitsById[String(editSplitUnitId)];
    if (!u) return <div className="text-sm text-gray-600">Unit not found.</div>;

    const unitId = String(u.unit_id);
    const avail = round2(toFloat(u.available_area_sqft, 0));
    const sel = unitSelections?.[unitId] || { allocation_mode: "PARTIAL", segments: [] };
    const segs = Array.isArray(sel.segments) ? sel.segments : [];

    const segSum = round2(segs.reduce((s, x) => s + toFloat(x.allocated_area_sqft, 0), 0));

    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-800">
          <div className="font-semibold">{u.unit_name || `Unit ${u.unit_id}`}</div>
          <div className="text-xs text-gray-500 mt-1">
            Available: <b>{avail}</b> sqft • Min divisible: <b>{toFloat(u.min_divisible_area_sqft, 0)}</b> sqft
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-between text-xs">
          <span className="text-gray-600">Segments total</span>
          <span className="font-semibold text-gray-900">
            {segSum} / {avail} sqft
          </span>
        </div>

        <div className="space-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                value={s.allocated_area_sqft ?? ""}
                onChange={(e) => updateSegment(unitId, i, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                placeholder="Allocated sqft"
              />
              <button
                type="button"
                onClick={() => removeSegment(unitId, i)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => addSegment(u)}
          className="px-3 py-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50"
        >
          + Add segment
        </button>

        <div className="text-[11px] text-gray-500">
          Note: Allocation Builder targets require exact match (Remaining = 0) to enable Submit.
        </div>
      </div>
    );
  })()}
</Modal>

    </div>
  );
};

export default LeaseDetailPage;
