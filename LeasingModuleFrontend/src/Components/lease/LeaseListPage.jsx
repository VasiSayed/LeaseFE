import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, Edit2, Trash2, MoreVertical } from "lucide-react";
import LeaseDetailPage from "./LeaseDetailPage";
import { setupAPI, tenantAPI, leaseAPI } from "../../services/api";

/* ---------- helpers ---------- */
const STATUS_API_TO_UI = {
  ACTIVE: "Active",
  PENDING: "Pending",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  DRAFT: "Draft",
};
const STATUS_UI_TO_API = Object.fromEntries(
  Object.entries(STATUS_API_TO_UI).map(([k, v]) => [v, k])
);

const safeDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n, symbol = "$") => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return `${symbol}0.00`;
  return (
    symbol +
    num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

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


const LeaseListPage = ({ context }) => {
  const ctx = useMemo(() => {
  const active = getActiveCtx();

  const scopeType = context?.scopeType || active?.scopeType || "ORG";
  const scopeId = context?.scopeId || active?.scopeId || null;

  const orgId =
    context?.orgId ||
    active?.orgId ||
    (scopeType === "ORG" ? scopeId : null);

  return {
    scopeType,
    scopeId,
    orgId,
    unitType: context?.unitType || "COMMERCIAL",
  };
}, [context]);


  // table data
  const [leases, setLeases] = useState([]);
  const [count, setCount] = useState(0);

  // filters
  const [sites, setSites] = useState([]);
  const [tenantsDir, setTenantsDir] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ui state
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showLeaseDetail, setShowLeaseDetail] = useState(false);
  const [selectedLeaseDbId, setSelectedLeaseDbId] = useState(null);

  const siteOptions = useMemo(
    () => [{ value: "all", label: "All Properties" }].concat(
      (sites || []).map((s) => ({
        value: String(s.id),
        label: s.name || s.code || `Site ${s.id}`,
      }))
    ),
    [sites]
  );

  const tenantOptions = useMemo(
    () => [{ value: "all", label: "All Tenants" }].concat(
      (tenantsDir || []).map((t) => ({
        value: String(t.id),
        label: t.legal_name || t.name || t.company_name || `Tenant ${t.id}`,
      }))
    ),
    [tenantsDir]
  );

  const getStatusColor = (statusUi) => {
    switch (statusUi) {
      case "Active":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
      case "Expired":
        return "bg-red-100 text-red-700";
      case "Terminated":
        return "bg-gray-100 text-gray-700";
      case "Draft":
        return "bg-blue-50 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const fetchFilters = async () => {
    try {
      const [sitesResp, tenantsResp] = await Promise.all([
        setupAPI.getSitesByScope(ctx.scopeType, ctx.scopeId),
        tenantAPI.getTenantsDirectory(ctx.orgId, 1, 200),
      ]);

      const sitesList = Array.isArray(sitesResp) ? sitesResp : sitesResp?.results || [];
      const tenantsList = tenantsResp?.results || tenantsResp || [];

      setSites(sitesList);
      setTenantsDir(Array.isArray(tenantsList) ? tenantsList : []);
    } catch {
      // ignore filters failure
    }
  };

  const fetchLeases = async () => {
    setLoading(true);
    setPageError("");
    try {
      const params = {
        page,
        page_size: pageSize,
        org_id: ctx.orgId,
  landlord_scope_type: ctx.scopeType,
  landlord_scope_id: ctx.scopeId,
      };

      // Search (DRF SearchFilter usually uses `search`)
      if (searchQuery?.trim()) params.search = searchQuery.trim();

      // Filters (backend supports ho to use hoga, nahi to ignore ho jayega)
      if (selectedProperty !== "all") params.site_id = selectedProperty;
      if (selectedTenant !== "all") params.tenant = selectedTenant;
      if (selectedType !== "all") params.agreement_type = selectedType;
      if (selectedStatus !== "all") params.status = selectedStatus; // we keep API values in dropdown below

      const resp = await leaseAPI.listAgreements(params);

      const list = Array.isArray(resp) ? resp : resp?.results || [];
      const total = resp?.count ?? (Array.isArray(resp) ? resp.length : list.length);

      // Normalize rows for UI
      const rows = list.map((x) => {
        const dbId = x.id; // ✅ DRF pk
        const leaseId = x.lease_id || `#${x.id}`;
        const version = x.version_number || x.version || "—";

        const statusUi = STATUS_API_TO_UI[x.status] || x.status || "—";
        const agreementType = x.agreement_type || "—";

        // tenant display
        const tenantName =
          x.tenant_name ||
          x.tenant_display ||
          x.tenant?.legal_name ||
          x.tenant?.name ||
          x.tenant?.company_name ||
          (typeof x.tenant === "string" ? x.tenant : "—");

        // property / unit(s) display
        const siteLabel =
          x.site_name ||
          x.site?.name ||
          x.site?.code ||
          (x.site_id ? `Site ${x.site_id}` : "—");

        // dates
        const commencement = safeDate(x.commencement_date || x.commencement);
        const expiry = safeDate(x.expiry_date || x.expiry);

        // escalation date (if serializer includes it)
        const nextEscalation = safeDate(
          x.next_review_date ||
            x.next_escalation_date ||
            x?.terms?.escalation?.next_review_date
        );

        // base rent / ar (if serializer includes totals)
        const baseRent =
          x.base_rent_monthly_total != null
            ? fmtMoney(x.base_rent_monthly_total, "$")
            : x.base_rent != null
            ? fmtMoney(x.base_rent, "$")
            : "—";

        const outstandingAR =
          x.outstanding_ar != null
            ? fmtMoney(x.outstanding_ar, "$")
            : x.ar_outstanding != null
            ? fmtMoney(x.ar_outstanding, "$")
            : "$0.00";

        return {
          dbId,
          leaseId,
          version,
          statusUi,
          agreementType,
          tenantName,
          property: siteLabel,
          commencement,
          expiry,
          baseRent,
          nextEscalation: nextEscalation === "—" ? "—" : nextEscalation,
          outstandingAR,
        };
      });

      setLeases(rows);
      setCount(total);
    } catch (e) {
      setPageError(e?.message || "Failed to load leases");
      setLeases([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  // useEffect(() => {
  //   fetchFilters();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);
  useEffect(() => {
  if (!ctx.scopeId || !ctx.orgId) return;
  fetchFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ctx.scopeId, ctx.orgId, ctx.scopeType]);


  // refetch on filters/pagination/search
  // useEffect(() => {
  //   fetchLeases();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [page, selectedProperty, selectedTenant, selectedType, selectedStatus, searchQuery]);


useEffect(() => {
  if (!ctx.scopeId || !ctx.orgId) return;
  fetchLeases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  ctx.scopeId,
  ctx.orgId,
  ctx.scopeType,
  page,
  selectedProperty,
  selectedTenant,
  selectedType,
  selectedStatus,
  searchQuery,
]);





  const handleView = (dbId) => {
    setSelectedLeaseDbId(dbId);
    setShowLeaseDetail(true);
  };

  const handleEdit = (dbId) => {
    setSelectedLeaseDbId(dbId);
    setShowLeaseDetail(true);
  };

  const handleDelete = async (dbId) => {
    if (!confirm("Are you sure you want to delete this lease?")) return;
    try {
      await leaseAPI.deleteAgreement(dbId);
      await fetchLeases();
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  };

  if (showLeaseDetail) {
    return (
      <LeaseDetailPage
        context={ctx}
        leaseId={selectedLeaseDbId} // ✅ numeric DB id
        onClose={() => {
          setShowLeaseDetail(false);
          setSelectedLeaseDbId(null);
          fetchLeases(); // ✅ refresh after save/close
        }}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Lease Agreements</h1>
          <button
            onClick={() => {
              setSelectedLeaseDbId(null);
              setShowLeaseDetail(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Lease
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={selectedProperty}
              onChange={(e) => {
                setPage(1);
                setSelectedProperty(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {siteOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTenant}
              onChange={(e) => {
                setPage(1);
                setSelectedTenant(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {tenantOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Agreement Type - we keep as UI string; backend may ignore */}
            <select
              value={selectedType}
              onChange={(e) => {
                setPage(1);
                setSelectedType(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="Commercial Retail Lease">Retail</option>
              <option value="Office Lease">Office</option>
              <option value="Warehouse Lease">Warehouse</option>
              <option value="Industrial Lease">Industrial</option>
            </select>

            {/* Status - send API values */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setPage(1);
                setSelectedStatus(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
              <option value="DRAFT">Draft</option>
            </select>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leases..."
                value={searchQuery}
                onChange={(e) => {
                  setPage(1);
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {pageError ? (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
            {pageError}
          </div>
        ) : null}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lease ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Agreement Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tenant Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Commencement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Base Rent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Next Escalation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Outstanding AR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading leases...
                    </td>
                  </tr>
                ) : leases.length ? (
                  leases.map((lease) => (
                    <tr key={lease.dbId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{lease.leaseId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.version}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lease.statusUi)}`}>
                          {lease.statusUi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.agreementType}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{lease.tenantName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.property}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.commencement}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.expiry}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{lease.baseRent}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lease.nextEscalation}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${lease.outstandingAR === "$0.00" ? "text-green-600" : "text-red-600"}`}>
                          {lease.outstandingAR}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(lease.dbId)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEdit(lease.dbId)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(lease.dbId)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded" title="More">
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                      No leases found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} • Total {count} leases
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaseListPage;
