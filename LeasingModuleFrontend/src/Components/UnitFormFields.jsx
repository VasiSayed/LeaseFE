import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Upload,
  Lock,
  File,
  X,
  ChevronRight,
} from "lucide-react";

export default function UnitFormFields({
  systemFields,
  customFields,
  formData,
  siteTree, // Array of towers with floors
  onSystemFieldChange,
  onCustomFieldChange,
  categoryOrder,
  expandedSections,
  onToggleSection,
}) {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [expandedTowers, setExpandedTowers] = useState({});
  const dropdownRefs = useRef({});
  const [selectedTowerByField, setSelectedTowerByField] = useState({});


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const openKeys = Object.keys(openDropdowns).filter(
        (key) => openDropdowns[key]
      );
      if (openKeys.length === 0) return;

      const clickedElement = event.target;
      let shouldClose = true;

      openKeys.forEach((key) => {
        const dropdownRef = dropdownRefs.current[key];
        if (
          dropdownRef &&
          (dropdownRef.contains(clickedElement) ||
            clickedElement.closest(`[data-dropdown="${key}"]`))
        ) {
          shouldClose = false;
        }
      });

      if (shouldClose) {
        setOpenDropdowns({});
      }
    };

    if (Object.values(openDropdowns).some((isOpen) => isOpen)) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openDropdowns]);

  const toggleDropdown = (fieldKey) => {
    setOpenDropdowns((prev) => {
      const newState = {};
      if (!prev[fieldKey]) {
        newState[fieldKey] = true;
      }
      return newState;
    });
  };

  const toggleTower = (towerId) => {
    setExpandedTowers((prev) => ({
      ...prev,
      [towerId]: !prev[towerId],
    }));
  };

  const handleFileUpload = (fieldKey, event, isSystem) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };

      if (isSystem) {
        onSystemFieldChange(fieldKey, fileData);
      } else {
        onCustomFieldChange(fieldKey, fileData);
      }
    }
  };

  const handleRemoveFile = (fieldKey, isSystem) => {
    if (isSystem) {
      onSystemFieldChange(fieldKey, "");
    } else {
      onCustomFieldChange(fieldKey, "");
    }
  };

  const SectionHeader = ({ title, section, icon: Icon }) => (
    <button
      type="button"
      onClick={() => onToggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-600" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );

  // Get selected floor display with tower name
  const getSelectedFloorDisplay = (floorId, options = []) => {
  if (!floorId) return "Select tower and floor...";

  // 1) try siteTree
  for (const tower of siteTree) {
    const floor = tower.floors?.find((f) => f.id === parseInt(floorId));
    if (floor) {
      return `${tower.name} → Floor ${floor.number}${floor.label ? ` (${floor.label})` : ""}`;
    }
  }

  // 2) fallback to resolved config options [{value,label}]
  const opt = (options || []).find(
    (o) => o?.value?.toString() === floorId?.toString()
  );
  if (opt) return opt.label || String(opt.value);

  return "Select tower and floor...";
};

const getTowerGroupsForFloorField = (field) => {
  // If backend gives grouped towers (your current API)
  if (
    Array.isArray(field?.options) &&
    field.options.length > 0 &&
    typeof field.options[0] === "object" &&
    "tower_id" in field.options[0] &&
    Array.isArray(field.options[0].options)
  ) {
    return field.options;
  }

  // Fallback: build from siteTree if needed
  if (Array.isArray(siteTree) && siteTree.length > 0) {
    return siteTree.map((t) => ({
      tower_id: t.id,
      tower_name: t.name,
      options: (t.floors || []).map((f) => ({
        value: f.id,
        label: `Floor ${f.number}${f.label ? ` (${f.label})` : ""}`,
        floor_number: f.number,
        floor_label: f.label || "",
      })),
    }));
  }

  return [];
};

// Auto-set tower when editing (floor_id already selected)
useEffect(() => {
  const floorField = (systemFields || []).find((f) => f.key === "floor");
  if (!floorField) return;

  const groups = getTowerGroupsForFloorField(floorField);
  const selectedFloorId = formData?.floor_id;
  if (!selectedFloorId) return;

  const foundTower = groups.find((g) =>
    (g.options || []).some(
      (opt) => opt?.value?.toString() === selectedFloorId?.toString()
    )
  );

  if (foundTower) {
    setSelectedTowerByField((prev) => ({
      ...prev,
      floor: foundTower.tower_id,
    }));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [systemFields, formData?.floor_id, siteTree]);


  const renderField = (field) => {
    const isSystemField = field.is_system_field;
    // const value = isSystemField
    //   ? formData[field.key] || ""
    //   : formData.custom_data?.[field.key] || "";
    const value = isSystemField
  ? (field.key === "floor" ? (formData.floor_id ?? "") : (formData[field.key] ?? ""))
  : (formData.custom_data?.[field.key] ?? "");


    const onChange = isSystemField ? onSystemFieldChange : onCustomFieldChange;
    const floorOptions = Array.isArray(field.options)
  ? field.options.filter((o) => o && typeof o === "object" && "value" in o)
  : [];

const hasTreeFloors =
  Array.isArray(siteTree) &&
  siteTree.some((t) => Array.isArray(t.floors) && t.floors.length > 0);

// Group options by tower name from label like: "Tower 1 - Floor 1"
const groupedByTower = floorOptions.reduce((acc, opt) => {
  const label = String(opt.label || "");
  const towerName = label.includes(" - ")
    ? label.split(" - ")[0].trim()
    : "Floors"; // fallback group

  if (!acc[towerName]) acc[towerName] = [];
  acc[towerName].push(opt);
  return acc;
}, {});

if ((field.key === "floor_id" || field.key === "floor") && isSystemField) {
  const dropdownKeyTower = `${field.key}__tower`;
  const dropdownKeyFloor = `${field.key}__floor`;

  const towerGroups = getTowerGroupsForFloorField(field);
  const selectedTowerId = selectedTowerByField[field.key] || ""; // store tower selection by field.key

  const selectedTowerObj = towerGroups.find(
    (g) => g.tower_id?.toString() === selectedTowerId?.toString()
  );

  const floorList = selectedTowerObj?.options || [];

  const selectedFloorObj = floorList.find(
    (opt) => opt?.value?.toString() === value?.toString()
  );

  return (
    <div className="mb-4" key={field.id}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-blue-600" />
          <span>{field.label}</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
            System Field
          </span>
          <span className="text-red-500">*</span>
        </div>
      </label>

      {/* ✅ Tower + Floor grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* ===== Tower Dropdown ===== */}
        <div className="relative" ref={(el) => (dropdownRefs.current[dropdownKeyTower] = el)}>
          <button
            type="button"
            data-dropdown={dropdownKeyTower}
            onClick={() => toggleDropdown(dropdownKeyTower)}
            className="w-full px-3 py-2 border-2 border-blue-200 bg-blue-50 rounded-md text-sm text-left flex items-center justify-between hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-gray-800">
              {selectedTowerObj ? selectedTowerObj.tower_name : "Select tower..."}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                openDropdowns[dropdownKeyTower] ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdowns[dropdownKeyTower] && (
            <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto">
              {towerGroups.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  No towers available
                </div>
              ) : (
                towerGroups.map((tg) => (
                  <button
                    key={tg.tower_id}
                    type="button"
                    onClick={() => {
                      // set tower
                      setSelectedTowerByField((prev) => ({
                        ...prev,
                        [field.key]: tg.tower_id,
                      }));

                      // reset floor when tower changes
                      onChange(field.key, ""); // field.key = "floor" -> will clear floor_id via parent mapping
                      setOpenDropdowns({});
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-800 ${
                      selectedTowerId?.toString() === tg.tower_id?.toString()
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : ""
                    }`}
                  >
                    {tg.tower_name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ===== Floor Dropdown ===== */}
        <div className="relative" ref={(el) => (dropdownRefs.current[dropdownKeyFloor] = el)}>
          <button
            type="button"
            data-dropdown={dropdownKeyFloor}
            onClick={() => {
              if (!selectedTowerId) return; // must select tower first
              toggleDropdown(dropdownKeyFloor);
            }}
            disabled={!selectedTowerId}
            className={`w-full px-3 py-2 border rounded-md text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !selectedTowerId
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-blue-200 bg-blue-50 hover:border-blue-300"
            }`}
          >
            <span className="text-gray-800">
              {!selectedTowerId
                ? "Select tower first..."
                : selectedFloorObj
                ? selectedFloorObj.label
                : "Select floor..."}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                openDropdowns[dropdownKeyFloor] ? "rotate-180" : ""
              }`}
            />
          </button>

          {openDropdowns[dropdownKeyFloor] && (
            <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto">
              {floorList.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  No floors in this tower
                </div>
              ) : (
                floorList.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(field.key, opt.value); // field.key="floor"
                      setOpenDropdowns({});
                    }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 text-gray-800 ${
                      value?.toString() === opt.value?.toString()
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : ""
                    }`}
                  >
                    Floor {opt.floor_number}
                    
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {field.help_text && (
        <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
      )}
    </div>
  );
}

    // Rest of the field rendering logic (TEXT, NUMBER, DATE, SELECT, etc.)
    // ... (keep all the other field type renderers from the previous version)

    switch (field.field_type) {
      case "TEXT":
        return (
          <div className="mb-4" key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                <span>{field.label}</span>
                {isSystemField && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    System Field
                  </span>
                )}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isSystemField ? "border-blue-200 bg-blue-50" : "border-gray-300"
              }`}
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );

      case "NUMBER":
        return (
          <div className="mb-4" key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                <span>{field.label}</span>
                {isSystemField && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    System Field
                  </span>
                )}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isSystemField ? "border-blue-200 bg-blue-50" : "border-gray-300"
              }`}
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );

      case "DATE":
        return (
          <div className="mb-4" key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                <span>{field.label}</span>
                {isSystemField && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    System Field
                  </span>
                )}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isSystemField ? "border-blue-200 bg-blue-50" : "border-gray-300"
              }`}
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );

      case "SELECT":
        // Helper to get display value - handles both string and object options
        const getDisplayValue = () => {
          if (!value) return "Select...";
          // If options are objects, find matching option and return label
          if (field.options && field.options.length > 0 && typeof field.options[0] === 'object') {
            const selectedOption = field.options.find(
              opt => opt.value === value || opt.value?.toString() === value?.toString()
            );
            return selectedOption ? selectedOption.label : value;
          }
          return value;
        };

        return (
          <div className="mb-4" key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                <span>{field.label}</span>
                {isSystemField && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    System Field
                  </span>
                )}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
            </label>
            <div className="relative" ref={(el) => (dropdownRefs.current[field.key] = el)}>
              <button
                type="button"
                data-dropdown={field.key}
                onClick={() => toggleDropdown(field.key)}
                className={`w-full px-3 py-2 border rounded-md text-sm text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSystemField
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-300 bg-white"
                }`}
              >
                <span className="text-gray-800">{getDisplayValue()}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    openDropdowns[field.key] ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openDropdowns[field.key] && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto">
                  {field.options?.map((option, index) => {
                    // Handle both string and object options
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const optionKey = typeof option === 'object' 
                      ? (option.value ?? option.id ?? `option-${index}`)
                      : option;

                    return (
                      <button
                        key={optionKey}
                        type="button"
                        onClick={() => {
                          onChange(field.key, optionValue);
                          setOpenDropdowns({});
                        }}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-800 ${
                          value === optionValue || value?.toString() === optionValue?.toString()
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : ""
                        }`}
                      >
                        {optionLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );

      case "BOOL":
        return (
          <div className="mb-4" key={field.id}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value === true || value === "true"}
                onChange={(e) => onChange(field.key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                <div className="flex items-center gap-2">
                  {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                  <span>{field.label}</span>
                  {isSystemField && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      System Field
                    </span>
                  )}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </div>
              </span>
            </label>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );

      // Add other field types (ATTACHMENT, MULTISELECT, etc.) from the previous version

      default:
        return (
          <div className="mb-4" key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                {isSystemField && <Lock className="w-3 h-3 text-blue-600" />}
                <span>{field.label}</span>
                {isSystemField && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    System Field
                  </span>
                )}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isSystemField ? "border-blue-200 bg-blue-50" : "border-gray-300"
              }`}
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        );
    }
  };

  // Combine system and custom fields
  const allFields = [...systemFields, ...customFields];

  // Group fields by category
  const fieldsByCategory = allFields.reduce((acc, field) => {
    const category = field.category || "IDENTITY";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {});

  // Get categories with fields in the correct order
  const orderedCategoriesWithFields = categoryOrder.filter(
    (cat) => fieldsByCategory[cat.key]?.length > 0
  );

  if (allFields.length === 0) {
    return null;
  }

  return (
    <>
      {orderedCategoriesWithFields.map((category) => (
        <div
          key={category.key}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="overflow-hidden rounded-t-lg">
            <SectionHeader
              title={category.label}
              section={category.key}
              icon={category.icon}
            />
          </div>
          {expandedSections[category.key] && (
            <div className="p-6" style={{ overflow: 'visible' }}>
              <div className="grid grid-cols-2 gap-4" style={{ overflow: 'visible' }}>
                {fieldsByCategory[category.key].map((field) =>
                  renderField(field)
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
