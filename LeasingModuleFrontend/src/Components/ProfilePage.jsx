import React, { useState, useEffect } from 'react';
import { User, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const ProfilePage = () => {
  const { user, scopeTree } = useAuth();
  const [activeScope, setActiveScope] = useState(() => {
    // Load from localStorage or default to "ALL"
    const stored = localStorage.getItem('active');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { mode: 'ALL' };
      }
    }
    return { mode: 'ALL' };
  });
  const [saveStatus, setSaveStatus] = useState(''); // 'saved' or ''

  // Build scope dropdown options from scope_tree
  const buildScopeOptions = () => {
    const options = [{ value: 'ALL', label: 'All Sites', mode: 'ALL' }];
    
    // Get scope_tree from context or localStorage
    const tree = scopeTree || authAPI.getStoredScopeTree();
    
    if (!tree || !Array.isArray(tree)) {
      return options; // Fallback to only "All Sites"
    }

    tree.forEach((org) => {
      // Add Org option
      options.push({
        value: `ORG-${org.id}`,
        label: `Org: ${org.name}`,
        mode: 'SCOPE',
        scope_type: 'ORG',
        scope_id: org.id,
      });

      // Add Company options under each org
      if (org.companies && Array.isArray(org.companies)) {
        org.companies.forEach((company) => {
          options.push({
            value: `COMPANY-${company.id}`,
            label: `Company: ${company.name}`,
            mode: 'SCOPE',
            scope_type: 'COMPANY',
            scope_id: company.id,
          });

          // Add Entity options under each company
          if (company.entities && Array.isArray(company.entities)) {
            company.entities.forEach((entity) => {
              options.push({
                value: `ENTITY-${entity.id}`,
                label: `Entity: ${entity.name}`,
                mode: 'SCOPE',
                scope_type: 'ENTITY',
                scope_id: entity.id,
              });
            });
          }
        });
      }
    });

    return options;
  };

  // Handle scope selection change
  const handleScopeChange = (e) => {
    const selectedValue = e.target.value;
    const options = buildScopeOptions();
    const selectedOption = options.find((opt) => opt.value === selectedValue);
    
    if (selectedOption) {
      const scopeData = {
        mode: selectedOption.mode,
        ...(selectedOption.mode === 'SCOPE' && {
          scope_type: selectedOption.scope_type,
          scope_id: selectedOption.scope_id,
          label: selectedOption.label,
        }),
      };
      
      setActiveScope(scopeData);
      setSaveStatus(''); // Clear save status when changing
    }
  };

  // Save active scope to localStorage
  const handleSave = () => {
    localStorage.setItem('active', JSON.stringify(activeScope));
    setSaveStatus('saved');
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('activeScopeChanged'));
    setTimeout(() => setSaveStatus(''), 2000); // Clear after 2 seconds
  };

  // Get current select value for the dropdown
  const getCurrentSelectValue = () => {
    if (activeScope.mode === 'ALL') {
      return 'ALL';
    }
    return `${activeScope.scope_type}-${activeScope.scope_id}`;
  };

  // Get current scope label for display
  const getScopeLabel = () => {
    if (activeScope.mode === 'ALL') {
      return 'All Sites';
    }
    return activeScope.label || `Scope: ${activeScope.scope_type} ${activeScope.scope_id}`;
  };

  return (
    <div className="px-6 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Profile Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {user?.username || user?.email || 'User'}
              </h3>
              {user?.email && (
                <p className="text-sm text-gray-600">{user.email}</p>
              )}
              {user?.role && (
                <span className="inline-block mt-2 text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scope Selection Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Scope</h3>
            <p className="text-sm text-gray-600">
              Select the scope that will be used across the application for filtering data.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope:
              </label>
              <div className="flex items-center gap-4">
                <select
                  value={getCurrentSelectValue()}
                  onChange={handleScopeChange}
                  className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {buildScopeOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600 font-medium">
                  {getScopeLabel()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {saveStatus === 'saved' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Active Scope</span>
                  </>
                )}
              </button>
              {saveStatus === 'saved' && (
                <span className="text-sm text-green-600">Scope saved successfully!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

