import React, { useState } from 'react';
import { Plus, Eye, Edit2, Trash2, Filter } from 'lucide-react';

const TenureLockInPage = () => {
  const [records, setRecords] = useState([
    {
      id: 1,
      leaseId: 'CRE-L-001',
      version: '1.0',
      commencementDate: '2023-01-15',
      initialTerm: '36 months',
      expiryDate: '2026-01-14',
      lockInStart: '2023-01-15',
      lockInEnd: '2024-01-14',
      noticeRenewal: '90',
      noticeTenant: '60',
      noticeLandlord: '90',
      status: 'Active'
    },
    {
      id: 2,
      leaseId: 'CRE-L-002',
      version: '1.1',
      commencementDate: '2022-03-01',
      initialTerm: '24 months',
      expiryDate: '2024-02-29',
      lockInStart: '2022-03-01',
      lockInEnd: '2023-03-01',
      noticeRenewal: '120',
      noticeTenant: '30',
      noticeLandlord: '60',
      status: 'Upcoming'
    },
    {
      id: 3,
      leaseId: 'CRE-L-003',
      version: '2.0',
      commencementDate: '2021-07-01',
      initialTerm: '48 months',
      expiryDate: '2025-06-30',
      lockInStart: '2021-07-01',
      lockInEnd: '2023-07-01',
      noticeRenewal: '90',
      noticeTenant: '90',
      noticeLandlord: '90',
      status: 'Active'
    },
    {
      id: 4,
      leaseId: 'CRE-L-004',
      version: '1.0',
      commencementDate: '2020-05-20',
      initialTerm: '60 months',
      expiryDate: '2025-05-19',
      lockInStart: '2020-05-20',
      lockInEnd: '2022-05-19',
      noticeRenewal: '180',
      noticeTenant: '120',
      noticeLandlord: '180',
      status: 'Expired'
    },
    {
      id: 5,
      leaseId: 'CRE-L-005',
      version: '1.2',
      commencementDate: '2024-04-01',
      initialTerm: '12 months',
      expiryDate: '2025-03-31',
      lockInStart: '2024-04-01',
      lockInEnd: '2024-10-01',
      noticeRenewal: '60',
      noticeTenant: '30',
      noticeLandlord: '30',
      status: 'Active'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Upcoming':
        return 'bg-yellow-100 text-yellow-700';
      case 'Expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter(record => record.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Tenure & Lock-in Records</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Tenure
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Property</option>
              <option value="property1">Property 1</option>
              <option value="property2">Property 2</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Tenant</option>
              <option value="tenant1">Tenant 1</option>
              <option value="tenant2">Tenant 2</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500 self-center">to</span>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Bulk Actions
            </button>

            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Reset Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lease ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Commencement Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Initial Term</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lock-in Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lock-in End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notice Renewal (days)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notice Tenant Term. (days)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notice Landlord Term. (days)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.leaseId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.version}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.commencementDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.initialTerm}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.expiryDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.lockInStart}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.lockInEnd}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.noticeRenewal}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.noticeTenant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.noticeLandlord}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing 5 of 5 records</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenureLockInPage;
