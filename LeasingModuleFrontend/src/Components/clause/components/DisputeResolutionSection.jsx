import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DisputeResolutionSection = ({ data, onChange }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const mechanisms = ['Arbitration', 'Mediation', 'Litigation', 'Negotiation'];
  const laws = ['State of New York', 'State of California', 'State of Texas', 'State of Florida', 'Federal Law'];

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Dispute Resolution & Governing Law</h2>
      <p className="text-sm text-gray-600 mb-4">Define how disputes will be resolved and which jurisdiction's laws apply.</p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dispute Resolution Mechanism */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispute Resolution Mechanism
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('mechanism')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-gray-800">{data.disputeMechanism}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'mechanism' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'mechanism' && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {mechanisms.map((mechanism) => (
                    <button
                      key={mechanism}
                      type="button"
                      onClick={() => {
                        onChange('disputeMechanism', mechanism);
                        toggleDropdown('mechanism');
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-800"
                    >
                      {mechanism}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Governing Law */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Governing Law
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('law')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-gray-800">{data.governingLaw}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'law' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'law' && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {laws.map((law) => (
                    <button
                      key={law}
                      type="button"
                      onClick={() => {
                        onChange('governingLaw', law);
                        toggleDropdown('law');
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-800"
                    >
                      {law}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary of Dispute Resolution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Summary of Dispute Resolution
          </label>
          <textarea
            value={data.disputeSummary}
            onChange={(e) => onChange('disputeSummary', e.target.value)}
            rows="3"
            placeholder="Disputes to be resolved via binding arbitration in New York, NY, with a single arbitrator."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default DisputeResolutionSection;
