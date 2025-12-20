// import React, { useState } from 'react';
// import { ArrowLeft, Save } from 'lucide-react';
// import RenewalOptionsSection from './components/RenewalOptionsSection';
// import TerminationSection from './components/TerminationSection';
// import SubLettingSection from './components/SubLettingSection';
// import ExclusivitySection from './components/ExclusivitySection';
// import ReinstatementSection from './components/ReinstatementSection';
// import DisputeResolutionSection from './components/DisputeResolutionSection';

// const LegalOperationalClausesPage = ({ onClose, clauseId }) => {
//   const [formData, setFormData] = useState({
//     // Renewal Options
//     preRenewalWindow: '90',
//     renewalCycles: [
//       { cycle: 1, term: '5 years', rentFormula: 'Market rate + 5% of current rent', comments: 'Standard increase, market adjustment.' },
//       { cycle: 2, term: '3 years', rentFormula: 'Fixed increase of 10% over current rent', comments: 'Slightly higher fixed rate.' }
//     ],

//     // Termination
//     terminationByTenant: false,
//     terminationByLandlord: false,

//     // Sub-letting & Signage
//     subLettingPermitted: false,
//     tenantSignage: true,
//     landlordApproval: true,
//     maxSignageArea: '5',
//     signageUnit: 'sqm',
//     signageNotes: 'Main entrance facade, maximum two signs.',

//     // Exclusivity & Non-Compete
//     exclusiveUse: true,
//     exclusiveCategory: 'Cafe and light food preparation.',
//     excludedCategories: ['Bar', 'Restaurant', 'Retail'],
//     nonCompeteDuration: '6',
//     nonCompeteNotes: 'Within a 1-mile radius of the property.',

//     // Reinstatement & Insurance
//     tenantRestore: true,
//     reinstatementDetails: 'Return to original white box condition, patching all holes.',
//     tenantInsurance: true,
//     coverageAmount: '5000000',
//     additionalInsurance: false,
//     indemnityNotes: 'Tenant indemnifies landlord against all claims arising from tenant\'s use.',

//     // Dispute Resolution
//     disputeMechanism: 'Arbitration',
//     governingLaw: 'State of New York',
//     disputeSummary: 'Disputes to be resolved via binding arbitration in New York, NY, with a single arbitrator.'
//   });

//   const [showSaveModal, setShowSaveModal] = useState(false);

//   const handleChange = (field, value) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   const handleSave = () => {
//     console.log('Saving clauses:', formData);
//     setShowSaveModal(true);
//     setTimeout(() => {
//       setShowSaveModal(false);
//       if (onClose) onClose();
//     }, 2000);
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto p-6">
//         {/* Header */}
//         <div className="mb-6 flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             {onClose && (
//               <button
//                 onClick={onClose}
//                 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//               >
//                 <ArrowLeft className="w-5 h-5 text-gray-600" />
//               </button>
//             )}
//             <div>
//               <h1 className="text-2xl font-semibold text-gray-800">Legal & Operational Clauses</h1>
//               <p className="text-sm text-gray-600 mt-1">Lease ID: LF-2023-001 | Tenant: Acme Corp.</p>
//             </div>
//           </div>
//         </div>

//         {/* Form Sections */}
//         <div className="space-y-6">
//           <RenewalOptionsSection 
//             data={formData}
//             onChange={handleChange}
//           />

//           <TerminationSection 
//             data={formData}
//             onChange={handleChange}
//           />

//           <SubLettingSection 
//             data={formData}
//             onChange={handleChange}
//           />

//           <ExclusivitySection 
//             data={formData}
//             onChange={handleChange}
//           />

//           <ReinstatementSection 
//             data={formData}
//             onChange={handleChange}
//           />

//           <DisputeResolutionSection 
//             data={formData}
//             onChange={handleChange}
//           />
//         </div>

//         {/* Action Buttons */}
//         <div className="mt-6 flex items-center justify-end gap-3 bg-white p-4 rounded-lg border border-gray-200 sticky bottom-0">
//           <button
//             onClick={onClose}
//             className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSave}
//             className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
//           >
//             <Save className="w-4 h-4" />
//             Save Clauses
//           </button>
//         </div>
//       </div>

//       {/* Save Confirmation Modal */}
//       {showSaveModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
//             <div className="text-center">
//               <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Save className="w-6 h-6 text-green-600" />
//               </div>
//               <h3 className="text-lg font-semibold text-gray-800 mb-2">Saved Successfully!</h3>
//               <p className="text-sm text-gray-600">Your changes have been saved.</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default LegalOperationalClausesPage;






import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { clauseAPI } from "../../services/api"; // ✅ adjust path if needed

import RenewalOptionsSection from "./components/RenewalOptionsSection";
import TerminationSection from "./components/TerminationSection";
import SubLettingSection from "./components/SubLettingSection";
import ExclusivitySection from "./components/ExclusivitySection";
import ReinstatementSection from "./components/ReinstatementSection";
import DisputeResolutionSection from "./components/DisputeResolutionSection";

const safeJson = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

const getOrgIdFromLocal = () => {
  const scopeTreeStr = localStorage.getItem("scope_tree");
  const scopeTree = scopeTreeStr ? safeJson(scopeTreeStr, null) : null;

  // Try common shapes:
  // 1) scope_tree.org_id
  if (scopeTree?.org_id) return Number(scopeTree.org_id);

  // 2) scope_tree.orgs[0].id
  if (Array.isArray(scopeTree?.orgs) && scopeTree.orgs[0]?.id)
    return Number(scopeTree.orgs[0].id);

  // 3) scope_tree.scopes OR fallback
  return 1;
};

const Card = ({ title, children, rightTitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {rightTitle ? (
        <div className="text-xs text-gray-500">{rightTitle}</div>
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
      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        disabled ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
      }`}
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  </div>
);

const LegalOperationalClausesPage = ({ onClose, clauseId }) => {
  // ✅ top-level clause fields
  const [basic, setBasic] = useState({
    org_id: getOrgIdFromLocal(),
    clause_id: clauseId || "", // for create, user fills
    title: "",
    category: "", // category id
    applies_to: "COMMERCIAL",
    status: "ACTIVE",
    initial_change_summary: "Initial template",
    initial_body_text: "",
  });

  // ✅ categories dropdown
  const [categories, setCategories] = useState([]);
  const categoryOptions = useMemo(
    () =>
      (categories || []).map((c) => ({
        value: String(c.id),
        label: `${c.label || c.name || "Category"} (ID: ${c.id})`,
      })),
    [categories]
  );

  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  // ✅ existing config form data (your current static sections)
  const [formData, setFormData] = useState({
    // Renewal Options
    preRenewalWindow: "90",
    renewalCycles: [
      {
        cycle: 1,
        term: "5 years",
        rentFormula: "Market rate + 5% of current rent",
        comments: "Standard increase, market adjustment.",
      },
      {
        cycle: 2,
        term: "3 years",
        rentFormula: "Fixed increase of 10% over current rent",
        comments: "Slightly higher fixed rate.",
      },
    ],

    // Termination
    terminationByTenant: false,
    terminationByLandlord: false,

    // Sub-letting & Signage
    subLettingPermitted: false,
    tenantSignage: true,
    landlordApproval: true,
    maxSignageArea: "5",
    signageUnit: "sqm",
    signageNotes: "Main entrance facade, maximum two signs.",

    // Exclusivity & Non-Compete
    exclusiveUse: true,
    exclusiveCategory: "Cafe and light food preparation.",
    excludedCategories: ["Bar", "Restaurant", "Retail"],
    nonCompeteDuration: "6",
    nonCompeteNotes: "Within a 1-mile radius of the property.",

    // Reinstatement & Insurance
    tenantRestore: true,
    reinstatementDetails: "Return to original white box condition, patching all holes.",
    tenantInsurance: true,
    coverageAmount: "5000000",
    additionalInsurance: false,
    indemnityNotes: "Tenant indemnifies landlord against all claims arising from tenant's use.",

    // Dispute Resolution
    disputeMechanism: "Arbitration",
    governingLaw: "State of New York",
    disputeSummary:
      "Disputes to be resolved via binding arbitration in New York, NY, with a single arbitrator.",
  });

  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBasicChange = (field, value) => {
    setBasic((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ load categories
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      setPageError("");
      try {
        const resp = await clauseAPI.listCategories();
        const list = Array.isArray(resp) ? resp : resp?.results || [];
        if (!mounted) return;
        setCategories(list);
      } catch (e) {
        if (!mounted) return;
        setCategories([]);
        setPageError(e?.message || "Failed to load categories");
      } finally {
        if (!mounted) return;
        setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ map your UI formData -> backend initial_config
  const buildInitialConfig = () => {
    const parseYears = (s) => {
      const n = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) ? n : 0;
    };

    const cycles = (formData.renewalCycles || []).map((x) => ({
      term_years: parseYears(x.term),
      rent_formula: x.rentFormula || "",
      comments: x.comments || "",
    }));

    return {
      renewal: {
        pre_negotiation_days: Number(formData.preRenewalWindow || 0),
        cycles,
      },
      termination: {
        tenant_permitted: !!formData.terminationByTenant,
        landlord_permitted: !!formData.terminationByLandlord,
        // notice_days: (add later when UI adds it)
      },
      subletting: { permitted: !!formData.subLettingPermitted },
      signage: {
        entitled: !!formData.tenantSignage,
        requires_landlord_approval: !!formData.landlordApproval,
        max_area_sqm: Number(formData.maxSignageArea || 0),
        notes: formData.signageNotes || "",
      },
      exclusivity: {
        exclusive_use: !!formData.exclusiveUse,
        exclusive_category_description: formData.exclusiveCategory || "",
        excluded_categories: Array.isArray(formData.excludedCategories)
          ? formData.excludedCategories
          : [],
        non_compete_months: Number(formData.nonCompeteDuration || 0),
        non_compete_scope_notes: formData.nonCompeteNotes || "",
      },
      reinstatement: {
        restore_required: !!formData.tenantRestore,
        details: formData.reinstatementDetails || "",
      },
      insurance: {
        public_liability_required: !!formData.tenantInsurance,
        min_coverage_amount: Number(formData.coverageAmount || 0),
        additional_requirements: formData.additionalInsurance ? "Yes" : "",
        indemnity_notes: formData.indemnityNotes || "",
      },
      dispute: {
        mechanism: formData.disputeMechanism || "",
        governing_law: formData.governingLaw || "",
        summary: formData.disputeSummary || "",
      },
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setPageError("");
    try {
      // ✅ validations
      if (!basic.org_id) throw new Error("org_id is required");
      if (!basic.clause_id) throw new Error("Clause ID is required");
      if (!basic.title) throw new Error("Clause Title is required");
      if (!basic.category) throw new Error("Category is required");

      const payload = {
        org_id: Number(basic.org_id),
        clause_id: String(basic.clause_id).trim(),
        title: String(basic.title).trim(),
        category: Number(basic.category),
        applies_to: basic.applies_to, // COMMERCIAL
        status: basic.status, // ACTIVE

        initial_change_summary: basic.initial_change_summary || "Initial template",
        initial_body_text: basic.initial_body_text || "",
        initial_config: buildInitialConfig(),
      };

      await clauseAPI.createClause(payload);

      setShowSaveModal(true);
      setTimeout(() => {
        setShowSaveModal(false);
        if (onClose) onClose();
      }, 1200);
    } catch (e) {
      setPageError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Legal & Operational Clauses
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create clause template (v1.0 will be created automatically)
              </p>
            </div>
          </div>
        </div>

        {pageError ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {pageError}
          </div>
        ) : null}

        {/* ✅ NEW: Basic Clause Details */}
        <Card
          title="Clause Basic Details"
          rightTitle={loadingCats ? "Loading categories..." : ""}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Org ID"
              type="number"
              value={basic.org_id}
              onChange={(v) => handleBasicChange("org_id", v)}
              hint="Auto-filled from scope_tree (you can change if needed)"
            />

            <Field
              label="Clause ID* (e.g., CL001)"
              value={basic.clause_id}
              onChange={(v) => handleBasicChange("clause_id", v)}
              placeholder="CL001"
            />

            <Field
              label="Clause Title*"
              value={basic.title}
              onChange={(v) => handleBasicChange("title", v)}
              placeholder="Renewal / Termination Master Clause"
            />

            <Select
              label="Category*"
              value={basic.category}
              onChange={(v) => handleBasicChange("category", v)}
              options={categoryOptions}
            />

            <Select
              label="Applies To"
              value={basic.applies_to}
              onChange={(v) => handleBasicChange("applies_to", v)}
              options={[
                { value: "COMMERCIAL", label: "COMMERCIAL" },
                { value: "RESIDENTIAL", label: "RESIDENTIAL" },
                { value: "ALL", label: "ALL" },
              ]}
            />

            <Select
              label="Status"
              value={basic.status}
              onChange={(v) => handleBasicChange("status", v)}
              options={[
                { value: "ACTIVE", label: "ACTIVE" },
                { value: "DRAFT", label: "DRAFT" },
                { value: "ARCHIVED", label: "ARCHIVED" },
              ]}
            />
          </div>

          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Change Summary
            </label>
            <input
              value={basic.initial_change_summary}
              onChange={(e) => handleBasicChange("initial_change_summary", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Initial template"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Body Text (optional)
            </label>
            <textarea
              rows="4"
              value={basic.initial_body_text}
              onChange={(e) => handleBasicChange("initial_body_text", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional plain-text clause body..."
            />
          </div>
        </Card>

        {/* Form Sections (same as your existing UI) */}
        <div className="space-y-6 mt-6">
          <RenewalOptionsSection data={formData} onChange={handleChange} />
          <TerminationSection data={formData} onChange={handleChange} />
          <SubLettingSection data={formData} onChange={handleChange} />
          <ExclusivitySection data={formData} onChange={handleChange} />
          <ReinstatementSection data={formData} onChange={handleChange} />
          <DisputeResolutionSection data={formData} onChange={handleChange} />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 bg-white p-4 rounded-lg border border-gray-200 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Clauses"}
          </button>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Save className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Saved Successfully!
              </h3>
              <p className="text-sm text-gray-600">Clause + v1.0 created.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalOperationalClausesPage;
