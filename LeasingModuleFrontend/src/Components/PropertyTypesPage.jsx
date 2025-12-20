import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Search,
  Trash2,
  Download,
  Plus,
  Eye,
  Edit2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { setupAPI } from "../services/api";

// Helper function to convert to Title Case
const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper function to format numbers with commas and INR prefix
const formatNumber = (num) => {
  if (!num && num !== 0) return "";
  const numStr =
    typeof num === "string" ? num.replace(/[^0-9.]/g, "") : String(num);
  if (!numStr) return "";
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `INR ${parts.join(".")}`;
};

const toNumber = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^0-9.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const uiTypeToSiteType = (uiType) => {
  const t = (uiType || "").toLowerCase();
  if (t === "residential") return "RESIDENTIAL";
  // office/retail -> commercial
  return "COMMERCIAL";
};

const uiOwnershipToApi = (v) => {
  const s = String(v || "").toLowerCase();
  if (s.includes("joint")) return "JOINT_VENTURE";
  if (s.includes("lease")) return "LEASED_IN";
  return "OWN";
};

const safeJson = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const parseScopeValue = (value) => {
  // "ORG:1" | "COMPANY:5" | "ENTITY:9"
  const [type, idStr] = String(value || "").split(":");
  const id = Number(idStr);
  if (!type || !Number.isFinite(id)) return null;
  return { type, id };
};

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

const toFloatOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// ✅ Parse GST/PAN from single input (keeps your UI field name intact)
const parseGstPan = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { gst_no: "", pan_no: "" };

  // Try split by common separators
  const parts = raw
    .split(/[\/,| ]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  let gst_no = "";
  let pan_no = "";

  const pick = (s) => s.replace(/\s+/g, "");

  for (const p of parts.length ? parts : [raw]) {
    const t = pick(p);
    if (!gst_no && t.length === 15) gst_no = t; // GSTIN usually 15
    else if (!pan_no && t.length === 10) pan_no = t; // PAN usually 10
  }

  // If nothing matched, keep as gst_no (best effort)
  if (!gst_no && !pan_no) gst_no = pick(raw);

  return { gst_no, pan_no };
};

const getNiceError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "Request failed.";
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  try {
    return JSON.stringify(data);
  } catch {
    return err?.message || "Request failed.";
  }
};

// Property Types Page Component
const PropertyTypesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

  // Get active scope from localStorage
  const getActiveScope = () => {
    const stored = localStorage.getItem("active");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { mode: "ALL" };
      }
    }
    return { mode: "ALL" };
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false);

  // Fetch sites based on active scope
  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const activeScope = getActiveScope();
      let sites;

      if (activeScope.mode === "ALL") {
        sites = await setupAPI.getAllSites();
      } else {
        sites = await setupAPI.getSitesByScope(
          activeScope.scope_type || activeScope.mode,
          activeScope.scope_id || activeScope.scopeId || activeScope.id
        );
      }

      // Normalize sites data to match the properties format with formatting
      const normalizedSites = Array.isArray(sites)
  ? sites.map((site) => {
      // ✅ pick correct fields from API (and keep fallbacks)
      const leasableAreaNum = toNumber(
        site.leasable_area_sqft ??
          site.leasable_area ??
          site.leasableAreaSqft ??
          site.leasableArea
      );

      const totalBuiltUpNum = toNumber(
        site.total_builtup_area_sqft ??
          site.total_builtup_area ??
          site.totalBuiltUpAreaSqft ??
          site.totalBuiltUp ??
          site.total_area_sqft ??
          site.total_area
      );

      return {
        ...site, // keep original site data

        id: site.id?.toString() || `SITE-${site.code || ""}`,
        name: toTitleCase(site.name || ""),
        code: site.code || "",
        type: toTitleCase(site.site_type || site.type || ""),
        city: toTitleCase(site.city || ""),

        // ✅ show even if value is 0 (0 is valid number)
        leasableArea:
          leasableAreaNum !== null ? `${leasableAreaNum.toLocaleString()} sq ft` : "",

        totalBuiltUp:
          totalBuiltUpNum !== null ? `${totalBuiltUpNum.toLocaleString()} sq ft` : "",
      };
    })
  : [];


      setProperties(normalizedSites);
    } catch (err) {
      setError(getNiceError(err) || "Failed to fetch sites. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sites when component mounts
  useEffect(() => {
    fetchSites();

    // Listen for storage changes to refresh when active scope changes
    const handleStorageChange = (e) => {
      if (e.key === "active") {
        fetchSites();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("activeScopeChanged", fetchSites);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("activeScopeChanged", fetchSites);
    };
  }, [fetchSites]);

  const [newProperty, setNewProperty] = useState({
    name: "",
    code: "", // keep in state (DO NOT remove), but UI removed + not sent
    type: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    latitude: "",
    longitude: "",
    developerEntity: "",
    spvName: "",
    gstpan: "",
    totalBuiltUp: "",
    leasableArea: "",
    commonArea: "",
    ownershipType: "Own",
    buildings: [],
  });

  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    location: true,
    legalDeveloper: true,
    areaOwnership: true,
    buildingBlock: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ✅ scope_tree for dropdown in Legal & Developer
  const scopeTree = useMemo(() => {
    // try direct key
    const direct = safeJson(localStorage.getItem("scope_tree"), null);
    if (Array.isArray(direct)) return direct;

    // try login response objects
    const keys = [
      "loginResponse",
      "login_response",
      "login",
      "auth",
      "user",
      "userData",
      "profile",
    ];

    for (const k of keys) {
      const obj = safeJson(localStorage.getItem(k), null);
      if (obj && Array.isArray(obj.scope_tree)) return obj.scope_tree;
    }

    return [];
  }, []);

  const scopeOptions = useMemo(() => {
    const orgs = [];
    const companies = [];
    const entities = [];

    scopeTree.forEach((org) => {
      orgs.push({
        value: `ORG:${org.id}`,
        label: `Org: ${org.name}`,
      });

      (org.companies || []).forEach((co) => {
        companies.push({
          value: `COMPANY:${co.id}`,
          label: `Company: ${co.name} (Org: ${org.name})`,
        });

        (co.entities || []).forEach((en) => {
          entities.push({
            value: `ENTITY:${en.id}`,
            label: `Entity: ${en.name} (Company: ${co.name})`,
          });
        });
      });
    });

    return { orgs, companies, entities };
  }, [scopeTree]);

  const [selectedScopeValue, setSelectedScopeValue] = useState("");

  // Set default scope when modal opens (does NOT affect list page)
  useEffect(() => {
    if (!showNewPropertyModal) return;

    const active = getActiveScope();

    const activeMode = String(
      active?.scope_type || active?.mode || ""
    ).toUpperCase();
    const activeType = activeMode.includes("ORG")
      ? "ORG"
      : activeMode.includes("COMP")
      ? "COMPANY"
      : activeMode.includes("ENTITY")
      ? "ENTITY"
      : "";

    const activeId = Number(active?.scope_id || active?.scopeId || active?.id);
    const activeValue =
      activeType && Number.isFinite(activeId)
        ? `${activeType}:${activeId}`
        : "";

    const allValues = [
      ...scopeOptions.orgs.map((x) => x.value),
      ...scopeOptions.companies.map((x) => x.value),
      ...scopeOptions.entities.map((x) => x.value),
    ];

    if (activeValue && allValues.includes(activeValue)) {
      setSelectedScopeValue(activeValue);
      return;
    }

    const fallbackValue =
      scopeOptions.entities[0]?.value ||
      scopeOptions.companies[0]?.value ||
      scopeOptions.orgs[0]?.value ||
      "";

    setSelectedScopeValue(fallbackValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewPropertyModal, scopeOptions]);

  const selectedScope = useMemo(
    () => parseScopeValue(selectedScopeValue),
    [selectedScopeValue]
  );

  // NEW toggles (in Legal & Developer)
  const [createCompany, setCreateCompany] = useState(false); // ORG only
  const [alsoCreateEntityInNewCompany, setAlsoCreateEntityInNewCompany] =
    useState(false); // ORG + createCompany only
  const [createEntity, setCreateEntity] = useState(false); // COMPANY only

  useEffect(() => {
    setCreateCompany(false);
    setAlsoCreateEntityInNewCompany(false);
    setCreateEntity(false);
  }, [selectedScopeValue]);

  // ✅ Pincode API auto-fill city/state
  // ✅ Pincode API auto-fill city/state (robust + always updates)
const pinFetchRef = useRef("");
const pinAbortRef = useRef(null);
const [pinLookup, setPinLookup] = useState({ loading: false, error: "" });
const lastAutoAddressRef = useRef("");
const lastPinForAddressRef = useRef("");
const addressTouchedRef = useRef(false);

useEffect(() => {
  if (!showNewPropertyModal) return;

  const pin = onlyDigits(newProperty.pinCode).slice(0, 6);

  // if pin incomplete, don't fetch
  if (pin.length !== 6) {
    pinFetchRef.current = "";
    // optional: clear if you want
    // setNewProperty((p) => ({ ...p, city: "", state: "" }));
    setPinLookup({ loading: false, error: "" });
    if (pinAbortRef.current) pinAbortRef.current.abort();
    return;
  }

  const t = setTimeout(async () => {
    if (pinFetchRef.current === pin) return;
    pinFetchRef.current = pin;

    // abort previous request
    if (pinAbortRef.current) pinAbortRef.current.abort();
    const controller = new AbortController();
    pinAbortRef.current = controller;

    setPinLookup({ loading: true, error: "" });

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      const first = Array.isArray(data) ? data[0] : null;

      if (first && first.Status === "Success" && first.PostOffice?.length) {
  const po = first.PostOffice[0];

  const city = po.District || po.Name || "";
  const state = po.State || "";

  // ✅ Address auto (Name + Division)
  const autoAddress = [po.Name, po.Division].filter(Boolean).join(", ");

  setNewProperty((prev) => {
    const pinChanged = pin !== lastPinForAddressRef.current;

    const next = {
      ...prev,
      city,
      state,
    };

    // ✅ RULE:
    // - If pin changed => ALWAYS update address to new autoAddress
    // - If same pin => update only if user hasn't edited address
    if (autoAddress) {
      if (pinChanged || !addressTouchedRef.current) {
        next.address = autoAddress;
        lastAutoAddressRef.current = autoAddress;
        addressTouchedRef.current = false; // reset after auto-fill
      }
    }

    lastPinForAddressRef.current = pin;
    return next;
  });

  setPinLookup({ loading: false, error: "" });
}
 else {
  setPinLookup({ loading: false, error: "Invalid PIN code" });
}

    } catch (e) {
      if (e?.name === "AbortError") return;
      setPinLookup({ loading: false, error: "PIN lookup failed" });
    }
  }, 450);

  return () => clearTimeout(t);
}, [newProperty.pinCode, showNewPropertyModal]);


  // ✅ Auto-calc Total Built-up from Leasable Area + Common Area %
  const lastAutoTotalBuiltUpRef = useRef("");
  useEffect(() => {
    if (!showNewPropertyModal) return;

    const leasable = toNumber(newProperty.leasableArea);
    const commonPct = toFloatOrNull(newProperty.commonArea);

    if (leasable === null || commonPct === null) return;

    const computed = leasable * (1 + commonPct / 100);
    const computedStr = String(Math.round(computed));

    setNewProperty((prev) => {
      // if user manually changed totalBuiltUp, don’t override
      if (
        prev.totalBuiltUp &&
        prev.totalBuiltUp !== lastAutoTotalBuiltUpRef.current
      ) {
        return prev;
      }

      lastAutoTotalBuiltUpRef.current = computedStr;
      return { ...prev, totalBuiltUp: computedStr };
    });
  }, [newProperty.leasableArea, newProperty.commonArea, showNewPropertyModal]);

  const filteredProperties = properties.filter((property) => {
    const name = (property.name || "").toLowerCase();
    const code = (property.code || "").toLowerCase();
    const city = (property.city || "").toLowerCase();
    const type = (property.type || "").toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      name.includes(searchLower) ||
      code.includes(searchLower) ||
      city.includes(searchLower);

    const matchesType =
      filterType === "all" || type === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  // ✅ CREATE (bootstrap) — remove code from UI + do NOT send it
  const handleAddProperty = async () => {
    setError("");

    if (!selectedScope) {
      const msg =
        "Please select scope (ORG / COMPANY / ENTITY) before creating.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // ✅ Code removed — only Name required
    if (!newProperty.name) {
      const msg = "Name is required.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // validations for NEW company/entity
    if (selectedScope.type === "ORG" && createCompany) {
      if (!newProperty.developerEntity?.trim()) {
        const msg = "Developer Entity is required to create a new Company.";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (
        alsoCreateEntityInNewCompany &&
        !newProperty.developerEntity?.trim()
      ) {
        const msg = "Developer Entity is required to create a new Entity.";
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    if (selectedScope.type === "COMPANY" && createEntity) {
      if (!newProperty.developerEntity?.trim()) {
        const msg = "Developer Entity is required to create a new Entity.";
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    const { gst_no, pan_no } = parseGstPan(newProperty.gstpan);
    const ownership_type = uiOwnershipToApi(newProperty.ownershipType);

    const scope = { type: selectedScope.type, id: Number(selectedScope.id) };

    if (selectedScope.type === "ORG" && createCompany) {
      scope.NEW = {
        company: {
          name: newProperty.developerEntity.trim(),
          code: "",
          spv_name: newProperty.spvName || "",
          gst_no: gst_no || "",
          pan_no: pan_no || "",
          ownership_type,
        },
      };

      if (alsoCreateEntityInNewCompany) {
        scope.NEW.entity = {
          name: newProperty.developerEntity.trim(),
          code: "",
          spv_name: newProperty.spvName || "",
          gst_no: gst_no || "",
          pan_no: pan_no || "",
          ownership_type,
        };
      }
    }

    if (selectedScope.type === "COMPANY" && createEntity) {
      scope.NEW = {
        entity: {
          name: newProperty.developerEntity.trim(),
          code: "",
          spv_name: newProperty.spvName || "",
          gst_no: gst_no || "",
          pan_no: pan_no || "",
          ownership_type,
        },
      };
    }

    // ✅ Send built-up + common area + ALL tower fields
    const payload = {
      scope,
      site: {
        name: newProperty.name,

        // ❌ DO NOT SEND CODE
        // code: newProperty.code,

        site_type: uiTypeToSiteType(newProperty.type),
        address: newProperty.address || "",
        city: newProperty.city || "",
        state: newProperty.state || "",
        pincode: onlyDigits(newProperty.pinCode).slice(0, 6),
        latitude: toFloatOrNull(newProperty.latitude),
        longitude: toFloatOrNull(newProperty.longitude),

        // ✅ built-up + leasable + common area
        total_builtup_area_sqft: toNumber(newProperty.totalBuiltUp),
        leasable_area_sqft: toNumber(newProperty.leasableArea),
        common_area_percent: toFloatOrNull(newProperty.commonArea),
      },

      // ✅ send every building field (keep building object name same, don’t remove anything)
      towers: (newProperty.buildings || []).map((b) => ({
        id: b.id,
        name: b.name,
        floors: Number(b.floor || 0),

        buildingType: b.buildingType || "",
        totalArea: toNumber(b.totalArea),
        leasableArea: toNumber(b.leasableArea),
        completionDate: b.completionDate || "",
        occupancyDate: b.occupancyDate || "",
      })),
    };

    setCreateLoading(true);
    try {
      const fn =
        setupAPI.bootstrapProject ||
        setupAPI.projectBootstrap ||
        setupAPI.projectBootstrapCreate;

      if (!fn) {
        throw new Error("bootstrapProject API function not found in setupAPI.");
      }

      const res = await fn(payload);

      await fetchSites();

      const site = res?.site;
      toast.success(
        `Project created: ${site?.name || newProperty.name}${
          site?.code ? ` (${site.code})` : ""
        }`
      );

      setNewProperty({
        name: "",
        code: "",
        type: "",
        address: "",
        city: "",
        state: "",
        pinCode: "",
        latitude: "",
        longitude: "",
        developerEntity: "",
        spvName: "",
        gstpan: "",
        totalBuiltUp: "",
        leasableArea: "",
        commonArea: "",
        ownershipType: "Own",
        buildings: [],
      });

      setExpandedSections({
        basicInfo: true,
        location: true,
        legalDeveloper: true,
        areaOwnership: true,
        buildingBlock: true,
      });

      setShowNewPropertyModal(false);
    } catch (err) {
      const msg =
        getNiceError(err) || "Failed to create site. Please try again.";
      setError(msg);
      toast.error(msg);
      // console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProperty = () => {
    setNewProperty({
      name: "",
      code: "",
      type: "",
      address: "",
      city: "",
      state: "",
      pinCode: "",
      latitude: "",
      longitude: "",
      developerEntity: "",
      spvName: "",
      gstpan: "",
      totalBuiltUp: "",
      leasableArea: "",
      commonArea: "",
      ownershipType: "Own",
      buildings: [],
    });
    setShowNewPropertyModal(false);
  };

  const addBuilding = () => {
    const newBuilding = {
      id: newProperty.buildings.length + 1,
      name: "",
      floor: "",
      buildingType: "Office",
      totalArea: "",
      leasableArea: "",
      completionDate: "",
      occupancyDate: "",
    };
    setNewProperty({
      ...newProperty,
      buildings: [...newProperty.buildings, newBuilding],
    });
  };

  const removeBuilding = (id) => {
    setNewProperty({
      ...newProperty,
      buildings: newProperty.buildings.filter((b) => b.id !== id),
    });
  };

  const updateBuilding = (id, field, value) => {
    setNewProperty({
      ...newProperty,
      buildings: newProperty.buildings.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    });
  };

  // NOTE: delete is still UI-only here (no API given)
  const handleDelete = (id) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  const handleExport = () => {
    alert("Exporting properties...");
  };

  const handleBulkDelete = () => {
    if (
      window.confirm("Are you sure you want to delete selected properties?")
    ) {
      alert("Bulk delete functionality");
    }
  };

  return (
    <div className="px-6 py-6">
      {/* Page Title and Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Master Data - property-types
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Trash2 size={16} />
            Bulk Delete
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => setShowNewPropertyModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            New Property Type
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Filter by Type</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="residential">Residential</option>
          </select>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Filter by State</option>
            <option value="telangana">Telangana</option>
            <option value="karnataka">Karnataka</option>
            <option value="maharashtra">Maharashtra</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Properties Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading sites...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Property ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    City
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Leasable Area
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Built-up Area
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No sites found
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(property.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-800">
                        {property.id}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                        {toTitleCase(property.name || "")}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {toTitleCase(property.code || "")}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {toTitleCase(property.type || "")}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {toTitleCase(property.city || "")}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {property.leasableArea}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {property.totalBuiltUp}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Property Modal */}
      {showNewPropertyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Master Data - property-types
              </h3>
              <button
                onClick={() => setShowNewPropertyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection("basicInfo")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">Basic Info</span>
                  <span className="text-gray-500">
                    {expandedSections.basicInfo ? "−" : "+"}
                  </span>
                </button>
                {expandedSections.basicInfo && (
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property ID
                      </label>
                      <input
                        type="text"
                        value="AUTO001"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newProperty.name}
                        onChange={(e) =>
                          setNewProperty({
                            ...newProperty,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Cyber Park"
                      />
                    </div>

                    {/* ✅ Code field removed from UI (DO NOT add back) */}

                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={newProperty.type}
                        onChange={(e) =>
                          setNewProperty({
                            ...newProperty,
                            type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Type</option>
                        <option value="Office">Office</option>
                        <option value="Retail">Retail</option>
                        <option value="Residential">Residential</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection("location")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">Location</span>
                  <span className="text-gray-500">
                    {expandedSections.location ? "−" : "+"}
                  </span>
                </button>
                {expandedSections.location && (
                  <div className="p-4 space-y-4">
                    {/* ✅ ONLY CHANGE: Pin Code moved above Address */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Pin Code
  </label>
  <input
    type="text"
    value={newProperty.pinCode}
    onChange={(e) =>
      setNewProperty({
        ...newProperty,
        pinCode: onlyDigits(e.target.value).slice(0, 6),
      })
    }
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g. 500081"
  />

  {pinLookup.loading ? (
    <div className="mt-2 text-xs text-blue-600">Detecting city/state...</div>
  ) : pinLookup.error ? (
    <div className="mt-2 text-xs text-red-600">{pinLookup.error}</div>
  ) : null}
</div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <textarea
  value={newProperty.address}
  onChange={(e) => {
    addressTouchedRef.current = true;
    setNewProperty({ ...newProperty, address: e.target.value });
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  rows="3"
  placeholder="Enter full address"
/>

                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={newProperty.city}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              city: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Hyderabad"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                     
                      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    State
  </label>
  <input
    type="text"
    value={newProperty.state}
    onChange={(e) =>
      setNewProperty({
        ...newProperty,
        state: e.target.value,
      })
    }
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g. Maharashtra"
  />
</div>

                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={newProperty.latitude}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              latitude: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 17.44"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={newProperty.longitude}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              longitude: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 78.48"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal & Developer Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection("legalDeveloper")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">
                    Legal & Developer
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.legalDeveloper ? "−" : "+"}
                  </span>
                </button>
                {expandedSections.legalDeveloper && (
                  <div className="p-4 space-y-4">
                    {/* ✅ Scope dropdown is placed HERE (Legal & Developer) */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scope (ORG / COMPANY / ENTITY)
                        </label>
                        <select
                          value={selectedScopeValue}
                          onChange={(e) =>
                            setSelectedScopeValue(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          {!selectedScopeValue && (
                            <option value="" disabled>
                              Select Scope (Required)
                            </option>
                          )}
                          <optgroup label="Organizations">
                            {scopeOptions.orgs.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </optgroup>

                          <optgroup label="Companies">
                            {scopeOptions.companies.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </optgroup>

                          <optgroup label="Entities">
                            {scopeOptions.entities.map((x) => (
                              <option key={x.value} value={x.value}>
                                {x.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>

                        {/* toggles */}
                        {selectedScope?.type === "ORG" && (
                          <div className="mt-3 space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={createCompany}
                                onChange={(e) =>
                                  setCreateCompany(e.target.checked)
                                }
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700">
                                Create New Company
                              </span>
                            </label>

                            {createCompany && (
                              <label className="flex items-center gap-2 ml-6">
                                <input
                                  type="checkbox"
                                  checked={alsoCreateEntityInNewCompany}
                                  onChange={(e) =>
                                    setAlsoCreateEntityInNewCompany(
                                      e.target.checked
                                    )
                                  }
                                  className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700">
                                  Also create Entity inside new company
                                </span>
                              </label>
                            )}
                          </div>
                        )}

                        {selectedScope?.type === "COMPANY" && (
                          <div className="mt-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={createEntity}
                                onChange={(e) =>
                                  setCreateEntity(e.target.checked)
                                }
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-700">
                                Create New Entity
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Your existing fields remain unchanged below */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Developer Entity
                        </label>
                        <input
                          type="text"
                          value={newProperty.developerEntity}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              developerEntity: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. ABC Developers"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SPV Name
                        </label>
                        <input
                          type="text"
                          value={newProperty.spvName}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              spvName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Ocean Ventures SPV"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST/PAN
                        </label>
                        <input
                          type="text"
                          value={newProperty.gstpan}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              gstpan: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 29ABCDE1234F1Z5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registered Documents
                      </label>
                      <div className="flex gap-2">
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          Property Deed(2)
                        </button>
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          Land Survey(3)
                        </button>
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          + Add Link
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Area & Ownership Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection("areaOwnership")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">
                    Area & Ownership
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.areaOwnership ? "−" : "+"}
                  </span>
                </button>
                {expandedSections.areaOwnership && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Built-up Area (sq.ft)
                        </label>
                        <input
                          type="text"
                          value={newProperty.totalBuiltUp}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              totalBuiltUp: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 100000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leasable Area (sq.ft)
                        </label>
                        <input
                          type="text"
                          value={newProperty.leasableArea}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              leasableArea: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 80000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Common Area %
                        </label>
                        <input
                          type="text"
                          value={newProperty.commonArea}
                          onChange={(e) =>
                            setNewProperty({
                              ...newProperty,
                              commonArea: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ownership Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="ownershipType"
                            value="Own"
                            checked={newProperty.ownershipType === "Own"}
                            onChange={(e) =>
                              setNewProperty({
                                ...newProperty,
                                ownershipType: e.target.value,
                              })
                            }
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Own</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="ownershipType"
                            value="Joint Venture"
                            checked={
                              newProperty.ownershipType === "Joint Venture"
                            }
                            onChange={(e) =>
                              setNewProperty({
                                ...newProperty,
                                ownershipType: e.target.value,
                              })
                            }
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            Joint Venture
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="ownershipType"
                            value="Leased-In"
                            checked={newProperty.ownershipType === "Leased-In"}
                            onChange={(e) =>
                              setNewProperty({
                                ...newProperty,
                                ownershipType: e.target.value,
                              })
                            }
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            Leased-In
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Building / Block Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection("buildingBlock")}
                  className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">
                    Building / Block
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.buildingBlock ? "−" : "+"}
                  </span>
                </button>
                {expandedSections.buildingBlock && (
                  <div className="p-4">
                    {newProperty.buildings.length > 0 && (
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Building
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Name
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Floor
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Building Type
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Total Area
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Leasable Area
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Completion Date
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Occupancy Date
                              </th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {newProperty.buildings.map((building) => (
                              <tr key={building.id}>
                                <td className="py-2 px-3">{building.id}</td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={building.name}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Bldg"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={building.floor}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "floor",
                                        e.target.value
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="10"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={building.buildingType}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "buildingType",
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="Office">Office</option>
                                    <option value="Retail">Retail</option>
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={building.totalArea}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "totalArea",
                                        e.target.value
                                      )
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="50"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={building.leasableArea}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "leasableArea",
                                        e.target.value
                                      )
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="40000"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="date"
                                    value={building.completionDate}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "completionDate",
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="date"
                                    value={building.occupancyDate}
                                    onChange={(e) =>
                                      updateBuilding(
                                        building.id,
                                        "occupancyDate",
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <button
                                    onClick={() => removeBuilding(building.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <button
                      onClick={addBuilding}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={16} />
                      Add Building
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="sticky bottom-0 bg-white flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleDeleteProperty}
                className="px-6 py-2 text-sm text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                disabled={createLoading}
              >
                Delete
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddProperty();
                }}
                disabled={createLoading}
                className="px-6 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyTypesPage;
