import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AddRenewalCycleModal from './AddRenewalCycleModal';

const RenewalOptionsSection = ({ data, onChange }) => {
  const [showModal, setShowModal] = useState(false);

  const handleAddCycle = (newCycle) => {
    const updatedCycles = [...data.renewalCycles, newCycle];
    onChange('renewalCycles', updatedCycles);
    setShowModal(false);
  };

  const handleDeleteCycle = (index) => {
    const updatedCycles = data.renewalCycles.filter((_, i) => i !== index);
    onChange('renewalCycles', updatedCycles);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Renewal Options</h2>
      <p className="text-sm text-gray-600 mb-4">Configure terms for automatic or optional lease renewals.</p>

      <div className="space-y-6">
        {/* Pre-Renewal Negotiation Window */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pre-Renewal Negotiation Window
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={data.preRenewalWindow}
              onChange={(e) => onChange('preRenewalWindow', e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Days before lease expiry to start negotiation</span>
          </div>
        </div>

        {/* Renewal Cycles Table */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Renewal Cycles</label>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Cycle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Rent Formula</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.renewalCycles.map((cycle, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{cycle.cycle}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{cycle.term}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{cycle.rentFormula}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cycle.comments}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteCycle(index)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Renewal Cycle
          </button>
        </div>
      </div>

      {showModal && (
        <AddRenewalCycleModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddCycle}
          cycleNumber={data.renewalCycles.length + 1}
        />
      )}
    </div>
  );
};

export default RenewalOptionsSection;
