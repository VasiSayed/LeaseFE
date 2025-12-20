import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Eye, Trash2, Wifi, Car, Shield, Dumbbell } from 'lucide-react';
import CommercialUnitDetailPage from './AddUnitModal';
import apiRequest from '../services/api';
import toast from 'react-hot-toast';

export default function UnitTypesPage() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedUnitType, setSelectedUnitType] = useState('COMMERCIAL');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUnitPage, setShowAddUnitPage] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [schema, setSchema] = useState(null);
  const [unitsData, setUnitsData] = useState(null);
  const [units, setUnits] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, []);

  // Fetch units when site or unit type changes
  useEffect(() => {
    if (selectedSite) {
      fetchUnitTable();
    }
  }, [selectedSite, selectedUnitType, currentPage]);

const getActiveScope = () => {
  try {
    const raw = localStorage.getItem("active"); // ✅ you said active
    if (!raw) return null;

    const a = JSON.parse(raw);

    // support multiple possible shapes
    const scopeType = a.scope_type || a.scopeType || a.type || "ORG";
    const scopeId = a.scope_id || a.scopeId || a.id || a.pk || null;

    return scopeId ? { scopeType, scopeId } : null;
  } catch {
    return null;
  }
};


const getOrgScopeId = () => {
  // 1) try scope_tree
  try {
    const raw = localStorage.getItem("scope_tree");
    if (raw) {
      const st = JSON.parse(raw);

      // common shapes
      if (st?.org_id) return st.org_id;
      if (st?.organization_id) return st.organization_id;

      // if root itself is ORG
      if ((st?.scope_type || st?.type) === "ORG") {
        return st?.scope_id ?? st?.id ?? st?.pk;
      }

      // if tree nodes exist
      const nodes = st?.nodes || st?.children || st?.scopes || st?.results;
      if (Array.isArray(nodes)) {
        const orgNode = nodes.find((n) => (n?.scope_type || n?.type) === "ORG");
        if (orgNode) return orgNode?.scope_id ?? orgNode?.id ?? orgNode?.pk;
      }
    }
  } catch (e) {}

  // 2) fallback: try user
  try {
    const uRaw = localStorage.getItem("user");
    if (uRaw) {
      const u = JSON.parse(uRaw);
      return u?.org_id ?? u?.organization_id ?? u?.org ?? u?.organization;
    }
  } catch (e) {}

  return null;
};







 const fetchSites = async () => {
  try {
    const active = getActiveScope();
    if (!active?.scopeId) {
      toast.error("Active scope not found in localStorage.active");
      return;
    }

    const response = await apiRequest(
      `/api/setup/sites/by-scope/?scope_type=${active.scopeType}&scope_id=${active.scopeId}`
    );

    const sitesData = response.results || response || [];
    setSites(sitesData);
  } catch (error) {
    console.error("Error fetching sites:", error);
    toast.error("Failed to load sites");
  }
};


  const fetchUnitTable = async () => {
    if (!selectedSite) return;
    
    try {
      setLoadingUnits(true);
      const response = await apiRequest(
        `/api/setup/sites/${selectedSite}/unit-table/?unit_type=${selectedUnitType}&page=${currentPage}&page_size=${pageSize}`
      );
      
      setSchema(response.schema || null);
      setUnitsData(response.units || null);
      
      // Store raw API units for table rendering
      if (response.units && response.units.results) {
        setUnits(response.units.results);
      } else {
        setUnits([]);
      }
    } catch (error) {
      console.error('Error fetching unit table:', error);
      toast.error('Failed to load units');
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSiteChange = (siteId) => {
    setSelectedSite(siteId);
    setCurrentPage(1); // Reset to first page
  };

  const handleUnitTypeChange = (unitType) => {
    setSelectedUnitType(unitType);
    setCurrentPage(1); // Reset to first page
  };


  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase() || '';
    switch (statusUpper) {
      case 'AVAILABLE':
        return 'bg-blue-100 text-blue-700';
      case 'LEASED':
        return 'bg-gray-100 text-gray-700';
      case 'UNDER_OFFER':
      case 'UNDER OFFER':
        return 'bg-yellow-100 text-yellow-700';
      case 'MAINTENANCE':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUnitValue = (unit, fieldKey) => {
    // First check if it's a system field (directly on unit object)
    if (unit[fieldKey] !== undefined && unit[fieldKey] !== null) {
      return unit[fieldKey];
    }
    // Then check custom_data
    if (unit.custom_data && unit.custom_data[fieldKey] !== undefined) {
      return unit.custom_data[fieldKey];
    }
    return null;
  };

  // Get table columns based on schema
  const getTableColumns = () => {
    // System columns always shown
    const systemColumns = [
      { key: 'unit_no', label: 'Unit ID' },
      { key: 'unit_type', label: 'Unit Type' },
      { key: 'floor_label', label: 'Floor/Building' },
      { key: 'status', label: 'Status' },
    ];

    // Custom columns from schema
    const customColumns = schema?.custom_fields?.map(field => ({
      key: field.key,
      label: field.label,
    })) || [];

    return [...systemColumns, ...customColumns];
  };


  const getAvailableFromColor = (value) => {
    if (value.includes('+')) {
      if (parseFloat(value) >= 10) return 'text-green-600';
      if (parseFloat(value) >= 5) return 'text-green-500';
      return 'text-orange-500';
    }
    return 'text-gray-600';
  };

  const getAmenityIcon = (amenity) => {
    switch (amenity) {
      case 'wifi':
        return <Wifi className="w-3 h-3" />;
      case 'parking':
        return <Car className="w-3 h-3" />;
      case 'security':
        return <Shield className="w-3 h-3" />;
      case 'gym':
        return <Dumbbell className="w-3 h-3" />;
      default:
        return null;
    }
  };


  const handleEdit = (field, unitId) => {
    console.log(`Editing ${field} for unit ${unitId}`);
    setSelectedUnitId(unitId);
    setShowAddUnitPage(true);
  };


  const handleDelete = (unitId) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      setUnits(units.filter(unit => unit.id !== unitId));
    }
  };


  const handleView = (unitId) => {
    console.log(`Viewing details for unit ${unitId}`);
    setSelectedUnitId(unitId);
    setShowAddUnitPage(true);
  };


  const handleAddNewUnit = () => {
    setSelectedUnitId(null);
    setShowAddUnitPage(true);
  };

  const handleCloseUnitPage = () => {
    setShowAddUnitPage(false);
    setSelectedUnitId(null);
  };


  // If the detail page should be shown, render it instead
  if (showAddUnitPage) {
    return <CommercialUnitDetailPage onClose={handleCloseUnitPage} unitId={selectedUnitId} />;
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-full mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Commercial Units</h1>


        {/* Filters and Controls */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={selectedSite}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>


            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Building</option>
              <option value="building-1">Building 1</option>
              <option value="building-2">Building 2</option>
            </select>


            <select
              value={selectedUnitType}
              onChange={(e) => handleUnitTypeChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="COMMERCIAL">Commercial</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="WAREHOUSE">Warehouse</option>
            </select>


            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Status</option>
              <option value="available">Available</option>
              <option value="leased">Leased</option>
              <option value="maintenance">Maintenance</option>
            </select>


            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Area:</span>
              <input
                type="range"
                min="1000"
                max="15000"
                className="w-32"
              />
              <span>1000-15000 sqft</span>
            </div>


            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>


            <button 
              onClick={handleAddNewUnit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 whitespace-nowrap ml-auto"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </div>
        </div>


        {/* Table */}
        {loadingUnits ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading units...</p>
          </div>
        ) : selectedSite ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                    {getTableColumns().map((col) => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {units.length > 0 ? (
                    units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(unit.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleEdit('unit', unit.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(unit.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                        {getTableColumns().map((col) => {
                          const value = getUnitValue(unit, col.key);
                          const displayValue = value !== null && value !== undefined ? String(value) : '-';
                          
                          // Special formatting for status
                          if (col.key === 'status') {
                            return (
                              <td key={col.key} className="px-4 py-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(displayValue)}`}>
                                  {displayValue}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                              {displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={getTableColumns().length + 2} className="px-4 py-12 text-center text-gray-500">
                        No units found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {unitsData && unitsData.count > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, unitsData.count)} of {unitsData.count} units
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!unitsData.previous}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    {currentPage}
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!unitsData.next}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Please select a site to view units</p>
          </div>
        )}
      </div>
    </div>
  );
}
