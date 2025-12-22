import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

import {
  Eye,
  Edit,
  X,
  Upload,
  Download,
  Trash2,
  Mail,
  Phone,
  FileText,
  Calendar,
  Tag,
  Plus,
  ChevronRight,
} from "lucide-react";
import { tenantAPI, authAPI } from "../../services/api";

const TenantManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantsMeta, setTenantsMeta] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [orgId, setOrgId] = useState(null);
  const [selectedTenantForTabs, setSelectedTenantForTabs] = useState(null); // For viewing data in Add mode

  // Tenant detail data
  const [contacts, setContacts] = useState([]);
  const [contactRoles, setContactRoles] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [communications, setCommunications] = useState([]);

  const apiError = (err, fallback = "Something went wrong") => {
  const data = err?.response?.data;

  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  // flatten DRF field errors: {field: ["msg"]} / {field: "msg"}
  const k = Object.keys(data)[0];
  const v = data?.[k];
  if (Array.isArray(v)) return `${k}: ${v[0]}`;
  if (typeof v === "string") return `${k}: ${v}`;
  return fallback;
};

const toInt = (v) => (v === "" || v == null ? null : Number(v));


  // Contact form states
  const [primaryContact, setPrimaryContact] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    department: "",
    purpose: "",
  });
  const [financeContact, setFinanceContact] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    department: "",
    purpose: "",
  });
  const [operationsContact, setOperationsContact] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
    department: "",
    purpose: "",
  });
  const [newSecondaryContact, setNewSecondaryContact] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    escalation_level: 1,
  });
  const [showAddSecondaryContact, setShowAddSecondaryContact] = useState(false);

  // Communication form state
  const [commForm, setCommForm] = useState({
    occurred_at: new Date().toISOString().slice(0, 16),
    channel: "EMAIL",
    recipient: "",
    sender: "",
    subject: "",
    message: "",
    status: "PENDING",
    tags: [],
  });
  const [newTag, setNewTag] = useState("");

  // Document upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [docForm, setDocForm] = useState({
    doc_type: "GST_CERT",
    status: "PENDING",
    title: "",
    document_no: "",
    issued_on: "",
    expiry_on: "",
  });

  // Get org_id from active scope
  useEffect(() => {
    const getOrgId = () => {
      // Get active scope
      const activeStr = localStorage.getItem("active");
      if (!activeStr) return null;

      const active = JSON.parse(activeStr);

      // If ORG is active, use its scope_id directly
      if (active.scope_type === "ORG") {
        return active.scope_id;
      }

      // If COMPANY is active, find the company and get its org
      if (active.scope_type === "COMPANY") {
        const scopeTreeStr = localStorage.getItem("scope_tree");
        if (!scopeTreeStr) return null;

        const scopeTree = JSON.parse(scopeTreeStr);

        // scopeTree is an array of orgs
        for (const org of scopeTree) {
          // Check if this org has the active company
          const company = org.companies?.find((c) => c.id === active.scope_id);
          if (company) {
            return org.id; // Return the parent org's id
          }
        }
      }

      return null;
    };

    const extractedOrgId = getOrgId();
    if (extractedOrgId) {
      setOrgId(extractedOrgId);
    } else {
      console.error("Could not extract org_id from active scope");
    }
  }, []);

  // Load contact roles for dropdowns
  const loadContactRoles = async () => {
    try {
      const rolesData = await tenantAPI.getContactRoles();
      setContactRoles(
        Array.isArray(rolesData) ? rolesData : rolesData.results || []
      );
    } catch (error) {
      console.error("Error loading contact roles:", error);
    }
  };

  useEffect(() => {
    loadContactRoles();
  }, []);

  // Load tenants directory
  const loadTenants = async (page = 1) => {
    if (!orgId) return;
    try {
      setLoading(true);
      const response = await tenantAPI.getTenantsDirectory(orgId, page, 10);
      setTenants(response.results || []);
      setTenantsMeta({
        count: response.count || 0,
        next: response.next,
        previous: response.previous,
      });
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading tenants:", error);
      alert("Failed to load tenants: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      loadTenants(1);
    }
  }, [orgId]);

  // Load tenant details when viewing
  const loadTenantDetails = async (tenantId) => {
    try {
      setLoading(true);

      // Load contacts
      const contactsData = await tenantAPI.getContacts(tenantId);
      const contactsList = Array.isArray(contactsData)
        ? contactsData
        : contactsData.results || [];
      setContacts(contactsList);

      // Populate contact forms - find by role_type
      const primary = contactsList.find((c) => c.role_type === "PRIMARY");
      const finance = contactsList.find((c) => c.role_type === "FINANCE");
      const operations = contactsList.find((c) => c.role_type === "OPERATIONS");

      // Set primary contact
      if (primary) {
        setPrimaryContact({
          id: primary.id,
          name: primary.name || "",
          designation: primary.designation || "",
          phone: primary.phone || "",
          email: primary.email || "",
          department: primary.department || "",
          purpose: primary.purpose || "",
        });
      } else {
        setPrimaryContact({
          name: "",
          designation: "",
          phone: "",
          email: "",
          department: "",
          purpose: "",
        });
      }

      // Set finance contact
      if (finance) {
        setFinanceContact({
          id: finance.id,
          name: finance.name || "",
          designation: finance.designation || "",
          phone: finance.phone || "",
          email: finance.email || "",
          department: finance.department || "",
          purpose: finance.purpose || "",
        });
      } else {
        setFinanceContact({
          name: "",
          designation: "",
          phone: "",
          email: "",
          department: "",
          purpose: "",
        });
      }

      // Set operations contact
      if (operations) {
        setOperationsContact({
          id: operations.id,
          name: operations.name || "",
          designation: operations.designation || "",
          phone: operations.phone || "",
          email: operations.email || "",
          department: operations.department || "",
          purpose: operations.purpose || "",
        });
      } else {
        setOperationsContact({
          name: "",
          designation: "",
          phone: "",
          email: "",
          department: "",
          purpose: "",
        });
      }

      // Load preferences
      try {
        const prefsData = await tenantAPI.getPreferences(tenantId);
        const prefsList = Array.isArray(prefsData)
          ? prefsData
          : prefsData.results || [];
        setPreferences(prefsList.length > 0 ? prefsList[0] : null);
      } catch (e) {
        console.error("Error loading preferences:", e);
        setPreferences(null);
      }

      // Load KYC
      try {
        const kycData = await tenantAPI.getKYC(tenantId);
        const kycList = Array.isArray(kycData)
          ? kycData
          : kycData.results || [];
        setKyc(kycList.length > 0 ? kycList[0] : null);
      } catch (e) {
        console.error("Error loading KYC:", e);
        setKyc(null);
      }

      // Load documents
      const docsData = await tenantAPI.getDocuments(tenantId);
      setDocuments(Array.isArray(docsData) ? docsData : docsData.results || []);

      // Load communications
      const commsData = await tenantAPI.getCommunications(tenantId);
      setCommunications(
        Array.isArray(commsData) ? commsData : commsData.results || []
      );
    } catch (error) {
      console.error("Error loading tenant details:", error);
      alert(
        "Failed to load tenant details: " + (error.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    tenantId: "",
    legalName: "",
    brandName: "",
    shortCode: "",
    tenantType: "Corporate",
    industryCategory: "IT & Software",
    tenantStatus: "Active",
    gst: "",
    pan: "",
    cin: "",
    registrationAddress: "",
    sameAsRegistration: false,
    billingAddress: "",
    creditLimit: "",
    paymentTerms: "Net 30",
    parentCompany: "",
    brokerCode: "",
    brokerage: "",
  });

  const statusCounts = {
    active: tenants.filter(
      (t) => t.status === "ACTIVE" || t.status === "Active"
    ).length,
    inactive: tenants.filter(
      (t) => t.status === "INACTIVE" || t.status === "Inactive"
    ).length,
    blacklisted: tenants.filter(
      (t) => t.status === "BLACKLISTED" || t.status === "Blacklisted"
    ).length,
    churned: tenants.filter(
      (t) => t.status === "CHURNED" || t.status === "Churned"
    ).length,
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("Organization ID not found. Please refresh the page.");
      return;
    }

    try {
      setLoading(true);

      const basePayload = {
        tenant_code: formData.tenantId || "",
        legal_name: formData.legalName,
        brand_name: formData.brandName,
        short_code: formData.shortCode,
        tenant_type: (formData.tenantType || "corporate").toLowerCase(),
        industry_category: formData.industryCategory,
        status: (formData.tenantStatus || "ACTIVE").toUpperCase(),
        gst_no: formData.gst || "",
        pan_no: formData.pan || "",
        cin_no: formData.cin || "",
        registration_address: formData.registrationAddress,
        billing_same_as_registration: !!formData.sameAsRegistration,
        billing_address: formData.billingAddress || "",
        credit_limit: formData.creditLimit || "0.00",
        payment_terms_days: parseInt(
          (formData.paymentTerms || "Net 30").replace("Net ", "") || "30",
          10
        ),
        parent_company_name: formData.parentCompany || "",
        parent_company: null,
        broker_code: formData.brokerCode || "",
        brokerage_percent: formData.brokerage || "0.00",
      };

      if (selectedTenant?.id) {
        // ✅ PATCH SAFE: do NOT send org_id on patch unless backend allows it
        await tenantAPI.updateTenant(selectedTenant.id, basePayload);
        toast.success("Tenant updated successfully!");
      } else {
        const createPayload = { ...basePayload, org_id: orgId };
        const created = await tenantAPI.createTenant(createPayload);
        toast.success("Tenant created successfully!");
        setSelectedTenant(created);
      }

      await loadTenants(currentPage);
      setShowForm(false);
      setSelectedTenant(null);
      setSelectedTenantForTabs(null);
      setActiveTab("Overview");
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast.error(apiError(error, "Failed to save tenant"));
    } finally {
      setLoading(false);
    }
  };


  const stripContactPatch = (payload) => {
    const { tenant, role_type, ...rest } = payload; // remove common read-only/create-only
    return rest;
  };

  const stripPrefsPatch = (payload) => {
    const { tenant, ...rest } = payload;
    return rest;
  };




  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!orgId) {
  //     alert("Organization ID not found. Please refresh the page.");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const payload = {
  //       org_id: orgId,
  //       tenant_code: formData.tenantId || "",
  //       legal_name: formData.legalName,
  //       brand_name: formData.brandName,
  //       short_code: formData.shortCode,
  //       tenant_type: formData.tenantType?.toLowerCase() || "corporate",
  //       industry_category: formData.industryCategory,
  //       status: formData.tenantStatus?.toUpperCase() || "ACTIVE",
  //       gst_no: formData.gst || "",
  //       pan_no: formData.pan || "",
  //       cin_no: formData.cin || "",
  //       registration_address: formData.registrationAddress,
  //       billing_same_as_registration: formData.sameAsRegistration,
  //       billing_address: formData.billingAddress || "",
  //       credit_limit: formData.creditLimit || "0.00",
  //       payment_terms_days: parseInt(
  //         formData.paymentTerms?.replace("Net ", "") || "30"
  //       ),
  //       parent_company_name: formData.parentCompany || "",
  //       parent_company: null,
  //       broker_code: formData.brokerCode || "",
  //       brokerage_percent: formData.brokerage || "0.00",
  //     };

  //     if (selectedTenant) {
  //       // Update existing tenant
  //       await tenantAPI.updateTenant(selectedTenant.id, payload);
  //       alert("Tenant updated successfully!");
  //     } else {
  //       // Create new tenant
  //       const response = await tenantAPI.createTenant(payload);
  //       alert("Tenant created successfully!");
  //       setSelectedTenant(response);
  //     }

  //     // Reload tenants list
  //     await loadTenants(currentPage);
  //     setShowForm(false);
  //     setSelectedTenant(null);
  //     setActiveTab("Overview");
  //   } catch (error) {
  //     console.error("Error saving tenant:", error);
  //     alert("Failed to save tenant: " + (error.message || "Unknown error"));
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSaveContacts = async (targetTenantOverride = null) => {
    const targetTenant = targetTenantOverride || selectedTenant;
    if (!targetTenant) return;

    try {
      setLoading(true);

      // Get role IDs (assuming first 3 roles are Primary, Finance, Operations)
      const primaryRoleId =
        contactRoles.find(
          (r) =>
            r.code === "primary" || r.label?.toLowerCase().includes("primary")
        )?.id ||
        contactRoles[0]?.id ||
        1;
      const financeRoleId =
        contactRoles.find(
          (r) =>
            r.code === "finance" || r.label?.toLowerCase().includes("finance")
        )?.id ||
        contactRoles[1]?.id ||
        2;
      const operationsRoleId =
        contactRoles.find(
          (r) =>
            r.code === "operations" ||
            r.label?.toLowerCase().includes("operations")
        )?.id ||
        contactRoles[2]?.id ||
        3;

      // Save or update primary contact
      if (primaryContact.name) {
        const primaryPayload = {
          tenant: targetTenant.id,
          role_type: "PRIMARY",
          role: primaryRoleId,
          escalation_level: null,
          sort_order: 0,
          name: primaryContact.name,
          designation: primaryContact.designation || "",
          department: primaryContact.department || "",
          email: primaryContact.email || "",
          phone: primaryContact.phone || "",
          purpose: primaryContact.purpose || "receives legal notices",
          is_enabled: true,
        };

        if (primaryContact.id) {
       await tenantAPI.updateContact(
         primaryContact.id,
         stripContactPatch(primaryPayload)
       );

        } else {
          await tenantAPI.createContact(primaryPayload);
        }
      }

      // Save or update finance contact
      if (financeContact.name) {
        const financePayload = {
          tenant: targetTenant.id,
          role_type: "FINANCE",
          role: financeRoleId,
          escalation_level: null,
          sort_order: 0,
          name: financeContact.name,
          designation: financeContact.designation || "",
          department: financeContact.department || "finance",
          email: financeContact.email || "",
          phone: financeContact.phone || "",
          purpose: financeContact.purpose || "invoices and soa",
          is_enabled: true,
        };

        if (financeContact.id) {
        await tenantAPI.updateContact(
          financeContact.id,
          stripContactPatch(financePayload)
        );

        } else {
          await tenantAPI.createContact(financePayload);
        }
      }

      // Save or update operations contact
      if (operationsContact.name) {
        const operationsPayload = {
          tenant: targetTenant.id,
          role_type: "OPERATIONS",
          role: operationsRoleId,
          escalation_level: null,
          sort_order: 0,
          name: operationsContact.name,
          designation: operationsContact.designation || "",
          department: operationsContact.department || "operations",
          email: operationsContact.email || "",
          phone: operationsContact.phone || "",
          purpose: operationsContact.purpose || "facility and fit-out",
          is_enabled: true,
        };

        if (operationsContact.id) {
await tenantAPI.updateContact(
  operationsContact.id,
  stripContactPatch(operationsPayload)
);
        } else {
          await tenantAPI.createContact(operationsPayload);
        }
      }

      // Save or update preferences
      const prefsPayload = {
        tenant: targetTenant.id,
        prefer_email: preferences?.prefer_email ?? true,
        prefer_sms: preferences?.prefer_sms ?? true,
        prefer_whatsapp: preferences?.prefer_whatsapp ?? false,
        prefer_portal: preferences?.prefer_portal ?? true,
        do_not_disturb: preferences?.do_not_disturb ?? false,
        preferred_language: preferences?.preferred_language || "en",
      };

      if (preferences?.id) {
       await tenantAPI.updatePreferences(preferences.id, prefsPayload);

      } else {
        await tenantAPI.createPreferences(prefsPayload);
      }

      toast.success("Contacts saved successfully!");
      await loadTenantDetails(targetTenant.id);
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast.error(apiError(error, "Failed to save contacts"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSecondaryContact = async () => {
    const targetTenant = selectedTenant || selectedTenantForTabs;
    if (!targetTenant || !newSecondaryContact.name) return;

    try {
      setLoading(true);

      const payload = {
        tenant: targetTenant.id,
        role_type: "SECONDARY",
        role: toInt(newSecondaryContact.role) || contactRoles[0]?.id,
        escalation_level: newSecondaryContact.escalation_level || 1,
        sort_order:
          contacts.filter((c) => c.role_type === "SECONDARY").length + 1,
        name: newSecondaryContact.name,
        designation: "",
        department: "",
        email: newSecondaryContact.email || "",
        phone: newSecondaryContact.phone || "",
        purpose: "escalation path",
        is_enabled: true,
      };

      await tenantAPI.createContact(payload);
     toast.success("Secondary contact added successfully!");
      setShowAddSecondaryContact(false);
      setNewSecondaryContact({
        name: "",
        role: "",
        email: "",
        phone: "",
        escalation_level: 1,
      });
      await loadTenantDetails(targetTenant.id);
    } catch (error) {
      console.error("Error adding secondary contact:", error);
      toast.error(
        "Failed to add secondary contact: " + (error.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContactActive = async (contactId, currentStatus) => {
    try {
      setLoading(true);
      await tenantAPI.updateContact(contactId, { is_enabled: !currentStatus });
      await loadTenantDetails(selectedTenant.id);
    } catch (error) {
      console.error("Error toggling contact status:", error);
      toast.error("Failed to update contact status");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadDocument = async (targetTenantOverride = null) => {
    const targetTenant = targetTenantOverride || selectedTenant;
    if (!targetTenant || !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("tenant", targetTenant.id);
      formData.append("doc_type", docForm.doc_type);
      formData.append("status", docForm.status);
      formData.append("title", docForm.title || selectedFile.name);
      formData.append("document_no", docForm.document_no || "");
      formData.append("issued_on", docForm.issued_on || "");
      formData.append("expiry_on", docForm.expiry_on || "");
      formData.append("file", selectedFile);

      await tenantAPI.uploadDocument(formData);
      toast.success("Document uploaded successfully!");
      setSelectedFile(null);
      setDocForm({
        doc_type: "GST_CERT",
        status: "PENDING",
        title: "",
        document_no: "",
        issued_on: "",
        expiry_on: "",
      });
      await loadTenantDetails(targetTenant.id);
    } catch (error) {
      console.error("Error uploading document:", error);
     toast.error(
       "Failed to upload document: " + (error.message || "Unknown error")
     );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      setLoading(true);
      await tenantAPI.deleteDocument(docId);
      toast.success("Document deleted successfully!");
      await loadTenantDetails(selectedTenant.id);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag && !commForm.tags.includes(newTag)) {
      setCommForm((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setCommForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSaveCommunication = async (e) => {
    e.preventDefault();
    const targetTenant = selectedTenant || selectedTenantForTabs;
    if (!targetTenant) return;

    try {
      setLoading(true);

      const payload = {
        tenant: targetTenant.id,
        contact: null,
        channel: commForm.channel,
        direction: "OUTBOUND",
        status: commForm.status,
        subject: commForm.subject,
        message: commForm.message,
        sender: commForm.sender,
        recipient: commForm.recipient,
        tags: commForm.tags,
        occurred_at: new Date(commForm.occurred_at).toISOString(),
        meta: {},
      };

      await tenantAPI.createCommunication(payload);
      toast.success("Communication logged successfully!");
      setShowCommunicationModal(false);
      setCommForm({
        occurred_at: new Date().toISOString().slice(0, 16),
        channel: "EMAIL",
        recipient: "",
        sender: "",
        subject: "",
        message: "",
        status: "PENDING",
        tags: [],
      });
      await loadTenantDetails(targetTenant.id);
    } catch (error) {
      console.error("Error saving communication:", error);
        toast.error(apiError(error, "Failed to save communication"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case "ACTIVE":
        return "text-green-600";
      case "INACTIVE":
        return "text-gray-600";
      case "BLACKLISTED":
        return "bg-red-100 text-red-600 px-2 py-1 rounded";
      case "CHURNED":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const handleTenantSelectForTabs = async (tenantId) => {
    if (!tenantId) {
      setSelectedTenantForTabs(null);
      return;
    }

    const tenant = tenants.find((t) => t.id === parseInt(tenantId));
    setSelectedTenantForTabs(tenant);

    // Load tenant details
    if (tenant) {
      await loadTenantDetails(tenant.id);
    }
  };

  const handleViewTenant = async (tenant) => {
    setSelectedTenant(tenant);
    setActiveTab("Overview");
    setShowForm(true);

    // Populate form with tenant data
    setFormData({
      tenantId: tenant.tenant_code || "",
      legalName: tenant.legal_name || "",
      brandName: tenant.brand_name || "",
      shortCode: tenant.short_code || "",
      tenantType: tenant.tenant_type || "Corporate",
      industryCategory: tenant.industry_category || "",
      tenantStatus: tenant.status || "Active",
      gst: tenant.gst_no || "",
      pan: tenant.pan_no || "",
      cin: tenant.cin_no || "",
      registrationAddress: tenant.registration_address || "",
      sameAsRegistration: tenant.billing_same_as_registration || false,
      billingAddress: tenant.billing_address || "",
      creditLimit: tenant.credit_limit || "",
      paymentTerms: tenant.payment_terms_days
        ? `Net ${tenant.payment_terms_days}`
        : "Net 30",
      parentCompany: tenant.parent_company_name || "",
      brokerCode: tenant.broker_code || "",
      brokerage: tenant.brokerage_percent || "",
    });

    // Load tenant details
    await loadTenantDetails(tenant.id);
  };

  const getDocumentStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "VERIFIED":
        return "text-green-600";
      case "PENDING":
        return "text-yellow-600";
      case "EXPIRED":
        return "text-red-600";
      case "OUTDATED":
        return "text-gray-500";
      default:
        return "text-gray-600";
    }
  };

  const getCommunicationStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "SENT":
        return "text-blue-600";
      case "ACKNOWLEDGED":
        return "text-green-600";
      case "READ":
        return "text-gray-600";
      case "PENDING":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getCommunicationTypeIcon = (type) => {
    switch (type?.toUpperCase()) {
      case "EMAIL":
        return <Mail className="w-4 h-4" />;
      case "CALL":
        return <Phone className="w-4 h-4" />;
      case "NOTICE":
        return <FileText className="w-4 h-4" />;
      case "LETTER":
        return <FileText className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const handleUpdatePreference = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const secondaryContacts = contacts.filter((c) => c.role_type === "SECONDARY");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {!showForm ? (
        // Main Tenant List View - Only show when form is closed
        <div className="max-full mx-auto">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Tenants</h1>
                <button
                  onClick={() => {
                    setSelectedTenant(null);
                    setActiveTab("Overview");
                    setShowForm(true);
                    setFormData({
                      tenantId: "",
                      legalName: "",
                      brandName: "",
                      shortCode: "",
                      tenantType: "Corporate",
                      industryCategory: "IT & Software",
                      tenantStatus: "Active",
                      gst: "",
                      pan: "",
                      cin: "",
                      registrationAddress: "",
                      sameAsRegistration: false,
                      billingAddress: "",
                      creditLimit: "",
                      paymentTerms: "Net 30",
                      parentCompany: "",
                      brokerCode: "",
                      brokerage: "",
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Tenant</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search tenants..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Tenant Type</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Industry Category</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Tenant Status</option>
                </select>
                <button className="px-4 py-2 text-blue-600 hover:text-blue-700">
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="flex">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Actions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Tenant ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Legal Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Brand Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Tenant Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Industry Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Credit Limit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Payment Terms
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                        Primary Contact Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Loading tenants...
                        </td>
                      </tr>
                    ) : tenants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No tenants found
                        </td>
                      </tr>
                    ) : (
                      tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewTenant(tenant)}
                                className="p-1 text-gray-600 hover:text-blue-600"
                              >
                                <Eye size={16} />
                              </button>
                              <button className="p-1 text-gray-600 hover:text-blue-600">
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.tenant_code || tenant.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.legal_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.brand_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.tenant_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.industry_category}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{tenant.credit_limit}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            Net {tenant.payment_terms_days || 30}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm font-medium ${getStatusColor(
                              tenant.status
                            )}`}
                          >
                            {tenant.status}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {tenant.primary_contact?.name || "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="w-64 border-l p-6">
                <h3 className="font-semibold mb-4">Tenant Status Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Active Tenants
                    </span>
                    <span className="font-semibold">{statusCounts.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Inactive Tenants
                    </span>
                    <span className="font-semibold">
                      {statusCounts.inactive}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Blacklisted Tenants
                    </span>
                    <span className="font-semibold">
                      {statusCounts.blacklisted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Churned Tenants
                    </span>
                    <span className="font-semibold">
                      {statusCounts.churned}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {tenants.length > 0
                    ? `Showing ${tenants.length} of ${tenantsMeta.count}`
                    : "No results"}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      tenantsMeta.previous && loadTenants(currentPage - 1)
                    }
                    disabled={!tenantsMeta.previous}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() =>
                      tenantsMeta.next && loadTenants(currentPage + 1)
                    }
                    disabled={!tenantsMeta.next}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showForm && !selectedTenant ? (
        // Add Tenant Form - Only show form, hide main list
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab("Overview")}
                className={`pb-2 font-medium cursor-pointer transition-colors ${
                  activeTab === "Overview"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Contacts")}
                className={`pb-2 font-medium cursor-pointer transition-colors ${
                  activeTab === "Contacts"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600"
                }`}
              >
                Contacts & Hierarchy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("KYC")}
                className={`pb-2 font-medium cursor-pointer transition-colors ${
                  activeTab === "KYC"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600"
                }`}
              >
                KYC & Documents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Communication")}
                className={`pb-2 font-medium cursor-pointer transition-colors ${
                  activeTab === "Communication"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600"
                }`}
              >
                Communication Log
              </button>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedTenant(null);
                setActiveTab("Overview");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {activeTab === "Overview" && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Tenant Identity</h2>
                <div className="grid grid-cols-3 gap-6">
                  {/* <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Tenant ID
                    </label>
                    <input
                      type="text"
                      name="tenantId"
                      value={formData.tenantId}
                      onChange={handleInputChange}
                      placeholder="TI00012345"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div> */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Legal Name
                    </label>
                    <input
                      type="text"
                      name="legalName"
                      value={formData.legalName}
                      onChange={handleInputChange}
                      placeholder="ABC Real Estate Pvt. Ltd."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleInputChange}
                      placeholder="ABC Properties"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Short Code
                    </label>
                    <input
                      type="text"
                      name="shortCode"
                      value={formData.shortCode}
                      onChange={handleInputChange}
                      placeholder="ABCPROP"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Tenant Type
                    </label>
                    <select
                      name="tenantType"
                      value={formData.tenantType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Corporate</option>
                      <option>Retail</option>
                      <option>Commercial</option>
                      <option>Residential</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Industry Category
                    </label>
                    <select
                      name="industryCategory"
                      value={formData.industryCategory}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>IT & Software</option>
                      <option>Healthcare</option>
                      <option>Real Estate</option>
                      <option>Retail</option>
                      <option>F&B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Tenant Status
                    </label>
                    <select
                      name="tenantStatus"
                      value={formData.tenantStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Blacklisted</option>
                      <option>Churned</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">
                  Registration & Billing
                </h2>
                <div className="grid grid-cols-3 gap-6 mb-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      GST
                    </label>
                    <input
                      type="text"
                      name="gst"
                      value={formData.gst}
                      onChange={handleInputChange}
                      placeholder="27XXXXXX7256125"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      PAN
                    </label>
                    <input
                      type="text"
                      name="pan"
                      value={formData.pan}
                      onChange={handleInputChange}
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      CIN
                    </label>
                    <input
                      type="text"
                      name="cin"
                      value={formData.cin}
                      onChange={handleInputChange}
                      placeholder="U70100DL2007PTC180565"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-2">
                    Registration Address
                  </label>
                  <textarea
                    name="registrationAddress"
                    value={formData.registrationAddress}
                    onChange={handleInputChange}
                    placeholder="123, Business Park, Industrial Area, Sector 62, Noida, Uttar Pradesh, 201301"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="sameAsRegistration"
                      checked={formData.sameAsRegistration}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Same as Registration Address
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Billing Address
                  </label>
                  <textarea
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    placeholder="Billing address will appear here"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">
                  Financial Profile
                </h2>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="text"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleInputChange}
                      placeholder="50000.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <select
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Net 30</option>
                      <option>Net 15</option>
                      <option>Net 45</option>
                      <option>Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Parent/Group Company
                    </label>
                    <input
                      type="text"
                      name="parentCompany"
                      value={formData.parentCompany}
                      onChange={handleInputChange}
                      placeholder="Global Holdings Ltd."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Broker Code
                    </label>
                    <input
                      type="text"
                      name="brokerCode"
                      value={formData.brokerCode}
                      onChange={handleInputChange}
                      placeholder="B56001"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Brokerage %
                    </label>
                    <input
                      type="text"
                      name="brokerage"
                      value={formData.brokerage}
                      onChange={handleInputChange}
                      placeholder="5.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTenant(null);
                    setActiveTab("Overview");
                  }}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "Contacts" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Contact Hierarchy</h2>

              {/* Tenant Selection Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant to View/Edit Contacts
                </label>
                <select
                  value={selectedTenantForTabs?.id || ""}
                  onChange={(e) => handleTenantSelectForTabs(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Tenant --</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.legal_name} ({tenant.tenant_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTenantForTabs ? (
                <>
                  {/* All Contacts Table */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        All Contacts
                      </h3>
                      <button
                        onClick={() => setShowAddSecondaryContact(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add New Contact
                      </button>
                    </div>

                    {showAddSecondaryContact && (
                      <div className="mb-4 p-4 border border-blue-200 rounded bg-blue-50">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Add New Contact
                        </h4>
                        <div className="grid grid-cols-6 gap-3">
                          <input
                            type="text"
                            placeholder="Name"
                            value={newSecondaryContact.name}
                            onChange={(e) =>
                              setNewSecondaryContact({
                                ...newSecondaryContact,
                                name: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={newSecondaryContact.role}
                            onChange={(e) =>
                              setNewSecondaryContact({
                                ...newSecondaryContact,
                                role: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select Role</option>
                            {contactRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Designation"
                            value={newSecondaryContact.designation || ""}
                            onChange={(e) =>
                              setNewSecondaryContact({
                                ...newSecondaryContact,
                                designation: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            value={newSecondaryContact.email}
                            onChange={(e) =>
                              setNewSecondaryContact({
                                ...newSecondaryContact,
                                email: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={newSecondaryContact.phone}
                            onChange={(e) =>
                              setNewSecondaryContact({
                                ...newSecondaryContact,
                                phone: e.target.value,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddSecondaryContact}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setShowAddSecondaryContact(false);
                                setNewSecondaryContact({
                                  name: "",
                                  role: "",
                                  email: "",
                                  phone: "",
                                  escalation_level: 1,
                                });
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Role Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Designation
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Department
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Phone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Purpose
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Active
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {contacts && contacts.length > 0 ? (
                            contacts.map((contact, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {contact.name}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      contact.role_type === "PRIMARY"
                                        ? "bg-blue-100 text-blue-700"
                                        : contact.role_type === "FINANCE"
                                        ? "bg-green-100 text-green-700"
                                        : contact.role_type === "OPERATIONS"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {contact.role_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {contact.role_label}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {contact.designation || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {contact.department || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {contact.email}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {contact.phone}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {contact.purpose}
                                </td>
                                <td className="px-4 py-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={contact.is_enabled}
                                      onChange={() =>
                                        handleToggleContactActive(
                                          contact.id,
                                          contact.is_enabled
                                        )
                                      }
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                  </label>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="p-1 text-gray-600 hover:text-blue-600"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (
                                          confirm(
                                            "Are you sure you want to delete this contact?"
                                          )
                                        ) {
                                          try {
                                            setLoading(true);
                                            await tenantAPI.deleteContact(
                                              contact.id
                                            );
                                            alert(
                                              "Contact deleted successfully!"
                                            );
                                            await loadTenantDetails(
                                              selectedTenantForTabs.id
                                            );
                                          } catch (error) {
                                            console.error(
                                              "Error deleting contact:",
                                              error
                                            );
                                            alert("Failed to delete contact");
                                          } finally {
                                            setLoading(false);
                                          }
                                        }
                                      }}
                                      className="p-1 text-gray-600 hover:text-red-600"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={10}
                                className="px-4 py-8 text-center text-gray-500 text-sm"
                              >
                                No contacts found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Communication Preferences */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Communication Preferences
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select how this tenant prefers to receive notifications
                      and reminders.
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          checked={preferences?.prefer_email ?? true}
                          onChange={(e) =>
                            handleUpdatePreference(
                              "prefer_email",
                              e.target.checked
                            )
                          }
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Email
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          checked={preferences?.prefer_sms ?? true}
                          onChange={(e) =>
                            handleUpdatePreference(
                              "prefer_sms",
                              e.target.checked
                            )
                          }
                        />
                        <span className="ml-2 text-sm text-gray-700">SMS</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          checked={preferences?.prefer_portal ?? true}
                          onChange={(e) =>
                            handleUpdatePreference(
                              "prefer_portal",
                              e.target.checked
                            )
                          }
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Tenant Portal
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          checked={preferences?.prefer_whatsapp ?? false}
                          onChange={(e) =>
                            handleUpdatePreference(
                              "prefer_whatsapp",
                              e.target.checked
                            )
                          }
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          WhatsApp
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedTenant(null);
                        setSelectedTenantForTabs(null);
                        setActiveTab("Overview");
                      }}
                      className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveContacts(selectedTenantForTabs)}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Please select a tenant to view/edit contacts
                </p>
              )}
            </div>
          )}

          {activeTab === "KYC" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">KYC & Documents</h2>

              {/* Tenant Selection Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant to View/Edit Documents
                </label>
                <select
                  value={selectedTenantForTabs?.id || ""}
                  onChange={(e) => handleTenantSelectForTabs(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Tenant --</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.legal_name} ({tenant.tenant_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTenantForTabs ? (
                <>
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                        <option>All Statuses</option>
                        <option>Verified</option>
                        <option>Pending</option>
                        <option>Expired</option>
                        <option>Outdated</option>
                      </select>
                      <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                        <option>All Types</option>
                      </select>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Document Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Uploaded File Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Uploaded On
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {documents && documents.length > 0 ? (
                            documents.map((doc, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-gray-50 bg-white"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {doc.doc_type}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {doc.title}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {doc.uploaded_at
                                    ? new Date(
                                        doc.uploaded_at
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-sm font-medium ${getDocumentStatusColor(
                                      doc.status
                                    )}`}
                                  >
                                    {doc.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="p-1 text-gray-600 hover:text-blue-600"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-1 text-gray-600 hover:text-blue-600"
                                    >
                                      <Download size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteDocument(doc.id)
                                      }
                                      className="p-1 text-gray-600 hover:text-red-600"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center text-gray-500 text-sm"
                              >
                                No documents found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Upload New Documents
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Type
                          </label>
                          <select
                            value={docForm.doc_type}
                            onChange={(e) =>
                              setDocForm({
                                ...docForm,
                                doc_type: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          >
                            <option value="INC_CERT">
                              Incorporation Certificate
                            </option>
                            <option value="GST_CERT">GST Certificate</option>
                            <option value="PAN_COPY">PAN Copy</option>
                            <option value="AUDITED_FIN">
                              Audited Financials
                            </option>
                            <option value="BOARD_RES">Board Resolution</option>
                            <option value="LEASE_AGR">Lease Agreement</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title
                          </label>
                          <input
                            type="text"
                            value={docForm.title}
                            onChange={(e) =>
                              setDocForm({ ...docForm, title: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="Document title"
                          />
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedFile
                              ? selectedFile.name
                              : "Drag & drop files here or"}
                          </p>
                          <input
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload-add"
                          />
                          <label
                            htmlFor="file-upload-add"
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer inline-block"
                          >
                            Browse Files
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Compliance Notes
                        </label>
                        <textarea
                          rows="6"
                          placeholder="Add any specific compliance comments or notes here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() =>
                          handleUploadDocument(selectedTenantForTabs)
                        }
                        disabled={loading || !selectedFile}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {loading ? "Uploading..." : "Upload Documents"}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedTenant(null);
                        setSelectedTenantForTabs(null);
                        setActiveTab("Overview");
                      }}
                      className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Please select a tenant to view/edit documents
                </p>
              )}
            </div>
          )}

          {activeTab === "Communication" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Communication Log</h2>

              {/* Tenant Selection Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant to View/Log Communications
                </label>
                <select
                  value={selectedTenantForTabs?.id || ""}
                  onChange={(e) => handleTenantSelectForTabs(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Tenant --</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.legal_name} ({tenant.tenant_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTenantForTabs ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-medium">
                      Communication History
                    </h3>
                    <button
                      onClick={() => setShowCommunicationModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Mail size={16} />
                      Log New Communication
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date Range
                        </label>
                        <input
                          type="text"
                          defaultValue="Nov 08, 2025 - Dec 08, 2025"
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                          <option>All Types</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tag
                        </label>
                        <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                          <option>All Tags</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                          <option>All Statuses</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Date & Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Subject
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Recipient
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Sender
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Tags
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {communications && communications.length > 0 ? (
                          communications.map((comm, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 bg-white">
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {comm.occurred_at
                                  ? new Date(comm.occurred_at).toLocaleString()
                                  : "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {getCommunicationTypeIcon(comm.channel)}
                                  <span className="text-sm text-gray-900">
                                    {comm.channel}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {comm.subject}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {comm.recipient}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {comm.sender}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {comm.tags &&
                                    comm.tags.map((tag, tagIdx) => (
                                      <span
                                        key={tagIdx}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm font-medium ${getCommunicationStatusColor(
                                    comm.status
                                  )}`}
                                >
                                  {comm.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  className="p-1 text-gray-600 hover:text-blue-600"
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-8 text-center text-gray-500 text-sm"
                            >
                              No communications found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedTenant(null);
                        setSelectedTenantForTabs(null);
                        setActiveTab("Overview");
                      }}
                      className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Please select a tenant to view/log communications
                </p>
              )}
            </div>
          )}
        </div>
      ) : showForm && selectedTenant ? (
        // View/Edit Tenant Form - Only show form, hide main list
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Tenant Details for {selectedTenant.legal_name}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedTenant(null);
                setActiveTab("Overview");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="border-b px-6 flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("Overview")}
              className={`pb-3 font-medium cursor-pointer hover:text-blue-600 transition-colors ${
                activeTab === "Overview"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("Contacts")}
              className={`pb-3 font-medium cursor-pointer hover:text-blue-600 transition-colors ${
                activeTab === "Contacts"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("KYC")}
              className={`pb-3 font-medium cursor-pointer hover:text-blue-600 transition-colors ${
                activeTab === "KYC"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              KYC & Documents
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("Communication")}
              className={`pb-3 font-medium cursor-pointer hover:text-blue-600 transition-colors ${
                activeTab === "Communication"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Communication Log
            </button>
          </div>
          <div className="p-6">
            {activeTab === "Overview" && (
              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">
                    Tenant Identity
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Tenant ID
                      </label>
                      <input
                        type="text"
                        name="tenantId"
                        value={formData.tenantId}
                        onChange={handleInputChange}
                        placeholder="TI00012345"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Legal Name
                      </label>
                      <input
                        type="text"
                        name="legalName"
                        value={formData.legalName}
                        onChange={handleInputChange}
                        placeholder="ABC Real Estate Pvt. Ltd."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleInputChange}
                        placeholder="ABC Properties"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Short Code
                      </label>
                      <input
                        type="text"
                        name="shortCode"
                        value={formData.shortCode}
                        onChange={handleInputChange}
                        placeholder="ABCPROP"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Tenant Type
                      </label>
                      <select
                        name="tenantType"
                        value={formData.tenantType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Corporate</option>
                        <option>Retail</option>
                        <option>Commercial</option>
                        <option>Residential</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Industry Category
                      </label>
                      <select
                        name="industryCategory"
                        value={formData.industryCategory}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>IT & Software</option>
                        <option>Healthcare</option>
                        <option>Real Estate</option>
                        <option>Retail</option>
                        <option>F&B</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Tenant Status
                      </label>
                      <select
                        name="tenantStatus"
                        value={formData.tenantStatus}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Blacklisted</option>
                        <option>Churned</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">
                    Registration & Billing
                  </h2>
                  <div className="grid grid-cols-3 gap-6 mb-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        GST
                      </label>
                      <input
                        type="text"
                        name="gst"
                        value={formData.gst}
                        onChange={handleInputChange}
                        placeholder="27XXXXXX7256125"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        PAN
                      </label>
                      <input
                        type="text"
                        name="pan"
                        value={formData.pan}
                        onChange={handleInputChange}
                        placeholder="ABCDE1234F"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        CIN
                      </label>
                      <input
                        type="text"
                        name="cin"
                        value={formData.cin}
                        onChange={handleInputChange}
                        placeholder="U70100DL2007PTC180565"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-700 mb-2">
                      Registration Address
                    </label>
                    <textarea
                      name="registrationAddress"
                      value={formData.registrationAddress}
                      onChange={handleInputChange}
                      placeholder="123, Business Park, Industrial Area, Sector 62, Noida, Uttar Pradesh, 201301"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="sameAsRegistration"
                        checked={formData.sameAsRegistration}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Same as Registration Address
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Billing Address
                    </label>
                    <textarea
                      name="billingAddress"
                      value={formData.billingAddress}
                      onChange={handleInputChange}
                      placeholder="Billing address will appear here"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">
                    Financial Profile
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Credit Limit (₹)
                      </label>
                      <input
                        type="text"
                        name="creditLimit"
                        value={formData.creditLimit}
                        onChange={handleInputChange}
                        placeholder="50000.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Payment Terms
                      </label>
                      <select
                        name="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option>Net 30</option>
                        <option>Net 15</option>
                        <option>Net 45</option>
                        <option>Net 60</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Parent/Group Company
                      </label>
                      <input
                        type="text"
                        name="parentCompany"
                        value={formData.parentCompany}
                        onChange={handleInputChange}
                        placeholder="Global Holdings Ltd."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Broker Code
                      </label>
                      <input
                        type="text"
                        name="brokerCode"
                        value={formData.brokerCode}
                        onChange={handleInputChange}
                        placeholder="B56001"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Brokerage %
                      </label>
                      <input
                        type="text"
                        name="brokerage"
                        value={formData.brokerage}
                        onChange={handleInputChange}
                        placeholder="5.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedTenant(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "Contacts" && (
              <div>
                <h2 className="text-lg font-semibold mb-6">
                  Contact Hierarchy
                </h2>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Primary Contact
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={primaryContact.name}
                          onChange={(e) =>
                            setPrimaryContact({
                              ...primaryContact,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={primaryContact.designation}
                          onChange={(e) =>
                            setPrimaryContact({
                              ...primaryContact,
                              designation: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Mobile
                        </label>
                        <input
                          type="text"
                          value={primaryContact.phone}
                          onChange={(e) =>
                            setPrimaryContact({
                              ...primaryContact,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter mobile"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={primaryContact.email}
                          onChange={(e) =>
                            setPrimaryContact({
                              ...primaryContact,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Finance Contact (Optional)
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={financeContact.name}
                          onChange={(e) =>
                            setFinanceContact({
                              ...financeContact,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Mobile
                        </label>
                        <input
                          type="text"
                          value={financeContact.phone}
                          onChange={(e) =>
                            setFinanceContact({
                              ...financeContact,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter mobile"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={financeContact.email}
                          onChange={(e) =>
                            setFinanceContact({
                              ...financeContact,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Operations Contact
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={operationsContact.name}
                          onChange={(e) =>
                            setOperationsContact({
                              ...operationsContact,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={operationsContact.designation}
                          onChange={(e) =>
                            setOperationsContact({
                              ...operationsContact,
                              designation: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter designation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Mobile
                        </label>
                        <input
                          type="text"
                          value={operationsContact.phone}
                          onChange={(e) =>
                            setOperationsContact({
                              ...operationsContact,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter mobile"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={operationsContact.email}
                          onChange={(e) =>
                            setOperationsContact({
                              ...operationsContact,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      Secondary / Alternate Contacts (Escalation Path)
                    </h3>
                    <button
                      onClick={() => setShowAddSecondaryContact(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Contact
                    </button>
                  </div>

                  {showAddSecondaryContact && (
                    <div className="mb-4 p-4 border border-blue-200 rounded bg-blue-50">
                      <div className="grid grid-cols-5 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          value={newSecondaryContact.name}
                          onChange={(e) =>
                            setNewSecondaryContact({
                              ...newSecondaryContact,
                              name: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={newSecondaryContact.role}
                          onChange={(e) =>
                            setNewSecondaryContact({
                              ...newSecondaryContact,
                              role: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select Role</option>
                          {contactRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="email"
                          placeholder="Email"
                          value={newSecondaryContact.email}
                          onChange={(e) =>
                            setNewSecondaryContact({
                              ...newSecondaryContact,
                              email: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Phone"
                          value={newSecondaryContact.phone}
                          onChange={(e) =>
                            setNewSecondaryContact({
                              ...newSecondaryContact,
                              phone: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSecondaryContact}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setShowAddSecondaryContact(false);
                              setNewSecondaryContact({
                                name: "",
                                role: "",
                                email: "",
                                phone: "",
                                escalation_level: 1,
                              });
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Contact Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Mobile
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Escalation Level
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Active
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {secondaryContacts && secondaryContacts.length > 0 ? (
                          secondaryContacts.map((contact, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 bg-white">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {contact.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {contactRoles.find((r) => r.id === contact.role)
                                  ?.label || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {contact.email}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {contact.phone}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                L{contact.escalation_level || 1}
                              </td>
                              <td className="px-4 py-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={contact.is_enabled}
                                    onChange={() =>
                                      handleToggleContactActive(
                                        contact.id,
                                        contact.is_enabled
                                      )
                                    }
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-gray-500 text-sm"
                            >
                              No secondary contacts found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Communication Preferences
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select how this tenant prefers to receive notifications and
                    reminders.
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={preferences?.prefer_email ?? true}
                        onChange={(e) =>
                          handleUpdatePreference(
                            "prefer_email",
                            e.target.checked
                          )
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={preferences?.prefer_sms ?? true}
                        onChange={(e) =>
                          handleUpdatePreference("prefer_sms", e.target.checked)
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">SMS</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={preferences?.prefer_portal ?? true}
                        onChange={(e) =>
                          handleUpdatePreference(
                            "prefer_portal",
                            e.target.checked
                          )
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Tenant Portal
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={preferences?.prefer_whatsapp ?? false}
                        onChange={(e) =>
                          handleUpdatePreference(
                            "prefer_whatsapp",
                            e.target.checked
                          )
                        }
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        WhatsApp
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedTenant(null);
                    }}
                    className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContacts}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "KYC" && (
              <div>
                <h2 className="text-lg font-semibold mb-6">KYC & Documents</h2>

                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                      <option>All Statuses</option>
                      <option>Verified</option>
                      <option>Pending</option>
                      <option>Expired</option>
                      <option>Outdated</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                      <option>All Types</option>
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Document Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Uploaded File Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Uploaded On
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {documents && documents.length > 0 ? (
                          documents.map((doc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 bg-white">
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {doc.doc_type}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {doc.title}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {doc.uploaded_at
                                  ? new Date(
                                      doc.uploaded_at
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm font-medium ${getDocumentStatusColor(
                                    doc.status
                                  )}`}
                                >
                                  {doc.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="p-1 text-gray-600 hover:text-blue-600"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 text-gray-600 hover:text-blue-600"
                                  >
                                    <Download size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1 text-gray-600 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-gray-500 text-sm"
                            >
                              No documents found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Upload New Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Document Type
                        </label>
                        <select
                          value={docForm.doc_type}
                          onChange={(e) =>
                            setDocForm({ ...docForm, doc_type: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        >
                          <option value="INC_CERT">
                            Incorporation Certificate
                          </option>
                          <option value="GST_CERT">GST Certificate</option>
                          <option value="PAN_COPY">PAN Copy</option>
                          <option value="AUDITED_FIN">
                            Audited Financials
                          </option>
                          <option value="BOARD_RES">Board Resolution</option>
                          <option value="LEASE_AGR">Lease Agreement</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={docForm.title}
                          onChange={(e) =>
                            setDocForm({ ...docForm, title: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Document title"
                        />
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                          {selectedFile
                            ? selectedFile.name
                            : "Drag & drop files here or"}
                        </p>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 cursor-pointer inline-block"
                        >
                          Browse Files
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Compliance Notes
                      </label>
                      <textarea
                        rows="6"
                        placeholder="Add any specific compliance comments or notes here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleUploadDocument}
                      disabled={loading || !selectedFile}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? "Uploading..." : "Upload Documents"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Communication" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Communication Log</h2>
                  <button
                    onClick={() => setShowCommunicationModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Mail size={16} />
                    Log New Communication
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Date Range
                      </label>
                      <input
                        type="text"
                        defaultValue="Nov 08, 2025 - Dec 08, 2025"
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                        <option>All Types</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tag
                      </label>
                      <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                        <option>All Tags</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                        <option>All Statuses</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Date & Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Recipient
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Sender
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Tags
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {communications && communications.length > 0 ? (
                        communications.map((comm, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 bg-white">
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {comm.occurred_at
                                ? new Date(comm.occurred_at).toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getCommunicationTypeIcon(comm.channel)}
                                <span className="text-sm text-gray-900">
                                  {comm.channel}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {comm.subject}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {comm.recipient}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {comm.sender}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {comm.tags &&
                                  comm.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-sm font-medium ${getCommunicationStatusColor(
                                  comm.status
                                )}`}
                              >
                                {comm.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className="p-1 text-gray-600 hover:text-blue-600"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-gray-500 text-sm"
                          >
                            No communications found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showCommunicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Log New Communication -{" "}
                {(selectedTenant || selectedTenantForTabs)?.legal_name ||
                  "Tenant"}
              </h3>
              <button
                onClick={() => setShowCommunicationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCommunication} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={commForm.occurred_at}
                  onChange={(e) =>
                    setCommForm({ ...commForm, occurred_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Type
                </label>
                <select
                  value={commForm.channel}
                  onChange={(e) =>
                    setCommForm({ ...commForm, channel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EMAIL">Email</option>
                  <option value="CALL">Call</option>
                  <option value="NOTICE">Notice</option>
                  <option value="LETTER">Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient
                </label>
                <input
                  type="text"
                  value={commForm.recipient}
                  onChange={(e) =>
                    setCommForm({ ...commForm, recipient: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="recipient@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sender
                </label>
                <input
                  type="text"
                  value={commForm.sender}
                  onChange={(e) =>
                    setCommForm({ ...commForm, sender: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sender@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={commForm.subject}
                  onChange={(e) =>
                    setCommForm({ ...commForm, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject line"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  rows="4"
                  value={commForm.message}
                  onChange={(e) =>
                    setCommForm({ ...commForm, message: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter message content..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {commForm.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag (e.g., Escalation)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={commForm.status}
                  onChange={(e) =>
                    setCommForm({ ...commForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="SENT">Sent</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="READ">Read</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCommunicationModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Saving..." : "Save Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;
