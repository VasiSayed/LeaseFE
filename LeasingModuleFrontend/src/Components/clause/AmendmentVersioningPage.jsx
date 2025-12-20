// import React, { useState } from 'react';
// import { FileText, Clock, User, Plus, Search } from 'lucide-react';

// const AmendmentVersioningPage = () => {
//   const [versions] = useState([
//     {
//       version: 'v3.0',
//       date: '2023-11-15 02:30 PM',
//       author: 'Alice Johnson',
//       changes: 'Updated renewal terms and added force majeure clause',
//       status: 'Current'
//     },
//     {
//       version: 'v2.1',
//       date: '2023-09-20 11:00 AM',
//       author: 'Bob Smith',
//       changes: 'Minor corrections to insurance requirements',
//       status: 'Archived'
//     },
//     {
//       version: 'v2.0',
//       date: '2023-08-10 09:15 AM',
//       author: 'Charlie Davis',
//       changes: 'Major revision - restructured termination clauses',
//       status: 'Archived'
//     },
//     {
//       version: 'v1.0',
//       date: '2023-06-01 10:00 AM',
//       author: 'Diana Prince',
//       changes: 'Initial version',
//       status: 'Archived'
//     }
//   ]);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto px-6 py-8">
//         <div className="mb-6 flex items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-semibold text-gray-800">Amendment & Versioning</h1>
//             <p className="text-sm text-gray-600 mt-1">Track changes and version history of lease clauses</p>
//           </div>
//           <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
//             <Plus className="w-4 h-4" />
//             Create Amendment
//           </button>
//         </div>

//         {/* Search & Filter */}
//         <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
//           <div className="relative max-w-md">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//             <input
//               type="text"
//               placeholder="Search versions..."
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
//             />
//           </div>
//         </div>

//         {/* Version Timeline */}
//         <div className="bg-white rounded-lg border border-gray-200 p-6">
//           <h2 className="text-lg font-semibold text-gray-800 mb-6">Version History</h2>
          
//           <div className="space-y-6">
//             {versions.map((version, index) => (
//               <div key={index} className="flex gap-4">
//                 {/* Timeline Line */}
//                 <div className="flex flex-col items-center">
//                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
//                     version.status === 'Current' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
//                   }`}>
//                     <FileText className="w-5 h-5" />
//                   </div>
//                   {index < versions.length - 1 && (
//                     <div className="w-0.5 h-full bg-gray-200 mt-2" style={{ minHeight: '40px' }}></div>
//                   )}
//                 </div>

//                 {/* Version Card */}
//                 <div className="flex-1 pb-6">
//                   <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
//                     <div className="flex items-start justify-between mb-3">
//                       <div>
//                         <div className="flex items-center gap-3">
//                           <h3 className="text-lg font-semibold text-gray-800">{version.version}</h3>
//                           {version.status === 'Current' && (
//                             <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
//                               Current
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
//                           <div className="flex items-center gap-1">
//                             <Clock className="w-4 h-4" />
//                             {version.date}
//                           </div>
//                           <div className="flex items-center gap-1">
//                             <User className="w-4 h-4" />
//                             {version.author}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex gap-2">
//                         <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-white">
//                           View
//                         </button>
//                         {version.status !== 'Current' && (
//                           <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-white">
//                             Restore
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                     <p className="text-sm text-gray-700">{version.changes}</p>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Amendment Summary */}
//         <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
//           <h2 className="text-lg font-semibold text-gray-800 mb-4">Amendment Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div className="text-center">
//               <div className="text-3xl font-bold text-blue-600 mb-2">4</div>
//               <div className="text-sm text-gray-600">Total Versions</div>
//             </div>
//             <div className="text-center">
//               <div className="text-3xl font-bold text-green-600 mb-2">1</div>
//               <div className="text-sm text-gray-600">Active Version</div>
//             </div>
//             <div className="text-center">
//               <div className="text-3xl font-bold text-gray-600 mb-2">3</div>
//               <div className="text-sm text-gray-600">Archived Versions</div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };












import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Clock,
  User,
  Plus,
  Search,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Trash2,
  Braces,
} from "lucide-react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { clauseAPI } from "../../services/api"; // ✅ same as yours

/* ---------------- helpers ---------------- */
const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
};

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const clone = (v) => {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
};

const pretty = (k) =>
  String(k)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const inferType = (v) => {
  if (Array.isArray(v)) return "array";
  if (isPlainObject(v)) return "object";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  return "string";
};

const setAtPath = (obj, path, value) => {
  const out = clone(obj || {});
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cur[key] = clone(cur[key]);
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
  return out;
};

const deleteAtPath = (obj, path) => {
  const out = clone(obj || {});
  let cur = out;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cur[key] = clone(cur[key]);
    cur = cur[key];
  }
  const last = path[path.length - 1];
  if (Array.isArray(cur)) cur.splice(Number(last), 1);
  else if (isPlainObject(cur)) delete cur[last];
  return out;
};

const makeEmptyLike = (sample) => {
  if (Array.isArray(sample)) return [];
  if (isPlainObject(sample)) {
    const o = {};
    Object.keys(sample).forEach((k) => (o[k] = makeEmptyLike(sample[k])));
    return o;
  }
  if (typeof sample === "boolean") return false;
  if (typeof sample === "number") return 0;
  return "";
};

const Badge = ({ children, tone = "gray" }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

/* ---------------- Dynamic JSON Renderer (NO PATHS BY DEFAULT) ---------------- */
const DynamicJsonForm = ({
  value,
  onChange,
  rootLabel = "Config",
  readOnly = false,
  showPaths = false, // ✅ IMPORTANT: keep false so "dispute dispute" etc. won't show
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [showJson, setShowJson] = useState(false);

  const jsonPreview = useMemo(() => JSON.stringify(value ?? {}, null, 2), [value]);

  const isCollapsed = (path) => !!collapsed[path.join(".")];
  const toggleCollapse = (path) => {
    const k = path.join(".");
    setCollapsed((p) => ({ ...p, [k]: !p[k] }));
  };

  const isPrimitive = (v) => {
    const t = inferType(v);
    return t === "string" || t === "number" || t === "boolean";
  };

  const sortedKeys = (obj) => {
    const keys = Object.keys(obj || {});
    // primitives first, then complex; then alphabetical
    return keys.sort((a, b) => {
      const ap = isPrimitive(obj[a]);
      const bp = isPrimitive(obj[b]);
      if (ap !== bp) return ap ? -1 : 1;
      return String(a).localeCompare(String(b));
    });
  };

  const LeafField = ({ node, path, label }) => {
    const t = inferType(node);
    const fieldId = path.join(".");
    const isLongText = typeof node === "string" && (node.length > 80 || node.includes("\n"));

    if (t === "boolean") {
      return (
        <div key={fieldId} className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 rounded border-gray-300"
            checked={!!node}
            disabled={readOnly}
            onChange={(e) => !readOnly && onChange(setAtPath(value, path, e.target.checked))}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">{label}</div>
            {showPaths ? <div className="text-[11px] text-gray-500 font-mono">{fieldId}</div> : null}
          </div>
        </div>
      );
    }

    return (
      <div key={fieldId} className="w-full">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {showPaths ? <div className="text-[11px] text-gray-500 font-mono mb-2">{fieldId}</div> : <div className="mb-2" />}

        {isLongText ? (
          <textarea
            rows={3}
            value={node ?? ""}
            disabled={readOnly}
            onChange={(e) => !readOnly && onChange(setAtPath(value, path, e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        ) : (
          <input
            type={t === "number" ? "number" : "text"}
            value={node ?? ""}
            disabled={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              const raw = e.target.value;
              let next = raw;
              if (t === "number") {
                const n = Number(raw);
                next = Number.isFinite(n) ? n : 0;
              }
              onChange(setAtPath(value, path, next));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        )}
      </div>
    );
  };

  const renderNode = (node, path, label) => {
    const t = inferType(node);

    // OBJECT
    if (t === "object") {
      const obj = isPlainObject(node) ? node : {};
      const keys = sortedKeys(obj);
      const collapsedNow = isCollapsed(path);

      const primitiveKeys = keys.filter((k) => isPrimitive(obj[k]));
      const complexKeys = keys.filter((k) => !isPrimitive(obj[k]));

      return (
        <div key={path.join(".") || "root"} className="border border-gray-200 rounded-lg bg-white">
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => toggleCollapse(path)}
          >
            <div className="flex items-center gap-2">
              {collapsedNow ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
              <div className="text-sm font-semibold text-gray-800">{label}</div>
              {/* ✅ DO NOT show raw key next to label */}
            </div>
            <div className="text-xs text-gray-500">{keys.length} fields</div>
          </button>

          {!collapsedNow && (
            <div className="p-4 space-y-5">
              {keys.length === 0 ? <div className="text-sm text-gray-500">Empty object.</div> : null}

              {/* primitives: clean 2-col grid */}
              {primitiveKeys.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {primitiveKeys.map((k) => (
                    <LeafField key={k} node={obj[k]} path={[...path, k]} label={pretty(k)} />
                  ))}
                </div>
              ) : null}

              {/* complex: full width stacked */}
              {complexKeys.length ? (
                <div className="space-y-4">
                  {complexKeys.map((k) => (
                    <div key={k} className="w-full">
                      {renderNode(obj[k], [...path, k], pretty(k))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      );
    }

    // ARRAY
    if (t === "array") {
      const arr = Array.isArray(node) ? node : [];
      const collapsedNow = isCollapsed(path);
      const sample = arr.length ? arr[0] : "";

      const addItem = () => {
        if (readOnly) return;
        onChange(setAtPath(value, path, [...arr, makeEmptyLike(sample)]));
      };

      return (
        <div key={path.join(".")} className="border border-gray-200 rounded-lg bg-white">
          <div className="px-3 py-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-2 hover:underline"
              onClick={() => toggleCollapse(path)}
            >
              {collapsedNow ? (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
              <div className="text-sm font-semibold text-gray-800">{label}</div>
              <span className="text-xs text-gray-500">({arr.length})</span>
              {/* ✅ no raw path here */}
            </button>

            {!readOnly ? (
              <button
                type="button"
                onClick={addItem}
                className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            ) : null}
          </div>

          {!collapsedNow && (
            <div className="p-4 space-y-4">
              {arr.length === 0 ? <div className="text-sm text-gray-500">No items.</div> : null}

              {arr.map((item, idx) => {
                const itemPath = [...path, idx];
                const itemType = inferType(item);

                return (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold text-gray-700">Item #{idx + 1}</div>

                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => onChange(deleteAtPath(value, itemPath))}
                          className="p-1 rounded border border-gray-200 hover:bg-white"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      ) : null}
                    </div>

                    {itemType === "object" || itemType === "array" ? (
                      renderNode(item, itemPath, `Item #${idx + 1}`)
                    ) : (
                      <LeafField node={item} path={itemPath} label="Value" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // PRIMITIVE (fallback)
    return <LeafField node={node} path={path} label={label} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">{rootLabel}</div>
        <button
          type="button"
          onClick={() => setShowJson((p) => !p)}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <Braces className="w-4 h-4" />
          {showJson ? "Hide JSON" : "Show JSON"}
        </button>
      </div>

      {renderNode(value ?? {}, [], rootLabel)}

      {showJson ? (
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-96">
          {jsonPreview}
        </pre>
      ) : null}
    </div>
  );
};

/* ---------------- Main Page ---------------- */
const AmendmentVersioningPage = ({ clausePk: clausePkProp, clauseId: clauseIdProp, onClose }) => {
  const params = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialClausePk = useMemo(() => {
    const fromProps = clausePkProp ?? clauseIdProp;

    const fromParams =
      params?.clausePk ?? params?.clauseId ?? params?.id ?? params?.pk ?? params?.clause_id;

    const fromQuery =
      searchParams.get("clausePk") ||
      searchParams.get("clause_pk") ||
      searchParams.get("clauseId") ||
      searchParams.get("id");

    const fromState =
      location?.state?.clausePk ??
      location?.state?.clauseId ??
      location?.state?.id ??
      location?.state?.pk;

    const v = fromProps ?? fromParams ?? fromQuery ?? fromState;
    return v != null && String(v).trim() !== "" ? String(v) : "";
  }, [clausePkProp, clauseIdProp, params, searchParams, location]);

  const [clausePk, setClausePk] = useState(initialClausePk);

  useEffect(() => {
    if (initialClausePk && initialClausePk !== clausePk) setClausePk(initialClausePk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClausePk]);

  /* ----- clause picker fallback ----- */
  const [clauses, setClauses] = useState([]);
  const [clauseSearch, setClauseSearch] = useState("");
  const [clauseListLoading, setClauseListLoading] = useState(false);
  const [clauseListError, setClauseListError] = useState("");

  const loadClauseList = async () => {
    setClauseListLoading(true);
    setClauseListError("");
    try {
      const resp = await clauseAPI.listClauses(1, 200);
      const list = Array.isArray(resp) ? resp : resp?.results || [];
      setClauses(list);
    } catch (e) {
      setClauses([]);
      setClauseListError(e?.message || "Failed to load clauses");
    } finally {
      setClauseListLoading(false);
    }
  };

  useEffect(() => {
    if (!clausePk) loadClauseList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clausePk]);

  const filteredClauses = useMemo(() => {
    const q = clauseSearch.trim().toLowerCase();
    if (!q) return clauses;
    return (clauses || []).filter((c) => {
      const a = String(c?.title || "").toLowerCase();
      const b = String(c?.clause_id || "").toLowerCase();
      const d = String(c?.id || "").toLowerCase();
      return a.includes(q) || b.includes(q) || d.includes(q);
    });
  }, [clauses, clauseSearch]);

  /* ----- versions ----- */
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");

  const loadVersions = async (pk) => {
    if (!pk) return;
    setLoading(true);
    setPageError("");
    try {
      const resp = await clauseAPI.listClauseVersions(pk);
      const list = Array.isArray(resp) ? resp : resp?.results || [];
      setVersions(list);
    } catch (e) {
      setVersions([]);
      setPageError(e?.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clausePk) loadVersions(clausePk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clausePk]);

  const normalized = useMemo(() => {
    return (versions || []).map((v) => ({
      raw: v,
      id: v.id,
      versionLabel: v?.version_number ? `v${v.version_number}` : "v—",
      isCurrent: !!v.is_current,
      author: String(v.created_by_user_id ?? "—"),
      date: v.created_at || v.updated_at || "",
      changes: v.change_summary || "—",
    }));
  }, [versions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((x) => {
      return (
        String(x.versionLabel).toLowerCase().includes(q) ||
        String(x.author).toLowerCase().includes(q) ||
        String(x.changes).toLowerCase().includes(q)
      );
    });
  }, [normalized, search]);

  const summary = useMemo(() => {
    const total = normalized.length;
    const active = normalized.filter((v) => v.isCurrent).length;
    return { total, active, archived: Math.max(0, total - active) };
  }, [normalized]);

  /* ---------------- MODAL STATE ---------------- */
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [form, setForm] = useState({
    bump: "MINOR",
    change_summary: "",
    body_text: "",
  });

  const [config, setConfig] = useState({});

  const openCreateModal = () => {
    setModalError("");
    const current = versions.find((v) => v.is_current) || versions[0] || null;
    const baseCfg = current?.config ? clone(current.config) : {};
    setForm({ bump: "MINOR", change_summary: "", body_text: "" });
    setConfig(baseCfg);
    setOpen(true);
  };

  // ✅ lock background scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ ESC close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleCreate = async () => {
    setModalError("");

    if (!clausePk) {
      setModalError("Please select a clause first.");
      return;
    }
    if (!form.change_summary?.trim()) {
      setModalError("change_summary is required");
      return;
    }
    if (!config || typeof config !== "object") {
      setModalError("Config is invalid.");
      return;
    }

    setSaving(true);
    try {
      await clauseAPI.bumpClauseVersion(clausePk, {
        bump: form.bump,
        change_summary: form.change_summary,
        body_text: form.body_text || "",
        config: config,
      });

      setOpen(false);
      await loadVersions(clausePk);
    } catch (e) {
      setModalError(e?.message || "Failed to create amendment");
    } finally {
      setSaving(false);
    }
  };

  /* -------- clause pk missing -> clause selector -------- */
  if (!clausePk) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onClose ? (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              ) : null}
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Amendment & Versioning</h1>
                <p className="text-sm text-gray-600 mt-1">Select a clause to load versions</p>
              </div>
            </div>

            <button
              onClick={loadClauseList}
              className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            {clauseListError ? (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {clauseListError}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Clause</label>
                <input
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                  placeholder="Search by title / clause_id / id..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="w-72">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Clause (DB id)</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setClausePk(v);
                  }}
                >
                  <option value="" disabled>
                    {clauseListLoading ? "Loading..." : "Choose clause..."}
                  </option>
                  {filteredClauses.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} • {c.clause_id} • {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Note: versions API needs clause <b>DB id</b> (example: 4), not clause_id (example: CL001).
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- PAGE UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose ? (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Amendment & Versioning</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track changes and version history (Clause PK:{" "}
                <span className="font-medium">{clausePk}</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadVersions(clausePk)}
              className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Amendment
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{pageError}</div>
        ) : null}

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search versions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Version History</h2>
            {loading ? <span className="text-sm text-gray-500">Loading...</span> : null}
          </div>

          <div className="space-y-6">
            {!loading && filtered.length === 0 ? <div className="text-sm text-gray-600">No versions found.</div> : null}

            {filtered.map((v, index) => (
              <div key={v.id || index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      v.isCurrent ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  {index < filtered.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" style={{ minHeight: "40px" }} />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-800">{v.versionLabel}</h3>
                          {v.isCurrent ? <Badge tone="green">Current</Badge> : <Badge>Archived</Badge>}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {fmtDate(v.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {v.author}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-white"
                          onClick={() => alert(JSON.stringify(v.raw, null, 2))}
                        >
                          View
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700">{v.changes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Amendment Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{summary.total}</div>
              <div className="text-sm text-gray-600">Total Versions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{summary.active}</div>
              <div className="text-sm text-gray-600">Active Version</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">{summary.archived}</div>
              <div className="text-sm text-gray-600">Archived Versions</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Create Amendment Modal (FIXED HEADER/FOOTER + SCROLL BODY) */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onMouseDown={(e) => {
            // click outside closes
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* important: allow viewport scrolling on very small screens */}
          <div className="h-full w-full overflow-y-auto">
            <div className="min-h-full w-full flex items-start justify-center p-4 py-8">
              <div
                className="
                  bg-white rounded-lg w-full max-w-4xl
                  border border-gray-200 shadow-xl
                  overflow-hidden
                  flex flex-col
                  max-h-[calc(100vh-4rem)]
                "
              >
                {/* Header (fixed) */}
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Create Amendment</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Config fields are rendered dynamically from DB config JSON
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Body (scrollable) */}
                <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
                  {modalError ? (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                      {modalError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bump Type</label>
                      <select
                        value={form.bump}
                        onChange={(e) => setForm((p) => ({ ...p, bump: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MINOR">MINOR (v1.0 → v1.1)</option>
                        <option value="MAJOR">MAJOR (v1.0 → v2.0)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Body Text (optional)</label>
                      <input
                        value={form.body_text}
                        onChange={(e) => setForm((p) => ({ ...p, body_text: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Optional plain text..."
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Change Summary*</label>
                    <input
                      value={form.change_summary}
                      onChange={(e) => setForm((p) => ({ ...p, change_summary: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Updated renewal terms..."
                    />
                  </div>

                  {/* Dynamic fields (NO PATHS) */}
                  <div className="mt-5">
                    <DynamicJsonForm
                      value={config}
                      onChange={setConfig}
                      rootLabel="Config"
                      readOnly={false}
                      showPaths={false} // ✅ hides "dispute" and "dispute.governing_law"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Tip: This config is coming from current version. You can edit and save as a new version.
                    </p>
                  </div>
                </div>

                {/* Footer (fixed) */}
                <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-white shrink-0">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Creating..." : "Create Version"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmendmentVersioningPage;
