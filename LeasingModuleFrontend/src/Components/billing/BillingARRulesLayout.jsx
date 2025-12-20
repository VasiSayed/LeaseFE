import React, { useState } from "react";
import CAMComponentPage from "./CAMComponentPage";
import BillingInvoiceRulesPage from "./BillingInvoiceRulesPage";
import BillingARPage from "./BillingARPage"; // ✅ NEW PAGE

const BillingARRulesLayout = () => {
  const [activeSubTab, setActiveSubTab] = useState("CAM Components");

  const subTabs = [
    "Billing & Invoice Rules",
    "Rent Escalation Templates",
    "CAM Components",
    "Ageing Bucket Configuration",
    "AR Rules (Dispute, Credit)",
     // ✅ NEW TAB (beside / after AR Rules)
  ];

  const PlaceholderPage = ({ title }) => (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">This section is under construction</p>
      </div>
    </div>
  );

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "CAM Components":
        return <CAMComponentPage />;

      case "Billing & Invoice Rules":
        return <BillingInvoiceRulesPage />;

      case "Rent Escalation Templates":
        return <PlaceholderPage title="Rent Escalation Templates" />;

      case "Ageing Bucket Configuration":
        return <PlaceholderPage title="Ageing Bucket Configuration" />;

      // case "AR Rules (Dispute, Credit)":
      //   return <PlaceholderPage title="AR Rules (Dispute, Credit)" />;

      case "AR Rules (Dispute, Credit)":
        return <BillingARPage />; // ✅ NEW

      default:
        return <CAMComponentPage />;
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
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
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

export default BillingARRulesLayout;
