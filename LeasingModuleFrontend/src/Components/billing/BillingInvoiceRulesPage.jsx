// src/pages/Lease/BillingInvoiceRulesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { leaseAPI } from "../../services/api";

/* ---------------- helpers ---------------- */
const safeList = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.results)) return resp.results;
  if (Array.isArray(resp?.tenants)) return resp.tenants;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
};

const safeCount = (resp) => {
  if (typeof resp?.count === "number") return resp.count;
  return safeList(resp).length;
};

const kv = (v, fallback = "—") => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  return String(v);
};

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj ?? {}));

/** ✅ SAME pattern as earlier pages: read active org/scope from localStorage */
const getActiveCtx = () => {
  try {
    const raw = localStorage.getItem("active");
    if (!raw) return null;
    const a = JSON.parse(raw);

    const scopeType = a.scope_type || a.scopeType || a.type || "ORG";
    const scopeId = a.scope_id || a.scopeId || a.id || a.pk || null;

    const orgId = a.org_id || a.orgId || (scopeType === "ORG" ? scopeId : null);
    if (!orgId) return null;

    return { scopeType, scopeId, orgId };
  } catch {
    return null;
  }
};

const Card = ({ title, subtitle, children, right }) => (
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

const Pill = ({ active, children }) => (
  <span
    className={`text-xs px-2 py-0.5 rounded-full border ${
      active
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-700 border-gray-200"
    }`}
  >
    {children}
  </span>
);

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`px-3 py-1.5 text-xs rounded-md border ${
      value ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300"
    }`}
  >
    {value ? "ON" : "OFF"}
  </button>
);

const BillingInvoiceRulesPage = ({ orgId: orgIdProp, context }) => {
  // ✅ keep active orgId reactive (same tab)
  const [activeOrgId, setActiveOrgId] = useState(() => getActiveCtx()?.orgId ?? null);

  useEffect(() => {
    const sync = () => setActiveOrgId(getActiveCtx()?.orgId ?? null);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("active-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("active-changed", sync);
    };
  }, []);

  const derivedOrgId = useMemo(() => {
    const fromContext = context?.orgId ?? context?.org_id ?? null;
    return Number(fromContext ?? activeOrgId ?? orgIdProp ?? 0) || null;
  }, [context, activeOrgId, orgIdProp]);

  const [q, setQ] = useState("");
  const [asOf, setAsOf] = useState("");

  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantsResp, setTenantsResp] = useState(null);
  const [tenantsErr, setTenantsErr] = useState("");

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeOnly, setActiveOnly] = useState(true);

  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesErr, setRulesErr] = useState("");
  const [leases, setLeases] = useState([]);
  const [selectedLease, setSelectedLease] = useState(null); // ✅ choose which lease’s rules to show
  const [rules, setRules] = useState({ billing: null, ageing: null, ar: null });

  // edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftRules, setDraftRules] = useState({ billing: {}, ar: {}, ageing: { buckets: [] } });

  const tenants = useMemo(() => safeList(tenantsResp), [tenantsResp]);
  const totalCount = useMemo(() => safeCount(tenantsResp), [tenantsResp]);

  const loadTenants = async () => {
    setLoadingTenants(true);
    setTenantsErr("");

    if (!derivedOrgId) {
      setTenantsResp(null);
      setTenantsErr("Active organization not selected. Please select ORG first.");
      setLoadingTenants(false);
      return;
    }

    try {
      const resp = await leaseAPI.getLeasedTenantsSummary(derivedOrgId, {
        q: q.trim() || undefined,
        as_of: asOf || undefined,
      });

      setTenantsResp(resp);

      // keep selection if still exists
      const list = safeList(resp);
      if (selectedTenant?.id) {
        const still = list.find((t) => String(t.id) === String(selectedTenant.id));
        if (!still) setSelectedTenant(null);
      }
    } catch (e) {
      setTenantsResp(null);
      setTenantsErr(e?.message || "Failed to load tenants summary");
    } finally {
      setLoadingTenants(false);
    }
  };

  const normalizeLeaseRulesResp = (resp) => {
    // your backend sends: { results:[{..., rules:{...}}], tenant:{...}, as_of:"..." }
    const list = safeList(resp);

    // pick first lease as default
    const first = list?.[0] || null;
    const rulesObj = first?.rules || resp?.rules || {};

    return {
      leasesList: list,
      rulesObj,
      firstLease: first,
    };
  };

  const loadTenantRules = async (tenantId) => {
    if (!tenantId) return;

    setLoadingRules(true);
    setRulesErr("");

    try {
      const resp = await leaseAPI.getTenantLeasesRules(tenantId, activeOnly ? 1 : 0);

      const { leasesList, rulesObj, firstLease } = normalizeLeaseRulesResp(resp);

      setLeases(leasesList);

      // ✅ set selected lease if not selected or not present anymore
      const still = selectedLease?.id
        ? leasesList.find((x) => String(x.id) === String(selectedLease.id))
        : null;

      const leaseToUse = still || firstLease || null;
      setSelectedLease(leaseToUse);

      setRules({
        billing: rulesObj?.billing ?? null,
        ageing: rulesObj?.ageing ?? null,
        ar: rulesObj?.ar ?? null,
      });
    } catch (e) {
      setLeases([]);
      setSelectedLease(null);
      setRules({ billing: null, ageing: null, ar: null });
      setRulesErr(e?.message || "Failed to load tenant leases/rules");
    } finally {
      setLoadingRules(false);
    }
  };

  // ✅ initial load (and whenever org changes)
  useEffect(() => {
    setSelectedTenant(null);
    setLeases([]);
    setSelectedLease(null);
    setRules({ billing: null, ageing: null, ar: null });
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedOrgId]);

  // reload rules when activeOnly changes
  useEffect(() => {
    if (selectedTenant?.id) loadTenantRules(selectedTenant.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  const selectTenant = (t) => {
    setSelectedTenant(t);
    setSelectedLease(null);
    setLeases([]);
    setRules({ billing: null, ageing: null, ar: null });
    loadTenantRules(t?.id);
  };

  const selectLease = (l) => {
    setSelectedLease(l);
    const r = l?.rules || {};
    setRules({
      billing: r?.billing ?? null,
      ageing: r?.ageing ?? null,
      ar: r?.ar ?? null,
    });
  };

  const openEdit = () => {
    const base = {
      billing: deepCopy(rules?.billing ?? {}),
      ar: deepCopy(rules?.ar ?? {}),
      ageing: deepCopy(rules?.ageing ?? { buckets: [] }),
    };
    if (!Array.isArray(base.ageing?.buckets)) base.ageing.buckets = [];
    setDraftRules(base);
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedLease?.id) return;

    setSaving(true);
    try {
      await leaseAPI.updateLeaseRules(selectedLease.id, draftRules);
      setIsEditOpen(false);
      // reload after save
      await loadTenantRules(selectedTenant?.id);
    } catch (e) {
      alert(e?.message || "Failed to save rules");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {!derivedOrgId ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm">
          Active ORG not found in localStorage <b>active</b>. Select organization first.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-1 space-y-4">
          <Card
            title="Tenants on Lease"
            subtitle="Count + list tenants currently on lease (filters: q, as_of)."
            right={loadingTenants ? "Loading..." : `${totalCount} tenants • ORG: ${derivedOrgId}`}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search (q)</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. global"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">As of (optional)</label>
                <input
                  type="date"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={loadTenants}
                  disabled={!derivedOrgId}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>
            </div>

            {tenantsErr ? (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
                {tenantsErr}
              </div>
            ) : null}

            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700">Tenants</div>

              <div className="divide-y divide-gray-200 max-h-[520px] overflow-auto">
                {loadingTenants ? (
                  <div className="px-4 py-4 text-sm text-gray-500">Loading...</div>
                ) : tenants.length ? (
                  tenants.map((t) => {
                    const id = t?.id;
                    const name = t?.legal_name || t?.name || t?.company_name || `Tenant #${id}`;
                    const sub = [t?.trade_name, t?.email, t?.phone].filter(Boolean).join(" • ");
                    const isSelected = String(selectedTenant?.id) === String(id);

                    return (
                      <button
                        key={id || name}
                        type="button"
                        onClick={() => selectTenant(t)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                          isSelected ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                          {isSelected ? <Pill active>Selected</Pill> : <Pill>View</Pill>}
                        </div>
                        {sub ? <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-sm text-gray-500">No leased tenants found.</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Tenant Lease Rules"
            subtitle="Select tenant → select lease → view rules."
            right={
              selectedTenant?.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Leases:</span>
                  <button
                    type="button"
                    onClick={() => setActiveOnly(true)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      activeOnly
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Active Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOnly(false)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      !activeOnly
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={openEdit}
                    disabled={!selectedLease?.id}
                    className="ml-2 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Edit Rules
                  </button>
                </div>
              ) : (
                "Select a tenant"
              )
            }
          >
            {!selectedTenant ? (
              <div className="text-sm text-gray-600">Select a tenant from the left list to view lease rules.</div>
            ) : (
              <>
                {rulesErr ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
                    {rulesErr}
                  </div>
                ) : null}

                {loadingRules ? (
                  <div className="text-sm text-gray-600">Loading tenant rules...</div>
                ) : (
                  <div className="space-y-5">
                    {/* RULES */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex items-center justify-between">
                        <span>Rules Snapshot</span>
                        {selectedLease?.lease_id ? (
                          <span className="text-xs text-gray-500">
                            Lease: <b>{selectedLease.lease_id}</b>
                          </span>
                        ) : null}
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-gray-200 rounded-md">
                          <div className="text-xs text-gray-500 font-semibold">Billing</div>
                          <div className="mt-2 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Invoice Rule</span>
                              <span className="font-medium text-gray-900">
                                {kv(rules?.billing?.invoice_generate_rule)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Grace Days</span>
                              <span className="font-medium text-gray-900">{kv(rules?.billing?.grace_days)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Late Fee</span>
                              <span className="font-medium text-gray-900">{kv(rules?.billing?.late_fee_flat)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Interest %</span>
                              <span className="font-medium text-gray-900">
                                {kv(rules?.billing?.interest_annual_percent)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-gray-200 rounded-md">
                          <div className="text-xs text-gray-500 font-semibold">Ageing</div>
                          <div className="mt-2 text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Buckets</span>
                              <span className="font-medium text-gray-900">
                                {Array.isArray(rules?.ageing?.buckets) ? rules.ageing.buckets.length : "—"}
                              </span>
                            </div>

                            {Array.isArray(rules?.ageing?.buckets) && rules.ageing.buckets.length ? (
                              <div className="text-xs text-gray-600 space-y-1">
                                {rules.ageing.buckets.slice(0, 6).map((b, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="truncate">{kv(b?.label, `Bucket ${i + 1}`)}</span>
                                    <span className="font-medium text-gray-900 tabular-nums">
                                      {kv(b?.from_days, "—")}–{b?.to_days == null ? "+" : kv(b?.to_days)}
                                    </span>
                                  </div>
                                ))}
                                {rules.ageing.buckets.length > 6 ? <div className="text-gray-500">+ more…</div> : null}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">No ageing buckets configured.</div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-gray-200 rounded-md">
                          <div className="text-xs text-gray-500 font-semibold">AR</div>
                          <div className="mt-2 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Dispute Hold</span>
                              <span className="font-medium text-gray-900">{kv(rules?.ar?.dispute_hold)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Stop Interest</span>
                              <span className="font-medium text-gray-900">{kv(rules?.ar?.stop_interest_on_dispute)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Stop Reminders</span>
                              <span className="font-medium text-gray-900">{kv(rules?.ar?.stop_reminders_on_dispute)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Credit Note Allowed</span>
                              <span className="font-medium text-gray-900">{kv(rules?.ar?.credit_note_allowed)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">CN Approval</span>
                              <span className="font-medium text-gray-900">{kv(rules?.ar?.credit_note_requires_approval)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LEASES */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700">
                        Leases ({activeOnly ? "Active only" : "All"})
                      </div>

                      <div className="divide-y divide-gray-200">
                        {Array.isArray(leases) && leases.length ? (
                          leases.map((l, idx) => {
                            const leaseId = l?.lease_id || l?.id || `Lease ${idx + 1}`;
                            const status = l?.status || l?.lease_status || "—";
                            const from = l?.commencement_date || l?.start_date || "—";
                            const to = l?.expiry_date || l?.end_date || "—";
                            const isSelected = String(selectedLease?.id) === String(l?.id);

                            return (
                              <button
                                type="button"
                                key={l?.id || l?.lease_id || idx}
                                onClick={() => selectLease(l)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                                  isSelected ? "bg-blue-50" : "bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-gray-900">{leaseId}</div>
                                  <Pill active={String(status).toUpperCase() === "ACTIVE"}>{String(status)}</Pill>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {from} → {to}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-4 text-sm text-gray-500">No leases returned for this tenant.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
<div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Edit Rules</div>
                <div className="text-xs text-gray-500 mt-1">
                  Lease: <b>{selectedLease?.lease_id || selectedLease?.id}</b>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>

<div className="p-4 space-y-5 overflow-y-auto">
              {/* Billing */}
              <div className="border border-gray-200 rounded-md p-4">
                <div className="text-sm font-semibold text-gray-800">Billing</div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Invoice Generate Rule</label>
                    <select
                      value={draftRules.billing.invoice_generate_rule ?? ""}
                      onChange={(e) =>
                        setDraftRules((d) => ({
                          ...d,
                          billing: { ...d.billing, invoice_generate_rule: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">—</option>
                      <option value="1ST_DAY_OF_MONTH">1ST_DAY_OF_MONTH</option>
                      <option value="LAST_DAY_OF_MONTH">LAST_DAY_OF_MONTH</option>
                      <option value="COMMENCEMENT_DAY">COMMENCEMENT_DAY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Grace Days</label>
                    <input
                      type="number"
                      value={draftRules.billing.grace_days ?? ""}
                      onChange={(e) =>
                        setDraftRules((d) => ({
                          ...d,
                          billing: { ...d.billing, grace_days: e.target.value === "" ? null : Number(e.target.value) },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Late Fee (flat)</label>
                    <input
                      type="number"
                      value={draftRules.billing.late_fee_flat ?? ""}
                      onChange={(e) =>
                        setDraftRules((d) => ({
                          ...d,
                          billing: { ...d.billing, late_fee_flat: e.target.value === "" ? null : Number(e.target.value) },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Interest Annual %</label>
                    <input
                      type="number"
                      value={draftRules.billing.interest_annual_percent ?? ""}
                      onChange={(e) =>
                        setDraftRules((d) => ({
                          ...d,
                          billing: {
                            ...d.billing,
                            interest_annual_percent: e.target.value === "" ? null : Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* AR */}
              <div className="border border-gray-200 rounded-md p-4">
                <div className="text-sm font-semibold text-gray-800">AR</div>

                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["dispute_hold", "Dispute Hold"],
                    ["stop_interest_on_dispute", "Stop Interest on Dispute"],
                    ["stop_reminders_on_dispute", "Stop Reminders on Dispute"],
                    ["credit_note_allowed", "Credit Note Allowed"],
                    ["credit_note_requires_approval", "Credit Note Requires Approval"],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-700">{label}</span>
                      <Toggle
                        value={!!draftRules.ar?.[key]}
                        onChange={(val) =>
                          setDraftRules((d) => ({
                            ...d,
                            ar: { ...d.ar, [key]: val },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ageing */}
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">Ageing Buckets</div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftRules((d) => ({
                        ...d,
                        ageing: {
                          ...d.ageing,
                          buckets: [...(d.ageing?.buckets || []), { label: "", from_days: 0, to_days: null }],
                        },
                      }))
                    }
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    + Add Bucket
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {(draftRules.ageing?.buckets || []).map((b, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-6 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Label (e.g. 0-30)"
                        value={b.label ?? ""}
                        onChange={(e) =>
                          setDraftRules((d) => {
                            const buckets = [...(d.ageing?.buckets || [])];
                            buckets[idx] = { ...buckets[idx], label: e.target.value };
                            return { ...d, ageing: { ...d.ageing, buckets } };
                          })
                        }
                      />
                      <input
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        type="number"
                        placeholder="From"
                        value={b.from_days ?? ""}
                        onChange={(e) =>
                          setDraftRules((d) => {
                            const buckets = [...(d.ageing?.buckets || [])];
                            buckets[idx] = { ...buckets[idx], from_days: e.target.value === "" ? null : Number(e.target.value) };
                            return { ...d, ageing: { ...d.ageing, buckets } };
                          })
                        }
                      />
                      <input
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        type="number"
                        placeholder="To (blank = +)"
                        value={b.to_days ?? ""}
                        onChange={(e) =>
                          setDraftRules((d) => {
                            const buckets = [...(d.ageing?.buckets || [])];
                            buckets[idx] = {
                              ...buckets[idx],
                              to_days: e.target.value === "" ? null : Number(e.target.value),
                            };
                            return { ...d, ageing: { ...d.ageing, buckets } };
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraftRules((d) => {
                            const buckets = [...(d.ageing?.buckets || [])];
                            buckets.splice(idx, 1);
                            return { ...d, ageing: { ...d.ageing, buckets } };
                          })
                        }
                        className="col-span-2 px-3 py-2 text-xs border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Rules"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BillingInvoiceRulesPage;
