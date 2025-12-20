import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';

const BaseRentPage = () => {
  const [records, setRecords] = useState([
    {
      id: 1,
      templateLeaseId: 'TEMP-LSE-001',
      property: 'City Centre Plaza',
      unit: 'Unit 101, 102',
      unitSummary: '14',
      baseRentAmount: '$75,000 (Monthly)',
      rentPerSqFt: '$35.50 (Carpet)',
      billingFrequency: 'Monthly',
      paymentDueDate: '5th Day of Month',
      firstRentDueDate: '2022-01-05'
    },
    {
      id: 2,
      templateLeaseId: 'TEMP-LSE-002',
      property: 'Green Valley Business Park',
      unit: 'Unit 205',
      unitSummary: '8',
      baseRentAmount: '$45,000 (Quarterly)',
      rentPerSqFt: '$42.00 (Chargeable)',
      billingFrequency: 'Quarterly',
      paymentDueDate: 'Due 1st Day of Period',
      firstRentDueDate: '2023-04-01'
    },
    {
      id: 3,
      templateLeaseId: 'LEE-CON-003',
      property: 'Industrial Park A',
      unit: 'Warehouse 3A',
      unitSummary: '2',
      baseRentAmount: '$120,000 (Annually)',
      rentPerSqFt: '$28.75 (Carpet)',
      billingFrequency: 'Annually',
      paymentDueDate: '30 Days Prior',
      firstRentDueDate: '2022-07-01'
    },
    {
      id: 4,
      templateLeaseId: 'TEMP-LSE-004',
      property: 'Smart Office Suites',
      unit: 'Suite 501',
      unitSummary: '6',
      baseRentAmount: '$22,000 (Monthly)',
      rentPerSqFt: '$55.00 (Chargeable)',
      billingFrequency: 'Monthly',
      paymentDueDate: '1st Day of Month',
      firstRentDueDate: '2022-08-01'
    },
    {
      id: 5,
      templateLeaseId: 'LEE-CON-005',
      property: 'Retail Hub 6',
      unit: 'Shop 16, 18',
      unitSummary: '10',
      baseRentAmount: '$90,000 (Monthly)',
      rentPerSqFt: '$60.00 (Carpet)',
      billingFrequency: 'Monthly',
      paymentDueDate: '10th Day of Month',
      firstRentDueDate: '2022-09-10'
    },
    {
      id: 6,
      templateLeaseId: 'TEMP-LSE-006',
      property: 'Tech Park South',
      unit: 'Office 302',
      unitSummary: '12',
      baseRentAmount: '$38,000 (Monthly)',
      rentPerSqFt: '$48.00 (Chargeable)',
      billingFrequency: 'Monthly',
      paymentDueDate: '7th Day of Month',
      firstRentDueDate: '2022-10-07'
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Commercial Terms - Base Rent</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Base Rent
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search all records..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Property</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Unit</option>
            </select>

            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">Status</option>
            </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Template/Lease ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Unit(s) Summary</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Base Rent Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Rent Per Sq Ft</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Billing Frequency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Payment Due Date Rule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">First Rent Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.templateLeaseId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.property}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{record.unit}</div>
                      <div className="text-xs text-gray-500">Unit(s): {record.unitSummary}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{record.baseRentAmount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.rentPerSqFt}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.billingFrequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.paymentDueDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.firstRentDueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing 6 records</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">4</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">5</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseRentPage;
