import React, { useState } from 'react';
import ClauseListPage from './ClauseListPage';
import LegalOperationalClausesPage from './LegalOperationalClausesPage';
import AmendmentVersioningPage from './AmendmentVersioningPage';
import DocumentLinksPage from './DocumentLinksPage';

const ClauseLibraryLayout = () => {
  const [activeSubTab, setActiveSubTab] = useState('Legal & Operational Clauses');

  const subTabs = [
    'Legal & Operational Clauses',
    'Amendment & Versioning',
    'Document Links'
  ];

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'Legal & Operational Clauses':
        return <ClauseListPage />;
      case 'Amendment & Versioning':
        return <AmendmentVersioningPage />;
      case 'Document Links':
        return <DocumentLinksPage />;
      default:
        return <ClauseListPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sub Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-6 overflow-x-auto">
            {subTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeSubTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {renderSubTabContent()}
    </div>
  );
};

export default ClauseLibraryLayout;
