import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit2 } from 'lucide-react';

const EscalationTermsPage = () => {
  const [records, setRecords] = useState([
    {
      id: 1,
      leaseId: 'LS001',
      tenantName: 'Global Innovations Inc.',
      escalationType: 'Fixed Percentage',
      nextReviewDate: '2024-06-15',
      currentEscalationValue: '3.0%',
      effectiveFrom: '2025-06-01',
      effectiveTo: '2028-07-31',
      status: 'Active',
      notesPriority: 'Annual Review'
    },
    {
      id: 2,
      leaseId: 'LS002',
      tenantName: 'Tech Solutions Ltd.',
      escalationType: 'CPI Index',
      nextReviewDate: '2025-01-01',
      currentEscalationValue: 'CPI + 1.0%',
      effectiveFrom: '2024-01-01',
      effectiveTo: '2029-12-31',
      status: 'Pending',
      notesPriority: 'Escalation review pending'
    },
    {
      id: 3,
      leaseId: 'LS003',
      tenantName: 'Green Earth Organics',
      escalationType: 'Step Up',
      nextReviewDate: '2023-11-01',
      currentEscalationValue: '5.0%',
      effectiveFrom: '2021-11-01',
      effectiveTo: '2026-10-31',
      status: 'Expired',
      notesPriority: 'Step-up scheduled'
    },
    {
      id: 4,
      leaseId: 'LS004',
      tenantName: 'Dynamic Marketing Co.',
      escalationType: 'Market Review',
      nextReviewDate: '2026-03-20',
      currentEscalationValue: 'Market Rate',
      effectiveFrom: '2021-05-20',
      effectiveTo: '2031-05-19',
      status: 'Active',
      notesPriority: 'Market review scheduled'
    },
    {
      id: 5,
      leaseId: 'LS005',
      tenantName: 'Urban Development Group',
      escalationType: 'Custom',
      nextReviewDate: '2024-06-30',
      currentEscalationValue: 'Based on Revenue',
      effectiveFrom: '2022-07-01',
      effectiveTo: '2027-06-30',
      status: 'Error: Missing Data',
      notesPriority: 'Complex escalation formula'
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Expired':
        return 'bg-red-100 text-red-700';
      case 'Error: Missing Data':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getEscalationTypeColor = (type) => {
    switch (type) {
      case 'Fixed Percentage':
        return 'bg-blue-100 text-blue-700';
      case 'CPI Index':
        return 'bg-green-100 text-green-700';
      case 'Step Up':
        return 'bg-purple-100 text-purple-700';
      case 'Market Review':
        return 'bg-orange-100 text-orange-700';
      case 'Custom':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Price Escalation Terms Records</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Escalation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search Lease ID, Tenant Name, Notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Escalation Type</option>
              <option value="fixed">Fixed Percentage</option>
              <option value="cpi">CPI Index</option>
              <option value="stepup">Step Up</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>

            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tenant Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Escalation Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Next Review Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Current Escalation Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Effective From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Effective To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notes Priority</th>
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
                    <td className="px-4 py-3 text-sm text-gray-800">{record.tenantName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEscalationTypeColor(record.escalationType)}`}>
                        {record.escalationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.nextReviewDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{record.currentEscalationValue}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.effectiveFrom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.effectiveTo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.notesPriority}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit2 className="w-4 h-4 text-gray-600" />
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
            <div className="text-sm text-gray-600">Showing 5 records</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscalationTermsPage;
