// src/Components/Floor/FloorSetupPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, Filter, Pencil, Eye, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { setupAPI } from "../../services/api";

/* ---------- small helpers ---------- */
const n2 = (v) => {
  const num = Number(v || 0);
  if (Number.isNaN(num)) return 0;
  return num;
};

const fmtInt = (v) => Math.round(n2(v)).toLocaleString("en-IN");

const chipClass = (isActive) =>
  isActive
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-red-50 text-red-700 border-red-200";

const statusChip = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "AVAILABLE") return "bg-green-50 text-green-700 border-green-200";
  if (s === "RESERVED") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "OCCUPIED") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "INACTIVE") return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? "bg-blue-600" : "bg-gray-200"
    } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

const DEFAULT_FORM = {
  id: null,
  site: "",
  tower_id: "", // ✅ IMPORTANT: backend wants tower_id
  number: "",
  label: "",
  status: "AVAILABLE",
  total_area_sqft: "",
  leasable_area_sqft: "",
  cam_area_sqft: "",
  is_active: true,

  // UI-only fields (not in backend payload yet)
  floor_type_ui: "Commercial",
  allowed_use_ui: "Office",
  leasing_type_ui: "Fully fitted",
  max_units_allowed_ui: "10",
};

const FloorSetupPage = () => {
  /* ---------- page mode ---------- */
  const [viewMode, setViewMode] = useState("LIST"); // LIST | FORM
  const [formMode, setFormMode] = useState("CREATE"); // CREATE | EDIT | VIEW

  /* ---------- data ---------- */
  const [sites, setSites] = useState([]);
  const [towers, setTowers] = useState([]);
  const [floors, setFloors] = useState([]);

  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedTowerId, setSelectedTowerId] = useState("");

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingTowers, setLoadingTowers] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);

  /* ---------- list filters ---------- */
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  /* ---------- form ---------- */
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const readOnly = formMode === "VIEW";
  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  /* ---------- load sites ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingSites(true);
        const list = await setupAPI.getAllSites();
        const safeList = Array.isArray(list) ? list : [];
        setSites(safeList);

        const savedSite = localStorage.getItem("floorSetup.selectedSiteId");
        const initialSiteId =
          savedSite && safeList.some((s) => String(s.id) === String(savedSite))
            ? savedSite
            : safeList?.[0]?.id
            ? String(safeList[0].id)
            : "";

        if (initialSiteId) setSelectedSiteId(initialSiteId);
      } catch (e) {
        toast.error(e?.message || "Failed to load sites");
      } finally {
        setLoadingSites(false);
      }
    })();
  }, []);

  /* ---------- load towers when site changes ---------- */
  useEffect(() => {
    if (!selectedSiteId) return;

    localStorage.setItem("floorSetup.selectedSiteId", String(selectedSiteId));

    (async () => {
      try {
        setLoadingTowers(true);

        // reset dependent
        setSelectedTowerId("");
        setTowers([]);
        setFloors([]);

        const list = await setupAPI.getTowers(selectedSiteId);
        const safe = Array.isArray(list) ? list : [];
        setTowers(safe);

        const savedTower = localStorage.getItem("floorSetup.selectedTowerId");
        const initialTowerId =
          savedTower && safe.some((t) => String(t.id) === String(savedTower))
            ? savedTower
            : safe?.[0]?.id
            ? String(safe[0].id)
            : "";

        if (initialTowerId) setSelectedTowerId(initialTowerId);
      } catch (e) {
        toast.error(e?.message || "Failed to load towers");
      } finally {
        setLoadingTowers(false);
      }
    })();
  }, [selectedSiteId]);

  /* ---------- load floors when tower changes ---------- */
  useEffect(() => {
    if (!selectedTowerId) return;

    localStorage.setItem("floorSetup.selectedTowerId", String(selectedTowerId));

    (async () => {
      try {
        setLoadingFloors(true);
        const list = await setupAPI.getFloors(selectedTowerId);
        setFloors(Array.isArray(list) ? list : []);
      } catch (e) {
        toast.error(e?.message || "Failed to load floors");
      } finally {
        setLoadingFloors(false);
      }
    })();
  }, [selectedTowerId]);

  /* ---------- derived ---------- */
  const selectedSite = useMemo(
    () => sites.find((s) => String(s.id) === String(selectedSiteId)),
    [sites, selectedSiteId]
  );
  const selectedTower = useMemo(
    () => towers.find((t) => String(t.id) === String(selectedTowerId)),
    [towers, selectedTowerId]
  );

  const filteredFloors = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (floors || [])
      .filter((f) => {
        if (onlyActive && !f.is_active) return false;
        if (statusFilter !== "ALL" && String(f.status).toUpperCase() !== statusFilter) return false;

        if (!query) return true;
        const label = String(f.label || "").toLowerCase();
        const num = String(f.number ?? "").toLowerCase();
        return label.includes(query) || num.includes(query);
      })
      .sort((a, b) => n2(a.number) - n2(b.number));
  }, [floors, q, onlyActive, statusFilter]);

  const totals = useMemo(() => {
    const list = filteredFloors || [];
    const totalFloors = list.length;
    const totalArea = list.reduce((acc, f) => acc + n2(f.total_area_sqft), 0);
    const totalLeasable = list.reduce((acc, f) => acc + n2(f.leasable_area_sqft), 0);
    const totalCam = list.reduce((acc, f) => acc + n2(f.cam_area_sqft), 0);
    const remaining = Math.max(0, totalArea - totalLeasable - totalCam);
    return { totalFloors, totalArea, totalLeasable, totalCam, remaining };
  }, [filteredFloors]);

  const computedAllocated = useMemo(
    () => n2(form.leasable_area_sqft) + n2(form.cam_area_sqft),
    [form.leasable_area_sqft, form.cam_area_sqft]
  );

  const computedRemaining = useMemo(
    () => Math.max(0, n2(form.total_area_sqft) - computedAllocated),
    [form.total_area_sqft, computedAllocated]
  );

  /* ---------- actions ---------- */
  const refreshFloors = async () => {
    if (!selectedTowerId) return;
    try {
      setLoadingFloors(true);
      const list = await setupAPI.getFloors(selectedTowerId);
      setFloors(Array.isArray(list) ? list : []);
      toast.success("Floors refreshed");
    } catch (e) {
      toast.error(e?.message || "Failed to refresh floors");
    } finally {
      setLoadingFloors(false);
    }
  };

  const goToList = () => {
    if (saving) return;
    setViewMode("LIST");
    setFormMode("CREATE");
    setForm(DEFAULT_FORM);
  };

  const openCreate = () => {
    if (!selectedSiteId || !selectedTowerId) {
      toast.error("Please select Site and Tower first");
      return;
    }
    setFormMode("CREATE");
    setForm({
      ...DEFAULT_FORM,
      site: Number(selectedSiteId),
      tower_id: Number(selectedTowerId), // ✅
      status: "AVAILABLE",
      is_active: true,
    });
    setViewMode("FORM");
  };

  const openView = (floor) => {
    setFormMode("VIEW");
    setForm({
      ...DEFAULT_FORM,
      id: floor.id,
      site: floor.site ?? floor.site_id ?? "",
      tower_id: floor.tower_id ?? floor.tower ?? "", // ✅ handle both shapes
      number: floor.number ?? "",
      label: floor.label ?? "",
      status: floor.status ?? "AVAILABLE",
      total_area_sqft: floor.total_area_sqft ?? "",
      leasable_area_sqft: floor.leasable_area_sqft ?? "",
      cam_area_sqft: floor.cam_area_sqft ?? "",
      is_active: floor.is_active ?? true,
    });
    setViewMode("FORM");
  };

  const openEdit = (floor) => {
    setFormMode("EDIT");
    setForm({
      ...DEFAULT_FORM,
      id: floor.id,
      site: floor.site ?? floor.site_id ?? "",
      tower_id: floor.tower_id ?? floor.tower ?? "", // ✅ handle both shapes
      number: floor.number ?? "",
      label: floor.label ?? "",
      status: floor.status ?? "AVAILABLE",
      total_area_sqft: floor.total_area_sqft ?? "",
      leasable_area_sqft: floor.leasable_area_sqft ?? "",
      cam_area_sqft: floor.cam_area_sqft ?? "",
      is_active: floor.is_active ?? true,
    });
    setViewMode("FORM");
  };

  // keep list dropdowns in sync when form changes site/tower_id
  useEffect(() => {
    if (viewMode !== "FORM") return;
    if (form.site && String(form.site) !== String(selectedSiteId)) {
      setSelectedSiteId(String(form.site));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.site, viewMode]);

  useEffect(() => {
    if (viewMode !== "FORM") return;
    if (form.tower_id && String(form.tower_id) !== String(selectedTowerId)) {
      setSelectedTowerId(String(form.tower_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tower_id, viewMode]);

  const buildPayload = (override = {}) => ({
    site: Number(form.site),
    tower_id: Number(form.tower_id), // ✅ REQUIRED by backend
    number: Number(form.number),
    label: String(form.label),
    status: String(form.status || "AVAILABLE"),
    total_area_sqft: String(form.total_area_sqft),
    leasable_area_sqft: String(form.leasable_area_sqft || "0.00"),
    cam_area_sqft: String(form.cam_area_sqft || "0.00"),
    is_active: !!form.is_active,
    ...override,
  });

  const saveFloor = async ({ asDraft = false } = {}) => {
    if (readOnly) return;

    if (!form.site || !form.tower_id) return toast.error("Site and Tower are required");
    if (String(form.number).trim() === "") return toast.error("Floor number is required");
    if (!String(form.label).trim()) return toast.error("Floor name/label is required");
    if (String(form.total_area_sqft).trim() === "") return toast.error("Total area is required");

    const payload = asDraft
      ? buildPayload({ status: "INACTIVE", is_active: false })
      : buildPayload();

    try {
      setSaving(true);

      if (formMode === "CREATE") {
        await setupAPI.createFloor(payload);
        toast.success(asDraft ? "Draft saved" : "Floor created");
      } else {
        await setupAPI.updateFloor(form.id, payload);
        toast.success(asDraft ? "Draft updated" : "Floor updated");
      }

      await refreshFloors();
      goToList();
    } catch (e) {
      toast.error(e?.message || "Failed to save floor");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- FORM PAGE UI ---------- */
  if (viewMode === "FORM") {
    const title =
      formMode === "CREATE" ? "Add Floor" : formMode === "EDIT" ? "Edit Floor" : "Floor Details";

    const crumbFloor =
      form.label || (String(form.number).trim() ? `Floor ${form.number}` : "New Floor");

    return (
      <div className="px-6 py-6">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">
              Property Setup <span className="mx-1">›</span> Building{" "}
              <span className="mx-1">›</span> Floor Setup{" "}
              <span className="mx-1">›</span> {crumbFloor}
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mt-1">{title}</h2>
          </div>

          <button
            onClick={goToList}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          {/* Identity */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800">Identity</h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
                <select
                  value={form.site}
                  onChange={(e) => onChange("site", Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving || readOnly || loadingSites}
                >
                  {(sites || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || `Site ${s.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tower</label>
                <select
                  value={form.tower_id}
                  onChange={(e) => onChange("tower_id", Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving || readOnly || loadingTowers || !form.site}
                >
                  {(towers || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Tower ${t.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Floor Name / Number
                </label>
                <input
                  value={form.label}
                  onChange={(e) => onChange("label", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Floor 101 / Tower 1 - Floor 1"
                  disabled={saving || readOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Floor Number</label>
                <input
                  type="number"
                  value={form.number}
                  onChange={(e) => onChange("number", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="101"
                  disabled={saving || readOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => onChange("status", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving || readOnly}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-between md:justify-start md:gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Status (Active)</div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={!!form.is_active}
                      onChange={(v) => onChange("is_active", v)}
                      disabled={saving || readOnly}
                    />
                    <span className="text-sm text-gray-700">
                      {form.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Area Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800">Area Details</h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total Floor Area (sq.ft)
                </label>
                <input
                  value={form.total_area_sqft}
                  onChange={(e) => onChange("total_area_sqft", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                  disabled={saving || readOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Usable / Net Area (optional)
                </label>
                <input
                  value={form.leasable_area_sqft}
                  onChange={(e) => onChange("leasable_area_sqft", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="45000"
                  disabled={saving || readOnly}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Common / Service Area (optional)
                </label>
                <input
                  value={form.cam_area_sqft}
                  onChange={(e) => onChange("cam_area_sqft", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                  disabled={saving || readOnly}
                />
              </div>

              <div className="md:col-span-2">
                <div className="mt-1 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-2">
                  <span>
                    <span className="text-gray-500">Allocated Area:</span>{" "}
                    <span className="font-semibold">{fmtInt(computedAllocated)}</span> sq.ft
                  </span>
                  <span>
                    <span className="text-gray-500">Remaining Area:</span>{" "}
                    <span className="font-semibold">{fmtInt(computedRemaining)}</span> sq.ft
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Remaining Area = Total Floor Area - (Usable/Net Area + Common/Service Area)
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goToList}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>

            {formMode !== "VIEW" && (
              <>
                <button
                  type="button"
                  onClick={() => saveFloor({ asDraft: true })}
                  className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => saveFloor({ asDraft: false })}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- LIST PAGE UI ---------- */
  return (
    <div className="px-6 py-6">
      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Floor Setup</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage floors by Site → Tower. Add/update floor areas and status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshFloors}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFloors ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Floor
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="mt-5 bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Site */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingSites}
            >
              {sites.length === 0 ? (
                <option value="">No sites</option>
              ) : (
                sites.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name || `Site ${s.id}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Tower */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tower</label>
            <select
              value={selectedTowerId}
              onChange={(e) => setSelectedTowerId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingTowers || !selectedSiteId}
            >
              {towers.length === 0 ? (
                <option value="">No towers</option>
              ) : (
                towers.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name || `Tower ${t.id}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search floor</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type floor label or number..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Filters</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOnlyActive((p) => !p)}
                className={`h-10 px-3 rounded-lg border text-sm inline-flex items-center gap-2 ${
                  onlyActive
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                Active
              </button>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Context chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Selected:</span>
          <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
            Site: {selectedSite?.name || "-"}
          </span>
          <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
            Tower: {selectedTower?.name || "-"}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="mt-5 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Floors</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {loadingFloors ? "Loading..." : `${filteredFloors.length} records`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Total Area (sq.ft)</th>
                <th className="px-4 py-3">Leasable (sq.ft)</th>
                <th className="px-4 py-3">CAM (sq.ft)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loadingFloors ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading floors...
                  </td>
                </tr>
              ) : filteredFloors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No floors found. Try changing filters or add a new floor.
                  </td>
                </tr>
              ) : (
                filteredFloors.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {f.label || `Floor ${f.number}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        No: {f.number} • ID: {f.id}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">{fmtInt(f.total_area_sqft)}</td>
                    <td className="px-4 py-3 text-gray-800">{fmtInt(f.leasable_area_sqft)}</td>
                    <td className="px-4 py-3 text-gray-800">{fmtInt(f.cam_area_sqft)}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${statusChip(f.status)}`}>
                        {String(f.status || "—")}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${chipClass(!!f.is_active)}`}>
                        {!!f.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openView(f)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => openEdit(f)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Footer */}
        <div className="border-t border-gray-200 bg-white">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 px-4 py-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Total Floors</div>
              <div className="text-lg font-semibold text-gray-800">{totals.totalFloors}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Total Floor Area (sq.ft)</div>
              <div className="text-lg font-semibold text-gray-800">{fmtInt(totals.totalArea)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Total Leasable (sq.ft)</div>
              <div className="text-lg font-semibold text-gray-800">{fmtInt(totals.totalLeasable)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Total CAM (sq.ft)</div>
              <div className="text-lg font-semibold text-gray-800">{fmtInt(totals.totalCam)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500">Approx Remaining (sq.ft)</div>
              <div className="text-lg font-semibold text-gray-800">{fmtInt(totals.remaining)}</div>
            </div>
          </div>
          <div className="px-4 pb-4 text-xs text-gray-500">
            Tip: Click <span className="font-medium">View</span> or <span className="font-medium">Edit</span> to open the floor details page.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorSetupPage;
