import React from 'react';

const TerminationSection = ({ data, onChange }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Termination & Early Exit</h2>
      <p className="text-sm text-gray-600 mb-4">Define terms for lease termination by either party.</p>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.terminationByTenant}
            onChange={(e) => onChange('terminationByTenant', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Termination by Tenant Permitted</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.terminationByLandlord}
            onChange={(e) => onChange('terminationByLandlord', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Termination by Landlord Permitted</span>
        </label>
      </div>

      <p className="text-xs text-gray-500 mt-4 italic">
        Note: Standard termination clauses are managed in the Clause Library. Adjustments here override defaults.
      </p>
    </div>
  );
};

export default TerminationSection;
