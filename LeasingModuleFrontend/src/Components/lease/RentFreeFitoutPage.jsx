import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, Edit2 } from 'lucide-react';

const RentFreeFitoutPage = () => {
  const [records, setRecords] = useState([
    {
      id: 1,
      leaseId: 'LSE-2023-9',
      tenantName: 'Acme Innovations Ltd.',
      rentFreeStartDate: '2023-03-01',
      rentFreeEndDate: '2023-08-31',
      fitoutStartDate: '2023-03-15',
      expectedFitoutDate: '2023-07-31',
      camDuringFitout: 'Yes',
      chargeableCAM: '50%',
      fitoutCertRequired: 'Yes',
      notesPreview: 'Final inspection scheduled for July 25...'
    },
    {
      id: 2,
      leaseId: 'LSE-2023-9',
      tenantName: 'Global Solutions Inc.',
      rentFreeStartDate: '2023-04-15',
      rentFreeEndDate: '2023-10-15',
      fitoutStartDate: '2023-05-10',
      expectedFitoutDate: '2023-09-30',
      camDuringFitout: 'No',
      chargeableCAM: '0%',
      fitoutCertRequired: 'Yes',
      notesPreview: 'Fitout progressing ahead of schedule...'
    },
    {
      id: 3,
      leaseId: 'LSE-2023-9',
      tenantName: 'Tech Pioneers Co.',
      rentFreeStartDate: '2023-06-01',
      rentFreeEndDate: '2023-11-30',
      fitoutStartDate: '2023-06-10',
      expectedFitoutDate: '2023-10-31',
      camDuringFitout: 'Partial',
      chargeableCAM: '25%',
      fitoutCertRequired: 'Yes',
      notesPreview: 'Validation required: completion certificate...'
    },
    {
      id: 4,
      leaseId: 'LSE-2023-94',
      tenantName: 'Creative Hub Ltd.',
      rentFreeStartDate: '2023-07-01',
      rentFreeEndDate: '2023-12-31',
      fitoutStartDate: '2023-08-10',
      expectedFitoutDate: '2024-01-31',
      camDuringFitout: 'Yes',
      chargeableCAM: '75%',
      fitoutCertRequired: 'No',
      notesPreview: 'Architectural drawings approved. Wait...'
    },
    {
      id: 5,
      leaseId: 'LSE-2023-95',
      tenantName: 'Future Enterprises',
      rentFreeStartDate: '2023-09-01',
      rentFreeEndDate: '2024-02-28',
      fitoutStartDate: '2023-08-10',
      expectedFitoutDate: '2024-01-31',
      camDuringFitout: 'No',
      chargeableCAM: '0%',
      fitoutCertRequired: 'No',
      notesPreview: 'Initial site survey completed. No major...'
    }
  ]);

  const getCamColor = (cam) => {
    if (cam === 'Yes') return 'bg-green-100 text-green-700';
    if (cam === 'No') return 'bg-red-100 text-red-700';
    if (cam === 'Partial') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getCertColor = (cert) => {
    if (cert === 'Yes') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Rent-Free & Fitout Records</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Record
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search records by Lease ID, Tenant Name, etc..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Lease ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tenant Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Rent Free Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Rent Free End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fitout Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Expected Fitout Completion Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">CAM During Fitout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Chargeable CAM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fitout Certificate Required</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Notes Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.leaseId}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{record.tenantName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.rentFreeStartDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.rentFreeEndDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.fitoutStartDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.expectedFitoutDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCamColor(record.camDuringFitout)}`}>
                        {record.camDuringFitout}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.chargeableCAM}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCertColor(record.fitoutCertRequired)}`}>
                        {record.fitoutCertRequired}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.notesPreview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentFreeFitoutPage;
