// import React, { useState } from 'react';
// import { MoreVertical, Edit2, Copy, Trash2, Search, Filter, Plus } from 'lucide-react';
// import LegalOperationalClausesPage from './LegalOperationalClausesPage';

// const ClauseListPage = () => {
//   const [selectedClauses, setSelectedClauses] = useState([]);
//   const [showClauseDetail, setShowClauseDetail] = useState(false);
//   const [selectedClauseId, setSelectedClauseId] = useState(null);
//   const [openActionMenu, setOpenActionMenu] = useState(null);

//   const [clauses, setClauses] = useState([
//     {
//       id: 'CL001',
//       title: 'Monthly Rent Payment Schedule',
//       category: 'Financial',
//       appliesTo: 'Lease ID: A101',
//       status: 'Active',
//       lastModified: '2023-10-26 10:30 AM',
//       owner: { name: 'Alice Johnson', avatar: '👤' }
//     },
//     {
//       id: 'CL002',
//       title: 'Property Maintenance Responsibilities',
//       category: 'Maintenance',
//       appliesTo: 'Template: Standard Residential',
//       status: 'Draft',
//       lastModified: '2023-11-01 02:15 PM',
//       owner: { name: 'Bob Smith', avatar: '👤' }
//     },
//     {
//       id: 'CL003',
//       title: 'Pet Policy and Deposit Terms',
//       category: 'Compliance',
//       appliesTo: 'Lease ID: BZ05',
//       status: 'Active',
//       lastModified: '2023-09-15 09:00 AM',
//       owner: { name: 'Charlie Davis', avatar: '👤' }
//     },
//     {
//       id: 'CL004',
//       title: 'Early Termination Clause',
//       category: 'Rental Agreement',
//       appliesTo: 'Template: Commercial Lease',
//       status: 'Active',
//       lastModified: '2023-10-05 11:45 AM',
//       owner: { name: 'Diana Prince', avatar: '👤' }
//     },
//     {
//       id: 'CL005',
//       title: 'Utilities and Service Charges',
//       category: 'Financial',
//       appliesTo: 'Lease ID: C310',
//       status: 'Draft',
//       lastModified: '2023-11-10 03:00 PM',
//       owner: { name: 'Ethan Hunt', avatar: '👤' }
//     },
//     {
//       id: 'CL006',
//       title: 'Tenant Improvement Allowance',
//       category: 'Financial',
//       appliesTo: 'Template: Office Space',
//       status: 'Active',
//       lastModified: '2023-08-20 01:00 PM',
//       owner: { name: 'Fiona Glenn', avatar: '👤' }
//     },
//     {
//       id: 'CL007',
//       title: 'Force Majeure Event Clause',
//       category: 'Compliance',
//       appliesTo: 'Lease ID: D420',
//       status: 'Archived',
//       lastModified: '2023-07-01 04:30 PM',
//       owner: { name: 'George Lucas', avatar: '👤' }
//     }
//   ]);

//   const getCategoryColor = (category) => {
//     const colors = {
//       'Financial': 'bg-blue-100 text-blue-700',
//       'Maintenance': 'bg-pink-100 text-pink-700',
//       'Compliance': 'bg-gray-100 text-gray-700',
//       'Rental Agreement': 'bg-purple-100 text-purple-700'
//     };
//     return colors[category] || 'bg-gray-100 text-gray-700';
//   };

//   const getStatusColor = (status) => {
//     const colors = {
//       'Active': 'bg-green-100 text-green-700',
//       'Draft': 'bg-yellow-100 text-yellow-700',
//       'Archived': 'bg-red-100 text-red-700'
//     };
//     return colors[status] || 'bg-gray-100 text-gray-700';
//   };

//   const handleSelectClause = (clauseId) => {
//     setSelectedClauses(prev => 
//       prev.includes(clauseId) 
//         ? prev.filter(id => id !== clauseId)
//         : [...prev, clauseId]
//     );
//   };

//   const handleSelectAll = () => {
//     if (selectedClauses.length === clauses.length) {
//       setSelectedClauses([]);
//     } else {
//       setSelectedClauses(clauses.map(c => c.id));
//     }
//   };

//   const handleEdit = (clauseId) => {
//     setSelectedClauseId(clauseId);
//     setShowClauseDetail(true);
//     setOpenActionMenu(null);
//   };

//   const handleDuplicate = (clauseId) => {
//     console.log('Duplicating clause:', clauseId);
//     setOpenActionMenu(null);
//   };

//   const handleDelete = (clauseId) => {
//     if (confirm('Are you sure you want to delete this clause?')) {
//       setClauses(clauses.filter(c => c.id !== clauseId));
//     }
//     setOpenActionMenu(null);
//   };

//   const handleDeleteSelected = () => {
//     if (confirm(`Are you sure you want to delete ${selectedClauses.length} selected clause(s)?`)) {
//       setClauses(clauses.filter(c => !selectedClauses.includes(c.id)));
//       setSelectedClauses([]);
//     }
//   };

//   if (showClauseDetail) {
//     return <LegalOperationalClausesPage onClose={() => setShowClauseDetail(false)} clauseId={selectedClauseId} />;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-full mx-auto px-6 py-8">
//         <h1 className="text-2xl font-semibold mb-6">Clauses / Lease Terms List</h1>

//         {/* Filters & Actions */}
//         <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
//           <div className="flex items-center justify-between gap-4">
//             <div className="flex items-center gap-4 flex-1">
//               <div className="relative flex-1 max-w-md">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                 <input
//                   type="text"
//                   placeholder="Search clauses..."
//                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
//                 />
//               </div>
//               <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
//                 <Filter className="w-4 h-4" />
//                 Filter
//               </button>
//             </div>
//             <button 
//               onClick={() => setShowClauseDetail(true)}
//               className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
//             >
//               <Plus className="w-4 h-4" />
//               Add Clause
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 border-b border-gray-200">
//                 <tr>
//                   <th className="px-4 py-3 text-left w-12">
//                     <input 
//                       type="checkbox" 
//                       className="rounded"
//                       checked={selectedClauses.length === clauses.length}
//                       onChange={handleSelectAll}
//                     />
//                   </th>
//                   <th className="px-4 py-3 text-left w-20 text-xs font-medium text-gray-600">Actions</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Clause ID</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Clause Title</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Category</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Applies To</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Last Modified</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Owner</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {clauses.map((clause) => (
//                   <tr key={clause.id} className="hover:bg-gray-50">
//                     <td className="px-4 py-3">
//                       <input 
//                         type="checkbox" 
//                         className="rounded"
//                         checked={selectedClauses.includes(clause.id)}
//                         onChange={() => handleSelectClause(clause.id)}
//                       />
//                     </td>
//                     <td className="px-4 py-3 relative">
//                       <button
//                         onClick={() => setOpenActionMenu(openActionMenu === clause.id ? null : clause.id)}
//                         className="p-1 hover:bg-gray-100 rounded"
//                       >
//                         <MoreVertical className="w-4 h-4 text-gray-600" />
//                       </button>
                      
//                       {openActionMenu === clause.id && (
//                         <div className="absolute left-12 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
//                           <button
//                             onClick={() => handleEdit(clause.id)}
//                             className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <Edit2 className="w-4 h-4" />
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => handleDuplicate(clause.id)}
//                             className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
//                           >
//                             <Copy className="w-4 h-4" />
//                             Duplicate
//                           </button>
//                           <button
//                             onClick={() => handleDelete(clause.id)}
//                             className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
//                           >
//                             <Trash2 className="w-4 h-4" />
//                             Delete
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                     <td className="px-4 py-3 text-sm font-medium text-gray-800">{clause.id}</td>
//                     <td className="px-4 py-3 text-sm text-gray-800">{clause.title}</td>
//                     <td className="px-4 py-3">
//                       <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(clause.category)}`}>
//                         {clause.category}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{clause.appliesTo}</td>
//                     <td className="px-4 py-3">
//                       <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(clause.status)}`}>
//                         {clause.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{clause.lastModified}</td>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2">
//                         <span className="text-xl">{clause.owner.avatar}</span>
//                         <span className="text-sm text-gray-800">{clause.owner.name}</span>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Bottom Action Bar */}
//           {selectedClauses.length > 0 && (
//             <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-blue-50">
//               <div className="text-sm text-gray-700">
//                 Selected {selectedClauses.length} items
//               </div>
//               <div className="flex items-center gap-3">
//                 <button className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
//                   Export Selected
//                 </button>
//                 <button 
//                   onClick={handleDeleteSelected}
//                   className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
//                 >
//                   Delete Selected
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Pagination */}
//           <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
//             <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
//               Previous
//             </button>
//             <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
//             <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">2</button>
//             <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">3</button>
//             <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
//               Next
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ClauseListPage;



import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Edit2, Copy, Trash2, Search, Filter, Plus } from "lucide-react";
import LegalOperationalClausesPage from "./LegalOperationalClausesPage";
import { clauseAPI } from "../../services/api"; // ✅ adjust path if different

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const ClauseListPage = () => {
  const [selectedClauses, setSelectedClauses] = useState([]);
  const [showClauseDetail, setShowClauseDetail] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // API state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [count, setCount] = useState(0);
  const [clauses, setClauses] = useState([]);

  // categories (id -> label)
  const [categoriesMap, setCategoriesMap] = useState({});

  // filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const menuRef = useRef(null);

  const getCategoryColor = (categoryLabel) => {
    const colors = {
      Financial: "bg-blue-100 text-blue-700",
      Maintenance: "bg-pink-100 text-pink-700",
      Compliance: "bg-gray-100 text-gray-700",
      "Rental Agreement": "bg-purple-100 text-purple-700",
    };
    return colors[categoryLabel] || "bg-gray-100 text-gray-700";
  };

  const getStatusColor = (statusLabel) => {
    const colors = {
      Active: "bg-green-100 text-green-700",
      Draft: "bg-yellow-100 text-yellow-700",
      Archived: "bg-red-100 text-red-700",
      Inactive: "bg-gray-100 text-gray-700",
    };
    return colors[statusLabel] || "bg-gray-100 text-gray-700";
  };

  const normalizeClauseRow = (c) => {
    // backend fields can vary; handle safely
    const clauseId = c?.clause_id || c?.clauseId || c?.code || c?.id;
    const statusRaw = c?.status || c?.state || "DRAFT";
    const statusLabel = titleCase(statusRaw);

    // category can be id or object or label
    const catRaw = c?.category;
    let categoryLabel = "—";
    if (typeof catRaw === "string") categoryLabel = catRaw;
    else if (typeof catRaw === "number") categoryLabel = categoriesMap[catRaw] || `Category #${catRaw}`;
    else if (typeof catRaw === "object" && catRaw) categoryLabel = catRaw.label || catRaw.name || `Category #${catRaw.id ?? "—"}`;

    const appliesTo = titleCase(c?.applies_to || c?.appliesTo || "COMMERCIAL");

    const lastModified =
      c?.updated_at ||
      c?.modified_at ||
      c?.last_modified ||
      c?.lastModified ||
      "";

    const ownerName =
      c?.owner_name ||
      c?.created_by_name ||
      c?.created_by ||
      "—";

    return {
      _raw: c,
      id: String(clauseId ?? ""),
      title: c?.title || c?.name || "—",
      category: categoryLabel,
      appliesTo,
      status: statusLabel,
      lastModified: lastModified ? String(lastModified) : "—",
      owner: { name: ownerName, avatar: "👤" },
    };
  };

  const fetchCategories = async () => {
    try {
      const resp = await clauseAPI.listCategories();
      const list = Array.isArray(resp) ? resp : resp?.results || [];
      const map = {};
      list.forEach((x) => {
        if (x?.id != null) map[x.id] = x.label || x.name || String(x.id);
      });
      setCategoriesMap(map);
    } catch {
      // categories not mandatory for list
    }
  };

  const fetchClauses = async (pageNo) => {
    setLoading(true);
    setErr("");
    try {
      const resp = await clauseAPI.listClauses(pageNo, pageSize);

      const list = Array.isArray(resp) ? resp : resp?.results || [];
      const total = resp?.count ?? (Array.isArray(resp) ? resp.length : 0);

      setCount(Number(total || 0));
      setClauses(list);
      setSelectedClauses([]);
      setOpenActionMenu(null);
    } catch (e) {
      setErr(e?.message || "Failed to load clauses");
      setClauses([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchCategories();
      if (!mounted) return;
      await fetchClauses(1);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close action menu on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!openActionMenu) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openActionMenu]);

  const rows = useMemo(() => {
    const normalized = clauses.map(normalizeClauseRow);

    const q = searchQuery.trim().toLowerCase();
    let filtered = normalized;

    if (q) {
      filtered = filtered.filter(
        (x) =>
          x.id.toLowerCase().includes(q) ||
          x.title.toLowerCase().includes(q) ||
          String(x.category || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      const want = titleCase(statusFilter);
      filtered = filtered.filter((x) => x.status === want);
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clauses, categoriesMap, searchQuery, statusFilter]);

  const handleSelectClause = (clauseId) => {
    setSelectedClauses((prev) =>
      prev.includes(clauseId)
        ? prev.filter((id) => id !== clauseId)
        : [...prev, clauseId]
    );
  };

  const handleSelectAll = () => {
    const ids = rows.map((c) => c.id);
    if (selectedClauses.length === ids.length) setSelectedClauses([]);
    else setSelectedClauses(ids);
  };

  const handleEdit = (clauseId) => {
    setSelectedClauseId(clauseId);
    setShowClauseDetail(true);
    setOpenActionMenu(null);
  };

  const handleDuplicate = (clauseId) => {
    console.log("Duplicate clause:", clauseId);
    setOpenActionMenu(null);
    alert("Duplicate: next step me add karenge (API ready hai).");
  };

  const handleDelete = (clauseId) => {
    // delete API tumhare backend me typical hoga: DELETE /api/clauses/clauses/<id>/
    // abhi UI only:
    if (confirm("Are you sure you want to delete this clause?")) {
      setClauses((prev) => prev.filter((c) => String(c?.clause_id || c?.id) !== String(clauseId)));
      setSelectedClauses((prev) => prev.filter((x) => x !== clauseId));
    }
    setOpenActionMenu(null);
  };

  const handleDeleteSelected = () => {
    if (selectedClauses.length <= 0) return;
    if (confirm(`Are you sure you want to delete ${selectedClauses.length} selected clause(s)?`)) {
      setClauses((prev) =>
        prev.filter((c) => !selectedClauses.includes(String(c?.clause_id || c?.id)))
      );
      setSelectedClauses([]);
    }
  };

  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (showClauseDetail) {
    return (
      <LegalOperationalClausesPage
        onClose={() => setShowClauseDetail(false)}
        clauseId={selectedClauseId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Clauses / Lease Terms List</h1>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clauses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedClauseId(null);
                setShowClauseDetail(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Clause
            </button>
          </div>
        </div>

        {err ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {err}
          </div>
        ) : null}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={rows.length > 0 && selectedClauses.length === rows.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left w-20 text-xs font-medium text-gray-600">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Clause ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Clause Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Applies To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Last Modified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                    Owner
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      Loading clauses...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                      No clauses found.
                    </td>
                  </tr>
                ) : (
                  rows.map((clause) => (
                    <tr key={clause.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedClauses.includes(clause.id)}
                          onChange={() => handleSelectClause(clause.id)}
                        />
                      </td>

                      <td className="px-4 py-3 relative" ref={openActionMenu === clause.id ? menuRef : null}>
                        <button
                          onClick={() =>
                            setOpenActionMenu(openActionMenu === clause.id ? null : clause.id)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>

                        {openActionMenu === clause.id && (
                          <div className="absolute left-12 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <button
                              onClick={() => handleEdit(clause.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicate(clause.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(clause.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {clause.id}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-800">
                        {clause.title}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            clause.category
                          )}`}
                        >
                          {clause.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">{clause.appliesTo}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            clause.status
                          )}`}
                        >
                          {clause.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {clause.lastModified}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{clause.owner.avatar}</span>
                          <span className="text-sm text-gray-800">{clause.owner.name}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Bar */}
          {selectedClauses.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-blue-50">
              <div className="text-sm text-gray-700">Selected {selectedClauses.length} items</div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Export Selected
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages} • Total {count || 0}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={!canPrev || loading}
                onClick={async () => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  await fetchClauses(next);
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Previous
              </button>

              <button
                disabled={!canNext || loading}
                onClick={async () => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  await fetchClauses(next);
                }}
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

export default ClauseListPage;
