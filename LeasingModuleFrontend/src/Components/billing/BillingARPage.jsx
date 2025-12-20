import React, { useEffect, useMemo, useState } from "react";
import { billingAPI } from "../../services/api"; // adjust path if your folder differs

const fmtMoney = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "0");
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const to2 = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "0.00";
  return n.toFixed(2);
};

const yyyyMmDd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const monthStart = (d = new Date()) => yyyyMmDd(new Date(d.getFullYear(), d.getMonth(), 1));

const isoWithOffset = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`;
};

const BillingARPage = () => {
  // Overview filters
  const [fromDate, setFromDate] = useState(() => monthStart(new Date()));
  const [toDate, setToDate] = useState(() => yyyyMmDd(new Date()));
  const [months, setMonths] = useState(12);

  // Overview list
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // Selected tenant activity
  const [selected, setSelected] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityErr, setActivityErr] = useState("");
  const [activity, setActivity] = useState(null);

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payRes, setPayRes] = useState(null);

  const [payAmount, setPayAmount] = useState("0.00");
  const [payReceivedOn, setPayReceivedOn] = useState(() => yyyyMmDd(new Date()));
  const [payMode, setPayMode] = useState("BANK");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payReceivedAt, setPayReceivedAt] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${dd}T${hh}:${mi}`;
  });

  const [allocRows, setAllocRows] = useState([]);

  const totals = useMemo(() => {
    const raised = items.reduce((a, x) => a + (Number(x?.raised_total) || 0), 0);
    const received = items.reduce((a, x) => a + (Number(x?.received_total) || 0), 0);
    const outstanding = items.reduce((a, x) => a + (Number(x?.outstanding) || 0), 0);
    return { raised, received, outstanding };
  }, [items]);

  const allocSum = useMemo(() => {
    return allocRows.reduce((a, r) => a + (Number(r?.allocated_amount) || 0), 0);
  }, [allocRows]);

  const fetchAR = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await billingAPI.getARList({ from: fromDate, to: toDate });
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.message || "Failed to load AR list");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async (tenant_id) => {
    if (!tenant_id) return;
    setActivityLoading(true);
    setActivityErr("");
    setActivity(null);
    try {
      const data = await billingAPI.getTenantActivity({ tenant_id, months });
      setActivity(data || null);
    } catch (e) {
      setActivityErr(e?.message || "Failed to load tenant activity");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchAR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // if modal is open and months changes, refetch for the selected tenant
    if (activityOpen && selected?.tenant_id) fetchActivity(selected.tenant_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const openActivity = async (t) => {
    setSelected(t);
    setActivityOpen(true);
    await fetchActivity(t?.tenant_id);
  };

  const buildAllocRowsFromActivity = (act) => {
  const rows = [];
  const groups = Array.isArray(act?.groups) ? act.groups : [];

  for (const g of groups) {
    const invs = Array.isArray(g?.invoices) ? g.invoices : [];
    for (const inv of invs) {
      const invId = inv?.id ?? inv?.invoice_id; // ✅ supports your API

      const lines = Array.isArray(inv?.lines) ? inv.lines : [];
      for (const ln of lines) {
        const lineId = ln?.id ?? ln?.invoice_line_id; // ✅ supports your API
        if (!lineId) continue;

        rows.push({
          key: `${invId}:${lineId}`,
          invoice_id: invId,
          invoice_line_id: lineId,
          charge_type: ln?.charge_type || "",
          description: ln?.description || "",
          line_amount: to2(ln?.amount ?? 0),
          allocated_amount: "0.00",
        });
      }
    }
  }

  return rows;
};

 const openPayment = async () => {
  setPayErr("");
  setPayRes(null);

  if (!selected?.tenant_id) {
    setActivityErr("Select tenant first.");
    setActivityOpen(true);
    return;
  }

  // ✅ Ensure we actually have activity before building rows
  let act = activity;
  if (!act?.groups?.length || String(act?.tenant_id) !== String(selected.tenant_id)) {
    try {
      setActivityLoading(true);
      const data = await billingAPI.getTenantActivity({ tenant_id: selected.tenant_id, months });
      act = data || null;
      setActivity(act);
    } catch (e) {
      setActivityErr(e?.message || "Failed to load tenant activity");
      setActivityOpen(true);
      return;
    } finally {
      setActivityLoading(false);
    }
  }

  const rows = buildAllocRowsFromActivity(act);
  if (!rows.length) {
    setActivityErr("No invoice lines found in activity. Check API includes invoices[].lines[].invoice_line_id");
    setActivityOpen(true);
    return;
  }

  const out = Number(selected?.outstanding) || 0;
  setPayAmount(out > 0 ? to2(out) : "0.00");
  setPayReceivedOn(yyyyMmDd(new Date()));
  setPayMode("BANK");
  setPayRef("");
  setPayNote("");
  setPayBank("");
  setAllocRows(rows);
  setPayOpen(true);
};

  const autoAllocate = () => {
    const amt = Math.max(0, Number(payAmount) || 0);
    let remaining = amt;

    const next = allocRows.map((r) => ({ ...r, allocated_amount: "0.00" }));
    for (let i = 0; i < next.length; i++) {
      if (remaining <= 0) break;
      const max = Number(next[i].line_amount) || 0;
      const take = Math.min(max, remaining);
      next[i].allocated_amount = to2(take);
      remaining -= take;
    }
    setAllocRows(next);
  };

  const submitPayment = async () => {
    setPayErr("");
    setPayRes(null);

    try {
      const tenant_id = Number(selected?.tenant_id);
      if (!tenant_id) throw new Error("tenant_id missing");

      const amount = Number(payAmount);
      if (!isFinite(amount) || amount <= 0) throw new Error("Payment amount must be > 0");

      const allocations = allocRows
        .map((r) => ({
          invoice_line_id: Number(r.invoice_line_id),
          allocated_amount: to2(r.allocated_amount),
          max_amount: Number(r.line_amount) || 0,
        }))
        .filter((a) => (Number(a.allocated_amount) || 0) > 0);

      if (!allocations.length) throw new Error("Allocate amount to at least one invoice line.");

      const sum = allocations.reduce((a, x) => a + (Number(x.allocated_amount) || 0), 0);
      if (Number(to2(sum)) !== Number(to2(amount))) {
        throw new Error(`Allocated total (₹ ${to2(sum)}) must equal Payment amount (₹ ${to2(amount)}).`);
      }

      for (const a of allocations) {
        if ((Number(a.allocated_amount) || 0) > (a.max_amount || 0)) {
          throw new Error(`Allocated amount cannot exceed line amount (invoice_line_id: ${a.invoice_line_id}).`);
        }
      }

      const receivedAtISO = payReceivedAt ? isoWithOffset(new Date(payReceivedAt)) : null;

      const payload = {
        payment: {
          tenant_id,
          amount: to2(payAmount),
          received_on: payReceivedOn,
          mode: String(payMode).toUpperCase(),
          reference_no: payRef || "",
          note: payNote || "",
          meta: {
            ...(payBank ? { bank_name: payBank } : {}),
            ...(receivedAtISO ? { received_at: receivedAtISO } : {}),
          },
        },
        allocations: allocations.map((a) => ({
          invoice_line_id: a.invoice_line_id,
          allocated_amount: to2(a.allocated_amount),
        })),
      };

      const res = await billingAPI.receiveAndAllocatePayment(payload);
      setPayRes(res);

      await fetchAR();
      await fetchActivity(tenant_id);
    } catch (e) {
      setPayErr(e?.message || "Payment failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tenant AR</h2>
          <p className="text-sm text-gray-600 mt-1">
            AR overview → click tenant to view activity → receive & allocate payment
          </p>
        </div>

        <div className="p-5">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Months (activity)</label>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button
                onClick={fetchAR}
                disabled={loading}
                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Fetch AR"}
              </button>

              <button
                onClick={openPayment}
                disabled={!selected?.tenant_id}
                className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Payment
              </button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{err}</div>
          ) : null}

          {/* Totals */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded border bg-gray-50">Tenants: {items.length}</span>
            <span className="px-2 py-1 rounded border bg-amber-50 text-amber-800">
              Raised: ₹ {fmtMoney(totals.raised)}
            </span>
            <span className="px-2 py-1 rounded border bg-green-50 text-green-800">
              Received: ₹ {fmtMoney(totals.received)}
            </span>
            <span className="px-2 py-1 rounded border bg-red-50 text-red-800">
              Outstanding: ₹ {fmtMoney(totals.outstanding)}
            </span>
          </div>

          {/* ✅ Simple Table */}
          <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
              <span>AR Overview</span>
              <span className="text-gray-500">{items.length} items</span>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : items.length ? (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr className="border-b border-gray-200">
                      <th className="text-left font-semibold px-4 py-2">Tenant</th>
                      <th className="text-left font-semibold px-4 py-2">Tenant ID</th>
                      <th className="text-right font-semibold px-4 py-2">Raised</th>
                      <th className="text-right font-semibold px-4 py-2">Received</th>
                      <th className="text-right font-semibold px-4 py-2">Outstanding</th>
                      <th className="text-right font-semibold px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((t) => {
                      const active = String(selected?.tenant_id) === String(t?.tenant_id);
                      return (
                        <tr key={t.tenant_id} className={active ? "bg-blue-50" : ""}>
                          <td className="px-4 py-2">
                            <div className="font-semibold text-gray-900">
                              {t.tenant_name || `Tenant #${t.tenant_id}`}
                            </div>
                            <div className="text-xs text-gray-500">Org: {t.org_id}</div>
                          </td>
                          <td className="px-4 py-2 text-gray-700">{t.tenant_id}</td>
                          <td className="px-4 py-2 text-right">₹ {fmtMoney(t.raised_total)}</td>
                          <td className="px-4 py-2 text-right">₹ {fmtMoney(t.received_total)}</td>
                          <td className="px-4 py-2 text-right font-semibold">₹ {fmtMoney(t.outstanding)}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => openActivity(t)}
                              className="px-3 py-1.5 text-xs rounded border hover:bg-gray-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500">No data.</div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Activity Modal (simple) */}
      {activityOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {selected?.tenant_name || `Tenant #${selected?.tenant_id}`}
                </div>
                <div className="text-xs text-gray-500">
                  Tenant #{selected?.tenant_id} • Months: {months}
                </div>
              </div>
              <button
                onClick={() => {
                  setActivityOpen(false);
                  setActivityErr("");
                  setActivity(null);
                }}
                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {activityErr ? (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">
                  {activityErr}
                </div>
              ) : null}

              {/* Small summary row */}
              <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="text-gray-500">Raised</div>
                  <div className="font-semibold">₹ {fmtMoney(selected?.raised_total)}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="text-gray-500">Received</div>
                  <div className="font-semibold">₹ {fmtMoney(selected?.received_total)}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="text-gray-500">Outstanding</div>
                  <div className="font-semibold">₹ {fmtMoney(selected?.outstanding)}</div>
                </div>
              </div>

              {activityLoading ? (
                <div className="text-sm text-gray-500">Loading activity...</div>
              ) : activity?.groups?.length ? (
                <div className="space-y-4">
                  {activity.groups.map((g) => (
                    <div key={g.month} className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                        <span>{g.month}</span>
                        <span className="text-gray-500">
                          Invoices: ₹ {fmtMoney(g.invoice_total)} • Payments: ₹ {fmtMoney(g.payment_total)}
                        </span>
                      </div>

                      {/* Invoices table */}
                      <div className="p-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Invoices</div>
                        {Array.isArray(g.invoices) && g.invoices.length ? (
                          <div className="overflow-auto border border-gray-200 rounded">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 text-gray-700">
                                <tr className="border-b border-gray-200">
                                  <th className="text-left px-3 py-2">Invoice</th>
                                  <th className="text-left px-3 py-2">Period</th>
                                  <th className="text-left px-3 py-2">Due</th>
                                  <th className="text-right px-3 py-2">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {g.invoices.map((inv) => (
                                  <tr key={inv.id || inv.invoice_id}>
                                    <td className="px-3 py-2 font-semibold text-gray-800">
                                      INV #{inv.id || inv.invoice_id}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">
                                      {inv.period_start || "—"} → {inv.period_end || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{inv.due_date || "—"}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                      ₹ {fmtMoney(inv.total_amount ?? inv.total ?? "")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No invoices.</div>
                        )}

                        {/* Payments table */}
                        <div className="text-xs font-semibold text-gray-700 mt-4 mb-2">Payments</div>
                        {Array.isArray(g.payments) && g.payments.length ? (
                          <div className="overflow-auto border border-gray-200 rounded">
                            <table className="min-w-full text-xs">
                              <thead className="bg-gray-50 text-gray-700">
                                <tr className="border-b border-gray-200">
                                  <th className="text-left px-3 py-2">Received On</th>
                                  <th className="text-left px-3 py-2">Mode</th>
                                  <th className="text-left px-3 py-2">Ref</th>
                                  <th className="text-right px-3 py-2">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {g.payments.map((p, idx) => (
                                  <tr key={p.id || idx}>
                                    <td className="px-3 py-2 text-gray-700">{p.received_on || "—"}</td>
                                    <td className="px-3 py-2 text-gray-700">{p.mode || "—"}</td>
                                    <td className="px-3 py-2 text-gray-700">{p.reference_no || "—"}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                      ₹ {fmtMoney(p.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">No payments.</div>
                        )}

                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={openPayment}
                            className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Add Payment
                          </button>
                        </div>

                        {/* NOTE for allocations */}
                        <div className="mt-2 text-[11px] text-gray-500">
                          Note: allocations need <b>invoices[].lines[]</b> in tenant activity response.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No activity groups.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Payment Modal (same as your existing one) */}
      {payOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div>
                <div className="text-sm font-semibold text-gray-900">Receive Payment & Allocate</div>
                <div className="text-xs text-gray-500">
                  Tenant #{selected?.tenant_id} • POST /api/billing/payments/receive-and-allocate/
                </div>
              </div>
              <button
                onClick={() => {
                  setPayOpen(false);
                  setPayErr("");
                  setPayRes(null);
                }}
                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-4">
              {payErr ? (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">{payErr}</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">amount</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    Allocated: ₹ <b>{to2(allocSum)}</b>
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

                <div className="md:col-span-3">
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

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">reference_no</label>
                  <input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="UTR123456"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="block text-xs font-medium text-gray-600 mb-1">note</label>
                  <input
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Dec rent part payment"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">bank_name (meta)</label>
                  <input
                    value={payBank}
                    onChange={(e) => setPayBank(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="HDFC"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">received_at (meta)</label>
                  <input
                    type="datetime-local"
                    value={payReceivedAt}
                    onChange={(e) => setPayReceivedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={autoAllocate}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Auto allocate to amount
                </button>
                <div className="text-xs text-gray-500">(Uses invoice lines from activity for invoice_line_id)</div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex justify-between">
                  <span>Allocations</span>
                  <span className="text-gray-500">{allocRows.length} lines</span>
                </div>

                <div className="divide-y divide-gray-200 max-h-[340px] overflow-auto">
                  {allocRows.map((r, idx) => (
                    <div key={r.key} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-6">
                        <div className="text-xs font-semibold text-gray-800">
                          INV #{r.invoice_id || "—"} • Line #{r.invoice_line_id}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {r.charge_type ? `${r.charge_type} • ` : ""}
                          {r.description}
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <div className="text-[11px] text-gray-500">line amount</div>
                        <div className="text-sm font-semibold text-gray-900">₹ {fmtMoney(r.line_amount)}</div>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] text-gray-500 mb-1">allocated_amount</label>
                        <input
                          type="number"
                          value={r.allocated_amount}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAllocRows((prev) => prev.map((x, i) => (i === idx ? { ...x, allocated_amount: v } : x)));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {payRes ? (
                <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs overflow-auto max-h-56">
                  <div className="text-xs font-semibold text-gray-700 mb-2">API Response</div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(payRes, null, 2)}</pre>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPayOpen(false);
                  setPayErr("");
                  setPayRes(null);
                }}
                className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={submitPayment} className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BillingARPage;
