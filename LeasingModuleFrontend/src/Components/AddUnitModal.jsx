import { useState, useEffect } from "react";
import {
  MapPin,
  FileText,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  Home,
  Activity,
  Clock,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import apiRequest from "../services/api";
import toast from "react-hot-toast";
import UnitFormFields from "./UnitFormFields";

export default function CommercialUnitDetailPage({ onClose, unitId }) {
  const [formData, setFormData] = useState({
    // System fields - at root level, NOT in custom_data
    unit_no: "",
    unit_type: "COMMERCIAL",
    floor: "",
    status: "AVAILABLE",

    // Optional model fields
    leasable_area_sqft: "",
    builtup_area_sqft: "",

    // Dynamic custom fields
    custom_data: {},
  });

  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteTree, setSiteTree] = useState([]); // Towers with floors
  const [systemFields, setSystemFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [formVersion, setFormVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingSiteTree, setLoadingSiteTree] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    IDENTITY: true,
    AREA_DETAILS: true,
    STATUS_AVAILABILITY: false,
    RENT_CHARGES: false,
    FINANCIALS: false,
    PHYSICAL: false,
    AMENITIES: false,
    LOCATION: false,
    NOTES_ATTACHMENTS: false,
    BENCHMARK_ANALYTICS: false,
  });

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  // Fixed category order
  const categoryOrder = [
    { key: "IDENTITY", label: "Identity", icon: Home },
    { key: "AREA_DETAILS", label: "Area Details", icon: null },
    {
      key: "STATUS_AVAILABILITY",
      label: "Status & Availability",
      icon: Calendar,
    },
    { key: "RENT_CHARGES", label: "Rent & Charges", icon: DollarSign },
    { key: "FINANCIALS", label: "Financials", icon: DollarSign },
    { key: "PHYSICAL", label: "Physical Attributes", icon: null },
    { key: "AMENITIES", label: "Amenities", icon: null },
    { key: "LOCATION", label: "Location", icon: MapPin },
    { key: "NOTES_ATTACHMENTS", label: "Notes & Attachments", icon: FileText },
    {
      key: "BENCHMARK_ANALYTICS",
      label: "Benchmark & Analytics",
      icon: Activity,
    },
  ];





  const getActiveScope = () => {
  try {
    const raw = localStorage.getItem("active");
    if (!raw) return null;

    const a = JSON.parse(raw);

    const scopeType = a.scope_type || a.scopeType || a.type || "ORG";
    const scopeId = a.scope_id || a.scopeId || a.id || a.pk || null;

    return scopeId ? { scopeType, scopeId } : null;
  } catch {
    return null;
  }
};

  // Close site dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest("[data-dropdown-container]")) {
        setSiteDropdownOpen(false);
      }
    };

    if (siteDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [siteDropdownOpen]);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, []);

  // Fetch site tree and form config when site is selected
  useEffect(() => {
    if (selectedSite) {
      fetchSiteTree(selectedSite);
      fetchFormConfig(selectedSite);
    }
  }, [selectedSite]);

  // Fetch unit data if editing
  useEffect(() => {
    if (unitId) {
      fetchUnitData(unitId);
    }
  }, [unitId]);

  const fetchSites = async () => {
  try {
    setLoading(true);

    const active = getActiveScope();
    if (!active?.scopeId) {
      toast.error("Active scope not found in localStorage.active");
      setSites([]);
      return;
    }

    const response = await apiRequest(
      `/api/setup/sites/by-scope/?scope_type=${active.scopeType}&scope_id=${active.scopeId}`
    );

    const sitesData = response.results || [];
    setSites(sitesData);
  } catch (error) {
    console.error("Error fetching sites:", error);
    toast.error("Failed to load sites");
  } finally {
    setLoading(false);
  }
};


  const fetchSiteTree = async (siteId) => {
  try {
    setLoadingSiteTree(true);

    const active = getActiveScope();
    if (!active?.scopeId) {
      toast.error("Active scope not found in localStorage.active");
      setSiteTree([]);
      return;
    }

    const response = await apiRequest(
      `/api/setup/sites/by-scope/?scope_type=${active.scopeType}&scope_id=${active.scopeId}&include_units=false`
    );

    const selectedSiteData = response.results?.find((site) => site.id === siteId);

    if (selectedSiteData) {
      setSiteTree(selectedSiteData.towers || []);
    } else {
      setSiteTree([]);
    }
  } catch (error) {
    console.error("Error fetching site tree:", error);
    toast.error("Failed to load towers and floors");
  } finally {
    setLoadingSiteTree(false);
  }
};


  const fetchFormConfig = async (siteId) => {
    try {
      setLoadingFields(true);
      const response = await apiRequest(
        `/api/setup/site-unit-form-configs/resolved/?site_id=${siteId}&unit_type=COMMERCIAL`
      );

      if (response) {
        // Separate system fields and custom fields
        setSystemFields(response.system_fields || []);
        setCustomFields(response.custom_fields || []);
        setFormVersion(response.form_version_id);

        // Initialize ONLY custom_data with default values (NOT system fields)
        if (!unitId) {
          // Only set defaults for new units
          const initialCustomData = {};
          (response.custom_fields || []).forEach((field) => {
            initialCustomData[field.key] = field.default_value || "";
          });

          setFormData((prev) => ({
            ...prev,
            custom_data: initialCustomData,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching form config:", error);
      toast.error("Failed to load form configuration");
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchUnitData = async (id) => {
    try {
      const response = await apiRequest(`/api/units/${id}/`);
      if (response) {
        setFormData({
          unit_no: response.unit_no || "",
          unit_type: response.unit_type || "COMMERCIAL",
          floor_id: response.floor?.id || "", // Store as floor_id internally
          status: response.status || "AVAILABLE",
          leasable_area_sqft: response.leasable_area_sqft || "",
          builtup_area_sqft: response.builtup_area_sqft || "",
          custom_data: response.custom_data || {},
        });

        // Set selected site based on floor
        if (response.floor?.site?.id) {
          setSelectedSite(response.floor.site.id);
        }
      }
    } catch (error) {
      console.error("Error fetching unit data:", error);
      toast.error("Failed to load unit data");
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSystemFieldChange = (fieldKey, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    setFormData((prev) => ({
      ...prev,
      custom_data: {
        ...prev.custom_data,
        [fieldKey]: value,
      },
    }));
  };

  const toggleSiteDropdown = () => {
    setSiteDropdownOpen((prev) => !prev);
  };

  const handleSiteChange = (siteId) => {
    setSelectedSite(siteId);
    // Reset floor when site changes
    setFormData((prev) => ({
      ...prev,
      floor: "",
    }));
    setSiteDropdownOpen(false);
  };

  // Get selected floor details for display
  const getSelectedFloorDisplay = () => {
    if (!formData.floor_id) return "Select tower and floor...";

    for (const tower of siteTree) {
      const floor = tower.floors?.find(
        (f) => f.id === parseInt(formData.floor_id)
      );
      if (floor) {
        return `${tower.name} → Floor ${floor.number}${
          floor.label ? ` (${floor.label})` : ""
        }`;
      }
    }
    return "Select tower and floor...";
  };

  // Activity data
  const activities = [
    {
      icon: Clock,
      text: "Unit status changed to Available by John Doe",
      date: "2024-06-10",
    },
    {
      icon: Activity,
      text: "Maintenance inspection completed by Jane Smith",
      date: "2024-05-20",
    },
    {
      icon: DollarSign,
      text: "Market valuation updated by Property Analytics",
      date: "2024-04-15",
    },
    {
      icon: Home,
      text: "Rentable area adjusted by Admin User",
      date: "2024-03-01",
    },
    {
      icon: Clock,
      text: "Unit status changed to Under Offer by Alex Chen",
      date: "2024-02-20",
    },
  ];

  // Related leases
  const relatedLeases = [
    {
      tenant: "Retail Brands Inc.",
      leaseId: "DLF-L-001",
      term: "2023-01-01 to 2028-12-31",
    },
    {
      tenant: "Tech Solutions LLC",
      leaseId: "DLF-L-002",
      term: "2024-03-01 to 2027-06-31",
    },
    {
      tenant: "Cafe Delight Co.",
      leaseId: "DLF-L-003",
      term: "2024-03-01 to 2029-02-28",
    },
  ];

  // Documents
  const documents = [
    { name: "Floor Plan - Unit G-001.pdf", icon: FileText },
    { name: "Unit_G001_Photos_Exterior.zip", icon: ImageIcon },
    { name: "Unit_G001_InspectionReport_2023.pdf", icon: FileText },
  ];

  const handleSubmit = async () => {
    try {
      // Validate required system fields
      if (
        !formData.unit_no ||
        !formData.unit_type ||
        !formData.floor_id ||
        !formData.status
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const payload = {
        // System fields at root level
        unit_no: formData.unit_no,
        unit_type: formData.unit_type,
        floor: formData.floor_id, // API expects 'floor' not 'floor_id'
        status: formData.status,

        // Optional model fields
        leasable_area_sqft: formData.leasable_area_sqft || null,
        builtup_area_sqft: formData.builtup_area_sqft || null,

        // Form version and custom data
        form_version: formVersion,
        custom_data: formData.custom_data,
      };

      const method = unitId ? "PATCH" : "POST";
      const url = unitId ? `/api/setup/units/${unitId}/` : "/api/setup/units/";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      toast.success(
        unitId ? "Unit updated successfully" : "Unit created successfully"
      );
      if (onClose) onClose();
    } catch (error) {
      console.error("Error saving unit:", error);
      toast.error(error.message || "Failed to save unit");
    }
  };

  if (loading && sites.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Units List"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {unitId
                ? `Commercial Unit - ${formData.unit_no || unitId}`
                : "Add New Commercial Unit"}
            </h1>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedSite || !formData.floor_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Publish / Save
            </button>
            {unitId && (
              <>
                <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Duplicate Unit
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                  Delete Unit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Site Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Select Site
                  </h3>
                  <p className="text-sm text-gray-500">
                    Choose the property location for this unit
                  </p>
                </div>
              </div>

              <div className="relative" data-dropdown-container>
                <button
                  type="button"
                  onClick={toggleSiteDropdown}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span
                      className={
                        selectedSite
                          ? "text-gray-900 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {selectedSite
                        ? sites.find((s) => s.id === selectedSite)?.name
                        : "Select a site..."}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      siteDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {siteDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {sites.map((site) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => handleSiteChange(site.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                          selectedSite === site.id
                            ? "bg-blue-50 border-l-4 border-blue-600"
                            : ""
                        }`}
                      >
                        <Building2
                          className={`w-4 h-4 ${
                            selectedSite === site.id
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${
                              selectedSite === site.id
                                ? "text-blue-900"
                                : "text-gray-900"
                            }`}
                          >
                            {site.name}
                          </div>
                          {site.address && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {site.address}
                            </div>
                          )}
                        </div>
                        {selectedSite === site.id && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                    ))}
                    {sites.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">No sites available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Loading State for Site Tree */}
            {loadingSiteTree && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading towers and floors...</p>
              </div>
            )}

            {/* Loading State for Fields */}
            {loadingFields && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading form fields...</p>
              </div>
            )}

            {/* Form Fields Header with Count */}
            {!loadingFields &&
              selectedSite &&
              (systemFields.length > 0 || customFields.length > 0) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Form Fields
                    </h2>
                    <span className="text-sm text-gray-600">
                      {systemFields.length + customFields.length} field
                      {systemFields.length + customFields.length !== 1
                        ? "s"
                        : ""}{" "}
                      ({systemFields.length} system, {customFields.length}{" "}
                      custom)
                    </span>
                  </div>
                </div>
              )}

            {/* Dynamic Sections based on selected site */}
            {!loadingFields &&
            !loadingSiteTree &&
            selectedSite &&
            (systemFields.length > 0 || customFields.length > 0) ? (
              <UnitFormFields
                systemFields={systemFields}
                customFields={customFields}
                formData={formData}
                siteTree={siteTree}
                onSystemFieldChange={handleSystemFieldChange}
                onCustomFieldChange={handleCustomFieldChange}
                categoryOrder={categoryOrder}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
              />
            ) : !loadingFields && !loadingSiteTree && selectedSite ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Form Fields Configured
                </h3>
                <p className="text-gray-600 mb-4">
                  This site doesn't have any form fields configured yet.
                </p>
                <p className="text-sm text-gray-500">
                  Configure form fields in: Master Data → Custom Unit Fields
                </p>
              </div>
            ) : (
              !loadingFields &&
              !loadingSiteTree &&
              !selectedSite && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Site to Continue
                  </h3>
                  <p className="text-gray-600">
                    Please select a site from the dropdown above to load the
                    form fields.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Right Column - Activity & Related Info */}
          <div className="space-y-4">
            {/* Activity & History */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-800">
                  Activity & History
                </h3>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {activities.map((activity, index) => (
                  <div key={index} className="flex gap-3">
                    <activity.icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm text-gray-800">{activity.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Leases */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-800">
                  Related Leases
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {relatedLeases.map((lease, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-800">
                      {lease.tenant}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Lease {lease.leaseId}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Term: {lease.term}
                    </p>
                    <button className="mt-2 text-xs text-blue-600 hover:text-blue-700">
                      View Lease Details
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents & Versions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-800">
                  Documents & Versions
                </h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <doc.icon className="w-4 h-4" />
                      {doc.name}
                    </div>
                  ))}
                </div>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                  View All Documents
                </button>
              </div>
            </div>

            {/* Audit Info */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-800">
                  Audit Info
                </h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Created By:</span>
                  <span className="ml-2 text-gray-800">Jane Doe</span>
                </div>
                <div>
                  <span className="text-gray-600">Created At:</span>
                  <span className="ml-2 text-gray-800">
                    2023-10-20 10:30 AM
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Modified By:</span>
                  <span className="ml-2 text-gray-800">John Smith</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Modified At:</span>
                  <span className="ml-2 text-gray-800">
                    2024-06-12 03:45 PM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
