import React, { useState } from 'react';
import { X } from 'lucide-react';

const ExclusivitySection = ({ data, onChange }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = () => {
    if (newCategory.trim() && !data.excludedCategories.includes(newCategory.trim())) {
      onChange('excludedCategories', [...data.excludedCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category) => {
    onChange('excludedCategories', data.excludedCategories.filter(c => c !== category));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Exclusivity & Non-Compete</h2>
      <p className="text-sm text-gray-600 mb-4">Define exclusive rights for the tenant and non-compete clauses.</p>

      <div className="space-y-6">
        {/* Exclusive Use Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Exclusive Use</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.exclusiveUse}
              onChange={(e) => onChange('exclusiveUse', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {data.exclusiveUse && (
          <>
            {/* Exclusive Category Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exclusive Category Description
              </label>
              <input
                type="text"
                value={data.exclusiveCategory}
                onChange={(e) => onChange('exclusiveCategory', e.target.value)}
                placeholder="e.g., Cafe and light food preparation"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Excluded Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excluded Categories
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {data.excludedCategories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {category}
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder='Add categories landlord cannot allow nearby (e.g., "Cafe", "Hair Salon")'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Press Enter to add a category</p>
            </div>

            {/* Non-Compete Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Non-Compete Duration After Lease End
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={data.nonCompeteDuration}
                  onChange={(e) => onChange('nonCompeteDuration', e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Months</span>
              </div>
            </div>

            {/* Non-Compete Scope / Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Non-Compete Scope / Notes
              </label>
              <textarea
                value={data.nonCompeteNotes}
                onChange={(e) => onChange('nonCompeteNotes', e.target.value)}
                rows="2"
                placeholder="Within a 1-mile radius of the property."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExclusivitySection;
