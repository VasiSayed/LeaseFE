import React, { useState, useEffect } from "react";
import {
  X,
  Type,
  Hash,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Calendar,
  DollarSign,
  AlignLeft,
  Minus,
  Paperclip,
  Search,
  Settings,
  Plus,
} from "lucide-react";
import apiRequest from "../services/api";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";

const CustomUnitFieldsPage = () => {
  // State management
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [fields, setFields] = useState([]);
  const [sites, setSites] = useState([]);

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedUnitType, setSelectedUnitType] = useState("COMMERCIAL");

  const [loading, setLoading] = useState(true);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mapping, setMapping] = useState(false);

  const [selectedField, setSelectedField] = useState(null);
  const [draggedField, setDraggedField] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  const fieldTypeIcons = {
    TEXT: Type,
    NUMBER: Hash,
    SELECT: ChevronDown,
    MULTISELECT: CheckSquare,
    DATE: Calendar,
    CURRENCY: DollarSign,
    BOOL: CheckSquare,
    ATTACHMENT: Paperclip,
  };

  // Updated categories to match backend TextChoices
  const categories = [
    { key: "IDENTITY", label: "Identity" },
    { key: "AREA_DETAILS", label: "Area Details" },
    { key: "STATUS_AVAILABILITY", label: "Status & Availability" },
    { key: "RENT_CHARGES", label: "Rent & Charges" },
    { key: "FINANCIALS", label: "Financials" },
    { key: "PHYSICAL", label: "Physical Attributes" },
    { key: "AMENITIES", label: "Amenities" },
    { key: "LOCATION", label: "Location" },
    { key: "NOTES_ATTACHMENTS", label: "Notes & Attachments" },
    { key: "BENCHMARK_ANALYTICS", label: "Benchmark & Analytics" },
  ];

  // 1) On mount: Fetch templates and sites
  useEffect(() => {
    fetchTemplates();
    fetchSitesByScope();
  }, []);

  // Fetch versions when template selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.id) {
      fetchVersions(selectedTemplate.id);
    } else {
      setVersions([]);
      setSelectedVersion(null);
    }
  }, [selectedTemplate]);

  // Fetch fields when version selected
  useEffect(() => {
    if (selectedVersion) {
      fetchFields(selectedVersion.id);
    } else {
      setFields([]);
    }
  }, [selectedVersion]);


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



  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/api/setup/form-templates/");
      const templatesData = Array.isArray(response)
        ? response
        : response.results || [];

      // Show all templates
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  // 3) Get sites by scope
  const fetchSitesByScope = async () => {
  try {
    const active = getActiveScope();
    if (!active?.scopeId) {
      toast.error("Active scope not found in localStorage.active");
      setSites([]);
      return;
    }

    const response = await apiRequest(
      `/api/setup/sites/by-scope/?scope_type=${active.scopeType}&scope_id=${active.scopeId}`
    );

    const sitesData = Array.isArray(response) ? response : response.results || [];
    setSites(sitesData);
  } catch (error) {
    console.error("Error fetching sites:", error);
    toast.error("Failed to load sites");
  }
};


  const fetchVersions = async (templateId) => {
    if (!templateId) {
      console.warn("Template ID is required to fetch versions");
      setVersions([]);
      return;
    }

    try {
      const response = await apiRequest(
        `/api/setup/form-versions/?template_id=${templateId}`
      );
      const versionsData = Array.isArray(response)
        ? response
        : response.results || [];
      setVersions(versionsData);
    } catch (error) {
      console.error("Error fetching versions:", error);
      // Only show error toast if it's not a validation error
      if (!error.message?.includes("required")) {
        toast.error("Failed to load versions");
      }
      setVersions([]);
    }
  };

  const fetchFields = async (versionId) => {
    try {
      const response = await apiRequest(
        `/api/setup/form-fields/?version_id=${versionId}`
      );
      const fieldsData = Array.isArray(response)
        ? response
        : response.results || [];

      // Map API response to component format
      const mappedFields = fieldsData.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        field_type: field.field_type,
        is_required: field.required,
        options: field.options || [],
        help_text: field.help_text || "",
        sort_order: field.sort_order,
        placeholder: "", // Not in API response, can be added later
        default_value: "", // Not in API response, can be added later
        category: field.category || getCategoryForField(field.key, field.label), // Use backend category or auto-assign
        isNew: false, // These are existing fields from backend
      }));

      setFields(mappedFields);
    } catch (error) {
      console.error("Error fetching fields:", error);
      // Don't show error toast - fields might not exist yet
    }
  };

  // Helper function to auto-assign category based on field key/label
  const getCategoryForField = (key, label) => {
    const keyLower = key.toLowerCase();
    const labelLower = label.toLowerCase();

    // Identity
    if (
      keyLower.includes("title") ||
      keyLower.includes("unit_no") ||
      keyLower.includes("name")
    ) {
      return "IDENTITY";
    }

    // Area Details
    if (
      keyLower.includes("area") ||
      keyLower.includes("sqft") ||
      keyLower.includes("floor")
    ) {
      return "AREA_DETAILS";
    }

    // Status & Availability
    if (
      keyLower.includes("status") ||
      keyLower.includes("available") ||
      keyLower.includes("handover")
    ) {
      return "STATUS_AVAILABILITY";
    }

    // Rent & Charges
    if (
      keyLower.includes("rent") ||
      keyLower.includes("charge") ||
      keyLower.includes("price")
    ) {
      return "RENT_CHARGES";
    }

    // Financials
    if (
      keyLower.includes("deposit") ||
      keyLower.includes("financial") ||
      keyLower.includes("payment")
    ) {
      return "FINANCIALS";
    }

    // Physical Attributes
    if (
      keyLower.includes("power") ||
      keyLower.includes("corner") ||
      keyLower.includes("parking") ||
      keyLower.includes("office") ||
      keyLower.includes("bedroom") ||
      keyLower.includes("bathroom")
    ) {
      return "PHYSICAL";
    }

    // Amenities
    if (
      keyLower.includes("amenity") ||
      keyLower.includes("amenities") ||
      keyLower.includes("facility")
    ) {
      return "AMENITIES";
    }

    // Location
    if (
      keyLower.includes("address") ||
      keyLower.includes("city") ||
      keyLower.includes("location") ||
      keyLower.includes("building") ||
      keyLower.includes("usage_category") ||
      keyLower.includes("category")
    ) {
      return "LOCATION";
    }

    // Notes & Attachments
    if (
      keyLower.includes("note") ||
      keyLower.includes("attachment") ||
      keyLower.includes("document")
    ) {
      return "NOTES_ATTACHMENTS";
    }

    // Default to Identity if no match
    return "IDENTITY";
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      const newTemplate = await apiRequest("/api/setup/form-templates/", {
        method: "POST",
        body: JSON.stringify(templateData),
      });

      setTemplates([...templates, newTemplate]);
      setSelectedTemplate(newTemplate);
      setShowTemplateModal(false);
      toast.success("Template created successfully");
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  const handleCreateVersion = async (versionData) => {
    try {
      const newVersion = await apiRequest("/api/setup/form-versions/", {
        method: "POST",
        body: JSON.stringify({
          ...versionData,
          template_id: selectedTemplate.id,
        }),
      });

      setVersions([...versions, newVersion]);
      setSelectedVersion(newVersion);
      setShowVersionModal(false);
      toast.success("Version created successfully");
    } catch (error) {
      console.error("Error creating version:", error);
      toast.error("Failed to create version");
    }
  };

  // 2) Create Form - Bulk create fields with category
  const handleCreateForm = async () => {
    if (!selectedVersion) {
      toast.error("Please select a version first");
      return;
    }

    // Filter only newly added fields (not existing ones from backend)
    const newFields = fields.filter((field) => field.isNew === true);

    if (newFields.length === 0) {
      toast.error("Please add at least one new field");
      return;
    }

    try {
      setCreatingForm(true);

      const fieldsPayload = newFields.map((field, index) => ({
        category: field.category || "IDENTITY", // Include category
        key: field.key || field.label?.toLowerCase().replace(/\s+/g, "_"),
        label: field.label,
        field_type: field.field_type || "TEXT",
        required: field.is_required || false,
        sort_order: field.sort_order || fields.length + index + 1,
        options:
          field.field_type === "SELECT" || field.field_type === "MULTISELECT"
            ? field.options
            : undefined,
        placeholder: field.placeholder || "",
        help_text: field.help_text || "",
        default_value: field.default_value || "",
      }));

      await apiRequest("/api/setup/form-fields/bulk/", {
        method: "POST",
        body: JSON.stringify({
          version_id: selectedVersion.id,
          fields: fieldsPayload,
        }),
      });

      toast.success(`${newFields.length} field(s) created successfully`);
      fetchFields(selectedVersion.id); // Refresh fields
    } catch (error) {
      console.error("Error creating form:", error);
      toast.error("Failed to create form");
    } finally {
      setCreatingForm(false);
    }
  };

  // 1) Publish version
  const handlePublishVersion = async () => {
    if (!selectedVersion) {
      toast.error("Please select a version first");
      return;
    }

    try {
      setPublishing(true);
      await apiRequest(
        `/api/setup/form-versions/${selectedVersion.id}/publish/`,
        {
          method: "POST",
        }
      );

      toast.success("Version published successfully");
      fetchVersions(selectedTemplate.id); // Refresh versions

      // Update local state
      setSelectedVersion({ ...selectedVersion, is_published: true });
    } catch (error) {
      console.error("Error publishing version:", error);
      toast.error("Failed to publish version");
    } finally {
      setPublishing(false);
    }
  };

  // 4) Map version to site
  const handleMapToSite = async () => {
    if (!selectedVersion) {
      toast.error("Please select a version first");
      return;
    }

    if (!selectedVersion.is_published) {
      toast.error("Please publish the version first");
      return;
    }

    if (!selectedSite) {
      toast.error("Please select a site");
      return;
    }

    try {
      setMapping(true);

      await apiRequest("/api/setup/site-unit-form-configs/bulk-assign/", {
        method: "POST",
        body: JSON.stringify({
          form_version_id: selectedVersion.id,
          items: [
            {
              site_id: parseInt(selectedSite),
              unit_type: selectedUnitType || null,
            },
          ],
        }),
      });

      toast.success("Mapped to site successfully");
    } catch (error) {
      console.error("Error mapping to site:", error);
      toast.error("Failed to map to site");
    } finally {
      setMapping(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFieldClick = (field) => {
    setSelectedField(field);
    setIsEditMode(true);
    setShowFieldSettings(true);
  };

  const handleAddNewField = (fieldType) => {
    const tempId = `temp_${Date.now()}`;

    setSelectedField({
      id: tempId,
      field_type: fieldType,
      label: "",
      category: "IDENTITY", // Default category
      is_required: false,
      placeholder: "",
      help_text: "",
      default_value: "",
      sort_order: fields.length + 1,
      isNew: true,
      options: [],
    });
    setIsEditMode(false);
    setShowFieldSettings(true);
  };

  const handleSaveField = (fieldData) => {
    if (isEditMode && !selectedField.isNew) {
      // Update existing field
      setFields(
        fields.map((f) =>
          f.id === selectedField.id ? { ...f, ...fieldData } : f
        )
      );
    } else {
      // Add new field
      const newField = {
        ...selectedField,
        ...fieldData,
        key:
          fieldData.key || fieldData.label?.toLowerCase().replace(/\s+/g, "_"), // Generate key from label
        id: selectedField.id || `temp_${Date.now()}`,
        isNew: true,
      };

      if (isEditMode) {
        setFields(fields.map((f) => (f.id === newField.id ? newField : f)));
      } else {
        setFields([...fields, newField]);
      }
    }

    setShowFieldSettings(false);
    setSelectedField(null);
  };

  const handleDeleteField = (fieldId) => {
    if (!window.confirm("Are you sure you want to delete this field?")) return;
    setFields(fields.filter((f) => f.id !== fieldId));
    toast.success("Field deleted");
  };

  const handleDragStart = (e, field) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetCategory) => {
    e.preventDefault();
    if (draggedField) {
      setFields(
        fields.map((f) =>
          f.id === draggedField.id ? { ...f, category: targetCategory } : f
        )
      );
      setDraggedField(null);
    }
  };

  const FieldTypeButton = ({ icon: Icon, label, fieldType }) => (
    <button
      onClick={() => handleAddNewField(fieldType)}
      className="flex flex-col items-center justify-center p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
    >
      <Icon className="w-6 h-6 text-gray-600 mb-2" />
      <span className="text-xs text-gray-700 text-center">{label}</span>
    </button>
  );

  const SectionHeader = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
    >
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-600" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );

  // Template Modal
  const TemplateModal = () => {
    const [formData, setFormData] = useState({
      name: "",
      code: "",
      description: "",
    });

    if (!showTemplateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Create Template
            </h3>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Commercial Unit Form"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="commercial-unit-form"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Unit builder fields for commercial units"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowTemplateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreateTemplate(formData)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Create Template
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Version Modal
  const VersionModal = () => {
    const [formData, setFormData] = useState({
      version: "",
      is_published: false,
    });

    if (!showVersionModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Create Version
            </h3>
            <button
              onClick={() => setShowVersionModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version Number
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowVersionModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreateVersion(formData)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Create Version
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FieldSettingsModal = () => {
    // Store options as string for input, convert to array when needed
    const getOptionsString = (options) => {
      if (Array.isArray(options)) {
        return options.join(", ");
      }
      return "";
    };

    const [formData, setFormData] = useState({
      key: selectedField?.key || "",
      label: selectedField?.label || "",
      field_type: selectedField?.field_type || "TEXT",
      placeholder: selectedField?.placeholder || "",
      is_required: selectedField?.is_required || false,
      default_value: selectedField?.default_value || "",
      help_text: selectedField?.help_text || "",
      category: selectedField?.category || "IDENTITY",
      options: selectedField?.options || [],
      optionsString: getOptionsString(selectedField?.options || []),
    });

    useEffect(() => {
      if (selectedField) {
        setFormData({
          key: selectedField.key || "",
          label: selectedField.label || "",
          field_type: selectedField.field_type || "TEXT",
          placeholder: selectedField.placeholder || "",
          is_required: selectedField.is_required || false,
          default_value: selectedField.default_value || "",
          help_text: selectedField.help_text || "",
          category: selectedField.category || "IDENTITY",
          options: selectedField.options || [],
          optionsString: getOptionsString(selectedField.options || []),
        });
      }
    }, [selectedField]);

    if (!showFieldSettings) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h3 className="text-lg font-semibold text-gray-800">
              {isEditMode ? "Edit Field" : "Add New Field"}
            </h3>
            <button
              onClick={() => setShowFieldSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Key
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) =>
                  setFormData({ ...formData, key: e.target.value })
                }
                placeholder="unit_title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier (use lowercase and underscores)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Label
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  setFormData({
                    ...formData,
                    label: newLabel,
                    // Auto-generate key from label if key is empty
                    key:
                      formData.key ||
                      newLabel.toLowerCase().replace(/\s+/g, "_"),
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <select
                value={formData.field_type}
                onChange={(e) =>
                  setFormData({ ...formData, field_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TEXT">Text Field</option>
                <option value="NUMBER">Number</option>
                <option value="SELECT">Dropdown</option>
                <option value="MULTISELECT">Multi-select</option>
                <option value="DATE">Date</option>
                <option value="CURRENCY">Currency</option>
                <option value="BOOL">Boolean</option>
                <option value="ATTACHMENT">Attachment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.field_type === "SELECT" ||
              formData.field_type === "MULTISELECT") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.optionsString || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      optionsString: e.target.value,
                    })
                  }
                  placeholder="Retail, Office, Warehouse"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={formData.placeholder}
                onChange={(e) =>
                  setFormData({ ...formData, placeholder: e.target.value })
                }
                placeholder="e.g., Suite 101, Bldg A"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Required
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_required}
                  onChange={(e) =>
                    setFormData({ ...formData, is_required: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Value
              </label>
              <input
                type="text"
                value={formData.default_value}
                onChange={(e) =>
                  setFormData({ ...formData, default_value: e.target.value })
                }
                placeholder="Optional default value"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Help Text
              </label>
              <textarea
                value={formData.help_text}
                onChange={(e) =>
                  setFormData({ ...formData, help_text: e.target.value })
                }
                placeholder="Enter the unique identifier for the commercial unit."
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <button
              onClick={() => setShowFieldSettings(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Convert optionsString to array before saving
                const dataToSave = {
                  ...formData,
                  options:
                    formData.field_type === "SELECT" ||
                    formData.field_type === "MULTISELECT"
                      ? formData.optionsString
                          ?.split(",")
                          .map((o) => o.trim())
                          .filter((o) => o) || []
                      : formData.options || [],
                };
                // Remove optionsString from the data to save
                delete dataToSave.optionsString;
                handleSaveField(dataToSave);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {isEditMode ? "Update Field" : "Add Field"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Template & Version Selection */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Templates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Templates</h3>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {templates.map((template) => (
                <button
                
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "bg-blue-50 border-blue-300 text-blue-700 border"
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {template.name}
                </button>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No templates yet
                </p>
              )}
            </div>
          </div>

          {/* Middle: Versions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Versions</h3>
              <button
                onClick={() => setShowVersionModal(true)}
                disabled={!selectedTemplate}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setSelectedVersion(version)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedVersion?.id === version.id
                      ? "bg-blue-50 border-blue-300 text-blue-700 border"
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>v{version.version}</span>
                    {version.is_published && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Published
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {!selectedTemplate && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Select template
                </p>
              )}
              {selectedTemplate && versions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No versions
                </p>
              )}
            </div>
          </div>

          {/* Right: Site Mapping */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Map to Site
            </h3>

            {selectedVersion && !selectedVersion.is_published && (
              <div className="mb-4">
                <button
                  onClick={handlePublishVersion}
                  disabled={publishing}
                  className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {publishing ? "Publishing..." : "Publish Version First"}
                </button>
              </div>
            )}

            {selectedVersion?.is_published && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Site
                    </label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit Type
                    </label>
                    <select
                      value={selectedUnitType}
                      onChange={(e) => setSelectedUnitType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Default (All)</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="RESIDENTIAL">Residential</option>
                      <option value="WAREHOUSE">Warehouse</option>
                    </select>
                  </div>

                  <button
                    onClick={handleMapToSite}
                    disabled={mapping || !selectedSite}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mapping ? "Mapping..." : "Map to Site"}
                  </button>
                </div>
              </>
            )}

            {!selectedVersion && (
              <p className="text-sm text-gray-500 text-center py-4">
                Select version
              </p>
            )}
          </div>
        </div>

        {selectedVersion ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Field Types */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                  Field Types
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldTypeButton
                      icon={Type}
                      label="Text"
                      fieldType="TEXT"
                    />
                    <FieldTypeButton
                      icon={Hash}
                      label="Number"
                      fieldType="NUMBER"
                    />
                    <FieldTypeButton
                      icon={ChevronDown}
                      label="Dropdown"
                      fieldType="SELECT"
                    />
                    <FieldTypeButton
                      icon={CheckSquare}
                      label="Multi"
                      fieldType="MULTISELECT"
                    />
                    <FieldTypeButton
                      icon={Calendar}
                      label="Date"
                      fieldType="DATE"
                    />
                    <FieldTypeButton
                      icon={DollarSign}
                      label="Currency"
                      fieldType="CURRENCY"
                    />
                    <FieldTypeButton
                      icon={CheckSquare}
                      label="Boolean"
                      fieldType="BOOL"
                    />
                    <FieldTypeButton
                      icon={Paperclip}
                      label="File"
                      fieldType="ATTACHMENT"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area - Form Builder */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Form Fields
                    </h3>
                    <span className="text-sm text-gray-600">
                      {fields.length} field{fields.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.key}
                      className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
                    >
                      <SectionHeader
                        title={category.label}
                        section={category.key}
                      />

                      {expandedSections[category.key] && (
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, category.key)}
                          className="p-4"
                        >
                          <div className="space-y-2">
                            {fields
                              .filter(
                                (field) => field.category === category.key
                              )
                              .map((field) => {
                                const Icon =
                                  fieldTypeIcons[field.field_type] || Type;
                                return (
                                  <div
                                    key={field.id}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragStart(e, field)
                                    }
                                    onClick={() => handleFieldClick(field)}
                                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md hover:border-gray-300 hover:shadow-sm cursor-move transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Icon className="w-4 h-4 text-gray-500" />
                                      <div>
                                        <span className="text-sm font-medium text-gray-800">
                                          {field.label}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-gray-500">
                                            {field.field_type}
                                          </span>
                                          {field.is_required && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                              Required
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleFieldClick(field);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Settings"
                                      >
                                        <Settings className="w-4 h-4 text-gray-400" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteField(field.id);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Delete"
                                      >
                                        <X className="w-4 h-4 text-gray-400" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {fields.filter(
                            (field) => field.category === category.key
                          ).length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
                              <p className="text-sm text-gray-500">
                                Drop fields here
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-end gap-3">
                  <span className="text-sm text-gray-600">
                    {fields.filter((f) => f.isNew === true).length > 0 &&
                      `${fields.filter((f) => f.isNew === true).length} new field${fields.filter((f) => f.isNew === true).length !== 1 ? "s" : ""} to create`}
                  </span>
                  <button
                    onClick={handleCreateForm}
                    disabled={
                      creatingForm ||
                      fields.filter((f) => f.isNew === true).length === 0
                    }
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingForm ? "Creating..." : "Create Form"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Select a Version
            </h2>
            <p className="text-gray-600">
              Choose a template and version to start building your form
            </p>
          </div>
        )}
      </div>

      <TemplateModal />
      <VersionModal />
      <FieldSettingsModal />
    </div>
  );
};

export default CustomUnitFieldsPage;