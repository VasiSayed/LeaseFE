import React from 'react';

const ReinstatementSection = ({ data, onChange }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Reinstatement & Insurance</h2>
      <p className="text-sm text-gray-600 mb-4">Obligations for restoring the unit and insurance requirements.</p>

      <div className="space-y-6">
        {/* Tenant Must Restore */}
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.tenantRestore}
              onChange={(e) => onChange('tenantRestore', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Tenant must restore unit to original condition</span>
          </label>

          {data.tenantRestore && (
            <div className="mt-3 ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reinstatement Details
              </label>
              <textarea
                value={data.reinstatementDetails}
                onChange={(e) => onChange('reinstatementDetails', e.target.value)}
                rows="2"
                placeholder="Return to original white box condition, patching all holes."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              />
              <p className="text-xs text-gray-500 mt-1 italic">
                Note: Security deposit retention for reinstatement costs is typically covered in the general lease terms.
              </p>
            </div>
          )}
        </div>

        {/* Insurance Requirements */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={data.tenantInsurance}
              onChange={(e) => onChange('tenantInsurance', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Tenant must carry Public Liability Insurance</span>
          </label>

          {data.tenantInsurance && (
            <div className="space-y-4 ml-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Coverage Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-500">$</span>
                  <input
                    type="text"
                    value={data.coverageAmount}
                    onChange={(e) => onChange('coverageAmount', e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={data.additionalInsurance}
                  onChange={(e) => onChange('additionalInsurance', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Additional insurance requirements</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indemnity Notes
                </label>
                <textarea
                  value={data.indemnityNotes}
                  onChange={(e) => onChange('indemnityNotes', e.target.value)}
                  rows="2"
                  placeholder="Tenant indemnifies landlord against all claims arising from tenant's use."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReinstatementSection;
