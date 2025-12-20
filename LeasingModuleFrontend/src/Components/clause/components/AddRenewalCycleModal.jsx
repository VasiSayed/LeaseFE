import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddRenewalCycleModal = ({ onClose, onAdd, cycleNumber }) => {
  const [formData, setFormData] = useState({
    cycle: cycleNumber,
    term: '',
    rentFormula: '',
    comments: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (formData.term && formData.rentFormula) {
      onAdd(formData);
    } else {
      alert('Please fill in all required fields');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add Renewal Cycle</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cycle Number
            </label>
            <input
              type="number"
              value={formData.cycle}
              onChange={(e) => handleChange('cycle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.term}
              onChange={(e) => handleChange('term', e.target.value)}
              placeholder="e.g., 5 years"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rent Formula <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.rentFormula}
              onChange={(e) => handleChange('rentFormula', e.target.value)}
              placeholder="e.g., Market rate + 5% of current rent"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => handleChange('comments', e.target.value)}
              rows="3"
              placeholder="Additional notes about this renewal cycle"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Add Cycle
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRenewalCycleModal;
