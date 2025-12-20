
// services/api.js
import axios from "axios";

// const BASE_URL = "http://127.0.0.1:8000"; // Service on 8000
// const TENANT_BASE_URL = "http://127.0.0.1:8001";// Lease service on 8001 (Tenant APIs live here)


const BASE_URL = "http://192.168.1.25:8000"; // Service on 8000
const TENANT_BASE_URL = "http://192.168.1.25:8001";// Lease service on 8001 (Tenant APIs live here)





// Helper function to get stored tokens
const getTokens = () => {
  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  return { accessToken, refreshToken };
};

// Helper function to set tokens
const setTokens = (access, refresh) => {
  if (access) localStorage.setItem("accessToken", access);
  if (refresh) localStorage.setItem("refreshToken", refresh);
};

// Helper function to clear tokens
const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("scope_tree");
};

// Consistent error message extractor (keeps your current behavior stable)
const extractErrorMessage = (data, fallback) => {
  if (!data) return fallback || "Request failed";
  if (typeof data === "string") return data;
  return (
    data.message ||
    data.detail ||
    data.error ||
    fallback ||
    "Request failed"
  );
};

// API request helper (BASE_URL: 8000)
const apiRequest = async (endpoint, options = {}) => {
  const { accessToken } = getTokens();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) throw new Error(response.statusText || "Request failed");
    return {};
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, response.statusText));
  }

  return data;
};

// Tenant API request helper (TENANT_BASE_URL: 8001)
const tenantApiRequest = async (endpoint, options = {}) => {
  const { accessToken } = getTokens();

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${TENANT_BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) throw new Error(response.statusText || "Request failed");
    return {};
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, response.statusText));
  }

  return data;
};

// ✅ Axios instance ONLY for tenant service (8001)
// (Added without disturbing your existing fetch helpers)
const axiosInstance = axios.create({
  baseURL: TENANT_BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Helper for multipart/form-data requests (file uploads) for tenant API
const tenantApiRequestMultipart = async (endpoint, formData) => {
  const { accessToken } = getTokens();

  const config = {
    method: "POST",
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: formData,
  };

  const response = await fetch(`${TENANT_BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) throw new Error(response.statusText || "Request failed");
    return {};
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, response.statusText));
  }

  return data;
};

// Authentication API functions (8000)
export const authAPI = {
  // ✅ Email/Password Login (no username)
  loginWithCredentials: async (email, password) => {
    const response = await apiRequest("/api/accounts/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.access && response.refresh) {
      setTokens(response.access, response.refresh);
    }

    if (response.user) {
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    if (response.scope_tree) {
      localStorage.setItem("scope_tree", JSON.stringify(response.scope_tree));
    }

    return response;
  },

  requestOTP: async (email) => {
    return apiRequest("/api/accounts/auth/request-otp/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyOTP: async (email, otp) => {
    const response = await apiRequest("/api/accounts/auth/verify-otp/", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });

    if (response.access && response.refresh) {
      setTokens(response.access, response.refresh);
    }

    if (response.user) {
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    if (response.scope_tree) {
      localStorage.setItem("scope_tree", JSON.stringify(response.scope_tree));
    }

    return response;
  },

  getProfile: async () => {
    return apiRequest("/api/accounts/auth/me/");
  },

  logout: () => {
    clearTokens();
  },

  isAuthenticated: () => {
    const { accessToken } = getTokens();
    return !!accessToken;
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getStoredScopeTree: () => {
    const scopeTreeStr = localStorage.getItem("scope_tree");
    return scopeTreeStr ? JSON.parse(scopeTreeStr) : null;
  },
};

// Setup API functions (8000)
export const setupAPI = {
  bootstrapProject: async (payload) => {
    return apiRequest("/api/setup/projects/bootstrap/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAllSites: async () => {
    const response = await apiRequest("/api/setup/sites");
    if (Array.isArray(response)) return response;
    if (response && response.results) return response.results;
    return response;
  },



  // Units table for site + unit_type (used by Lease allocations UI)
  getUnitsTable: async (siteId, unitType, page = 1, pageSize = 50) => {
    const response = await apiRequest(
      `/api/setup/sites/${siteId}/unit-table/?unit_type=${unitType}&page=${page}&page_size=${pageSize}`
    );
    if (Array.isArray(response)) return response;
    if (response && response.results) return response.results;
    return response;
  },



  // ✅ Towers list (FE friendly)
  // GET /api/setup/towers/?site_id=10
  getTowers: async (siteId) => {
    const response = await apiRequest(`/api/setup/towers/?site_id=${siteId}`);
    if (Array.isArray(response)) return response;
    if (response && response.results) return response.results;
    return response;
  },

  // ✅ Floors list (FE friendly)
  // GET /api/setup/floors/?tower_id=9
  getFloors: async (towerId) => {
    const response = await apiRequest(`/api/setup/floors/?tower_id=${towerId}`);
    if (Array.isArray(response)) return response;
    if (response && response.results) return response.results;
    return response;
  },

  // ✅ Create Floor
  // POST /api/setup/floors/
  createFloor: async (payload) => {
    return apiRequest(`/api/setup/floors/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ Update Floor
  // PATCH /api/setup/floors/:id/
  updateFloor: async (id, payload) => {
    return apiRequest(`/api/setup/floors/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },




  getSitesByScope: async (scopeType, scopeId) => {
    const response = await apiRequest(
      `/api/setup/sites/by-scope/?scope_type=${scopeType}&scope_id=${scopeId}`
    );
    if (Array.isArray(response)) return response;
    if (response && response.results) return response.results;
    return response;
  },
};

// Tenant API functions (TENANT_BASE_URL - 8001) ✅ NO "lease" in path, only /api/tenants/...
export const tenantAPI = {
  // Companies
  getTenantsDirectory: async (orgId, page = 1, pageSize = 10) => {
    return tenantApiRequest(
      `/api/tenants/companies/directory/?org_id=${orgId}&page=${page}&page_size=${pageSize}`
    );
  },

  getTenant: async (id) => {
    return tenantApiRequest(`/api/tenants/companies/${id}/`);
  },

  // createTenant: async (payload) => {
  //   return tenantApiRequest("/api/tenants/companies/", {
  //     method: "POST",
  //     body: JSON.stringify(payload),
  //   });
  // },
  createTenant: async (payload) => {
  // Normalize org key -> org_id (backend requires org_id)
  const org_id =
    payload?.org_id ?? payload?.org ?? payload?.orgId ?? payload?.organization_id ?? null;

  const clean = { ...payload, org_id };

  // (optional) remove aliases so backend doesn't get extra keys
  delete clean.org;
  delete clean.orgId;
  delete clean.organization_id;

  return tenantApiRequest("/api/tenants/companies/", {
    method: "POST",
    body: JSON.stringify(clean),
  });
},


  // ✅ Updated to axiosInstance.patch (as you asked) + keeps /api/tenants path
  updateTenant: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/companies/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  deleteTenant: async (id) => {
    return tenantApiRequest(`/api/tenants/companies/${id}/`, {
      method: "DELETE",
    });
  },

  // Contact Roles
  getContactRoles: async () => {
    return tenantApiRequest("/api/tenants/contact-roles/");
  },

  createContactRole: async (payload) => {
    return tenantApiRequest("/api/tenants/contact-roles/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateContactRole: async (id, payload) => {
    return tenantApiRequest(`/api/tenants/contact-roles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteContactRole: async (id) => {
    return tenantApiRequest(`/api/tenants/contact-roles/${id}/`, {
      method: "DELETE",
    });
  },

  // Contacts
  getContacts: async (tenantId) => {
    return tenantApiRequest(`/api/tenants/contacts/?tenant_id=${tenantId}`);
  },

  createContact: async (payload) => {
    return tenantApiRequest("/api/tenants/contacts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ axios PATCH
  updateContact: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/contacts/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  deleteContact: async (id) => {
    return tenantApiRequest(`/api/tenants/contacts/${id}/`, {
      method: "DELETE",
    });
  },

  // Communication Preferences
  getPreferences: async (tenantId) => {
    return tenantApiRequest(`/api/tenants/preferences/?tenant_id=${tenantId}`);
  },

  createPreferences: async (payload) => {
    return tenantApiRequest("/api/tenants/preferences/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ axios PATCH
  updatePreferences: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/preferences/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  // KYC
  getKYC: async (tenantId) => {
    return tenantApiRequest(`/api/tenants/kyc/?tenant_id=${tenantId}`);
  },

  createKYC: async (payload) => {
    return tenantApiRequest("/api/tenants/kyc/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ axios PATCH
  updateKYC: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/kyc/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  // Documents
  getDocuments: async (tenantId) => {
    return tenantApiRequest(`/api/tenants/documents/?tenant_id=${tenantId}`);
  },

  uploadDocument: async (formData) => {
    return tenantApiRequestMultipart("/api/tenants/documents/", formData);
  },

  // ✅ axios PATCH
  updateDocument: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/documents/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  deleteDocument: async (id) => {
    return tenantApiRequest(`/api/tenants/documents/${id}/`, {
      method: "DELETE",
    });
  },

  // Communications
  getCommunications: async (tenantId, filters = {}) => {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (filters.status) params.append("status", filters.status);
    if (filters.channel) params.append("channel", filters.channel);
    return tenantApiRequest(`/api/tenants/communications/?${params.toString()}`);
  },

  createCommunication: async (payload) => {
    return tenantApiRequest("/api/tenants/communications/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ axios PATCH
  updateCommunication: (id, payload) =>
    axiosInstance
      .patch(`/api/tenants/communications/${id}/`, payload)
      .then((r) => r.data)
      .catch((err) => {
        throw new Error(
          extractErrorMessage(err?.response?.data, err?.message || "Request failed")
        );
      }),

  deleteCommunication: async (id) => {
    return tenantApiRequest(`/api/tenants/communications/${id}/`, {
      method: "DELETE",
    });
  },
};


const LEASE_DOC_PATHS = ["/api/leases/documents/", "/api/lease/documents/"];

const tryLeaseDocPaths = async (fn) => {
  let lastErr = null;

  for (const basePath of LEASE_DOC_PATHS) {
    try {
      return await fn(basePath);
    } catch (err) {
      const status = err?.response?.status;

      // if endpoint not found, try next
      if (status === 404) {
        lastErr = err;
        continue;
      }

      throw new Error(
        extractErrorMessage(err?.response?.data, err?.message || "Request failed")
      );
    }
  }

  throw new Error(
    "Lease documents API endpoint not found. Tried: " + LEASE_DOC_PATHS.join(" , ")
  );
};




// Lease APIs (TENANT_BASE_URL - 8001)
export const leaseAPI = {
  // Bundle create (DRAFT / ACTIVE)
  createLeaseBundle: async (payload) => {
    return tenantApiRequest("/api/leases/agreements/bundle/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
getAvailabilityTree: async (siteId, includeIds = 1) => {
  return tenantApiRequest(
    `/api/leases/availability/tree/?site_id=${siteId}&include_ids=${includeIds ? 1 : 0}`,
    { method: "GET" }
  );
},

// ✅ Final Submit (NEW)
submitAgreement: async (payload) => {
  return tenantApiRequest(`/api/leases/agreements/submit/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
},
  // ✅ Update rules of a lease (tries common payload shapes)
updateLeaseRules: async (leaseDbId, rules) => {
  const tries = [
    { rules },                 // most common
    { terms: { rules } },      // if backend stores inside terms
    { rules_json: rules },     // fallback
  ];

  let lastErr = null;

  for (const payload of tries) {
    try {
      const resp = await axiosInstance.patch(
        `/api/leases/agreements/${leaseDbId}/bundle/`,
        payload
      );
      return resp.data;
    } catch (err) {
      lastErr = err;
      // try next shape only for validation errors
      const status = err?.response?.status;
      if (status && status !== 400) break;
    }
  }

  throw new Error(
    extractErrorMessage(
      lastErr?.response?.data,
      lastErr?.message || "Failed to update lease rules"
    )
  );
},


  // Bundle update
  updateLeaseBundle: async (leaseDbId, payload) => {
    return tenantApiRequest(`/api/leases/agreements/${leaseDbId}/bundle/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Read
  getLeaseDetail: async (leaseDbId) => {
    return tenantApiRequest(`/api/leases/agreements/${leaseDbId}/`);
  },

  listAllocations: async (leaseDbId) => {
    const resp = await tenantApiRequest(`/api/leases/allocations/?lease=${leaseDbId}`);
    if (Array.isArray(resp)) return resp;
    if (resp && resp.results) return resp.results;
    return resp;
  },
  listAgreements: (params = {}) =>
    axiosInstance.get(`/api/leases/agreements/`, { params }).then((r) => r.data),

  deleteAgreement: (id) =>
    axiosInstance.delete(`/api/leases/agreements/${id}/`).then((r) => r.data),

  // listDocuments: async (leaseDbId) => {
  //   const resp = await tenantApiRequest(`/api/leases/documents/?lease_id=${leaseDbId}`);
  //   if (Array.isArray(resp)) return resp;
  //   if (resp && resp.results) return resp.results;
  //   return resp;
  // },
    // ✅ A) Tenants leased summary (count + list)
  getLeasedTenantsSummary: async (orgId, filters = {}) => {
    // filters: { q: "global", as_of: "2025-12-18" }
    const params = new URLSearchParams();
    params.set("org_id", String(orgId));
    if (filters.q) params.set("q", String(filters.q));
    if (filters.as_of) params.set("as_of", String(filters.as_of));

    return tenantApiRequest(
      `/api/tenants/companies/leased-summary/?${params.toString()}`,
      { method: "GET" }
    );
  },

  // ✅ B) Tenant leases + rules (billing/ar/ageing)
  getTenantLeasesRules: async (tenantId, active = 1) => {
    return tenantApiRequest(
      `/api/tenants/companies/${tenantId}/leases-rules/?active=${active ? 1 : 0}`,
      { method: "GET" }
    );
  },

// ✅ Lease Documents (dynamic route support)
listDocuments: async (leaseDbId) => {
  return tryLeaseDocPaths(async (basePath) => {
    const resp = await axiosInstance.get(basePath, { params: { lease_id: leaseDbId } });
    return resp.data;
  });
},

uploadLeaseDocument: async (formData) => {
  // axios handles FormData well; don't set Content-Type manually
  return tryLeaseDocPaths(async (basePath) => {
    const resp = await axiosInstance.post(basePath, formData);
    return resp.data;
  });
},

createLeaseDocument: async (payload) => {
  // JSON create (supports file_url, meta, etc)
  return tryLeaseDocPaths(async (basePath) => {
    const resp = await axiosInstance.post(basePath, payload);
    return resp.data;
  });
},

updateLeaseDocument: async (docId, payload) => {
  // PATCH meta approvals etc
  return tryLeaseDocPaths(async (basePath) => {
    const resp = await axiosInstance.patch(`${basePath}${docId}/`, payload);
    return resp.data;
  });
},

deleteLeaseDocument: async (docId) => {
  return tryLeaseDocPaths(async (basePath) => {
    const resp = await axiosInstance.delete(`${basePath}${docId}/`);
    return resp.data;
  });
},

  // Upload doc (multipart)
  // uploadLeaseDocument: async (formData) => {
  //   return tenantApiRequestMultipart("/api/leases/documents/", formData);
  // },
};


// ✅ Billing APIs (TENANT_BASE_URL - 8001) using axiosInstance
// ✅ Billing APIs (TENANT_BASE_URL - 8001) using axiosInstance
export const billingAPI = {
  // 1) CAM preview/generate (same endpoint; dry_run decides)
  camGenerate: (payload) =>
    axiosInstance.post(`/api/billing/cam/generate/`, payload).then((r) => r.data),

  // 2) List invoices (✅ add defaults so dropdowns don't look empty)
  listInvoices: (params = {}) =>
    axiosInstance
      .get(`/api/billing/invoices/`, {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 500, // ✅ important
          ...params,
        },
      })
      .then((r) => r.data),

      // ✅ AR Overview
getARList: (params = {}) =>
  axiosInstance
    .get(`/api/billing/tenants/ar-list/`, { params })
    .then((r) => r.data),

// ✅ Tenant drilldown activity
getTenantActivity: (params = {}) =>
  axiosInstance
    .get(`/api/billing/tenants/activity/`, { params })
    .then((r) => r.data),



      receiveAndAllocate: (payload) =>
    axiosInstance.post("/payments/receive-and-allocate/", payload).then((r) => r.data),


  // 3) Issue bulk invoices
  issueBulkInvoices: (payload) =>
    axiosInstance.post(`/api/billing/invoices/issue-bulk/`, payload).then((r) => r.data),

  // 4) Issue single invoice
  issueInvoice: (invoiceId, payload) =>
    axiosInstance.post(`/api/billing/${invoiceId}/invoices/issue/`, payload).then((r) => r.data),

  // 5) Patch invoice (DRAFT only)
  patchInvoice: (invoiceId, payload) =>
    axiosInstance.patch(`/api/billing/${invoiceId}/invoices/`, payload).then((r) => r.data),

  // 6) Patch invoice line (DRAFT only)
  patchInvoiceLine: (invoiceLineId, payload) =>
    axiosInstance.patch(`/api/billing/${invoiceLineId}/invoice-lines/`, payload).then((r) => r.data),

  // 7) Create payment
  createPayment: (payload) =>
    axiosInstance.post(`/api/billing/payments/`, payload).then((r) => r.data),

  // 8) Allocate payment
  allocatePayment: (paymentId, payload) =>
    axiosInstance.post(`/api/billing/${paymentId}/payments/allocate/`, payload).then((r) => r.data),

  // 9) Mixed API
  receiveAndAllocatePayment: (payload) =>
    axiosInstance.post(`/api/billing/payments/receive-and-allocate/`, payload).then((r) => r.data),

  // 10) AR summary
  tenantARSummary: (tenantId) =>
    axiosInstance.get(`/api/billing/tenants/ar-summary/`, { params: { tenant_id: tenantId } }).then((r) => r.data),




// services/api.js (inside billingAPI)

// listInvoices: (params = {}) =>
//   axiosInstance
//     .get(`/api/billing/invoices/`, { params })
//     .then((r) => r.data),

// issueBulkInvoices: (payload) =>
//   axiosInstance
//     .post(`/api/billing/invoices/issue-bulk/`, payload)
//     .then((r) => r.data),

// issueInvoice: (invoiceId, payload) =>
//   axiosInstance
//     .post(`/api/billing/${invoiceId}/invoices/issue/`, payload)
//     .then((r) => r.data),

patchInvoice: (invoiceId, payload) =>
  axiosInstance
    .patch(`/api/billing/${invoiceId}/invoices/`, payload)
    .then((r) => r.data),

patchInvoiceLine: (invoiceLineId, payload) =>
  axiosInstance
    .patch(`/api/billing/${invoiceLineId}/invoice-lines/`, payload)
    .then((r) => r.data),

receiveAndAllocatePayment: (payload) =>
  axiosInstance
    .post(`/api/billing/payments/receive-and-allocate/`, payload)
    .then((r) => r.data),





};






// Clause APIs (TENANT_BASE_URL - 8001)
// Clause APIs (TENANT_BASE_URL - 8001)
export const clauseAPI = {
  /* A) Categories */
  listCategories: async (params = {}) => {
    // params: { org_id: 1 } (optional)
    // NOTE: if backend lists global + org automatically, org_id can be omitted.
    return tenantApiRequest(`/api/clauses/categories/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  },

  createCategory: async (payload) => {
    // { org_id, code, label, sort_order }
    return tenantApiRequest(`/api/clauses/categories/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /* B) Clause create (Clause + v1.0) */
  createClause: async (payload) => {
    return tenantApiRequest(`/api/clauses/clauses/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /* List clauses (for table later) */
  listClauses: async (page = 1, pageSize = 50) => {
    return tenantApiRequest(
      `/api/clauses/clauses/?page=${page}&page_size=${pageSize}`,
      { method: "GET" }
    );
  },

  /* C) Clause versions */
  listClauseVersions: async (clauseId) => {
    return tenantApiRequest(`/api/clauses/clauses/${clauseId}/versions/`, {
      method: "GET",
    });
  },

  bumpClauseVersion: async (clauseId, payload) => {
    // { bump: "MINOR"|"MAJOR", change_summary, config }
    return tenantApiRequest(`/api/clauses/clauses/${clauseId}/bump-version/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  setClauseCurrentVersion: async (clauseId, payload) => {
    // { version_id: 15 }
    return tenantApiRequest(`/api/clauses/clauses/${clauseId}/set-current/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /* D) Document library */
  listClauseDocuments: async (params = {}) => {
    // if your backend supports filters like org_id, pass via query params later
    return tenantApiRequest(`/api/clauses/documents/`, { method: "GET" });
  },

  uploadClauseDocument: async (formData) => {
    // multipart: org_id, name, doc_type, file
    return tenantApiRequestMultipart(`/api/clauses/documents/`, formData);
  },

  linkDocumentToClause: async (payload) => {
    // { document: 3, clause: 10 }
    return tenantApiRequest(`/api/clauses/document-links/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /* E) Map clause to lease */
  mapLeaseClauseSingle: async (payload) => {
    // { lease_id, clause, is_included, override_text, override_data }
    return tenantApiRequest(`/api/clauses/lease-clauses/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  bulkMapClausesToLease: async (leaseDbId, items = []) => {
    // { lease_id, items:[...] }
    return tenantApiRequest(`/api/clauses/lease-clauses/bulk/`, {
      method: "POST",
      body: JSON.stringify({ lease_id: leaseDbId, items }),
    });
  },

  listLeaseClauses: async (leaseId) => {
    return tenantApiRequest(`/api/clauses/lease-clauses/?lease_id=${leaseId}`, {
      method: "GET",
    });
  },

  upgradeLeaseClause: async (leaseClauseId, payload) => {
    // { to: "CURRENT" } OR { to:"VERSION", version_id: 22 }
    return tenantApiRequest(`/api/clauses/lease-clauses/${leaseClauseId}/upgrade/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};






export default apiRequest;

