import React from 'react';
import { ChevronDown } from 'lucide-react';

const SubLettingSection = ({ data, onChange }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Sub-letting & Signage Rights</h2>
      <p className="text-sm text-gray-600 mb-4">Define tenant's rights regarding sub-leasing and external signage.</p>

      <div className="space-y-6">
        {/* Sub-letting Permitted Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Sub-letting Permitted</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.subLettingPermitted}
              onChange={(e) => onChange('subLettingPermitted', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Signage Rights</h3>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={data.tenantSignage}
                onChange={(e) => onChange('tenantSignage', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tenant is entitled to signage</span>
            </label>

            {data.tenantSignage && (
              <>
                <div className="flex items-center justify-between ml-7">
                  <label className="text-sm font-medium text-gray-700">Requires Landlord Approval</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.landlordApproval}
                      onChange={(e) => onChange('landlordApproval', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Signage Area</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data.maxSignageArea}
                      onChange={(e) => onChange('maxSignageArea', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={data.signageUnit}
                      onChange={(e) => onChange('signageUnit', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sqm">sqm</option>
                      <option value="sqft">sqft</option>
                    </select>
                  </div>
                </div>

                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signage Location / Notes</label>
                  <textarea
                    value={data.signageNotes}
                    onChange={(e) => onChange('signageNotes', e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubLettingSection;
