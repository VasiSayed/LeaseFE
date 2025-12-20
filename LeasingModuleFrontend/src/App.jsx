// import React, { useState ,useEffect} from "react";
// import { useAuth } from "./contexts/AuthContext";
// import Navbar from "./Components/Navbar";
// import Login from "./Components/Login";
// import ManagementDashboard from "./Components/ManagementDashboard";
// import PropertyTypesPage from "./Components/PropertyTypesPage";
// import UnitTypesPage from "./Components/UnitTypesPage";
// import TenantManagement from "./Components/Tenant/TenantManagement";
// import CustomUnitFieldsPage from "./Components/CustomUnitFieldsPage";
// import LeaseListPage from "./Components/lease/LeaseListPage";
// import BillingARRulesLayout from "./Components/billing/BillingARRulesLayout";
// import ClauseLibraryLayout from "./Components/clause/ClauseLibraryLayout";
// import ProfilePage from "./Components/ProfilePage";
// import { Toaster } from "react-hot-toast";
// import Snowfall from 'react-snowfall'
// <Snowfall/>
// const PlaceholderPage = ({ title }) => (
//   <div className="min-h-screen flex items-center justify-center">
//     <div className="text-center">
//       <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
//       <p className="text-gray-600">This page is under construction</p>
//     </div>
//   </div>
// );

// const AppContent = () => {
//   const { isAuthenticated, loading } = useAuth();
// const [activeTab, setActiveTab] = useState(() => {
//   return localStorage.getItem("activeTab") || "Dashboard";
// });
//   const [showLogin, setShowLogin] = useState(false);
//   useEffect(() => {
//   localStorage.setItem("activeTab", activeTab);
// }, [activeTab]);

//   const renderPage = () => {
//     switch (activeTab) {
//       case "Dashboard":
//         return <ManagementDashboard />;
//       case "Property Types":
//         return <PropertyTypesPage />;
//       case "Unit Types":
//         return <UnitTypesPage />;
//       case "Custom Unit Fields":
//         return <CustomUnitFieldsPage />;
//       case "Tenant/Contact Templates":
//         return <TenantManagement />;
//       case "Lease Templates":
//         return <LeaseListPage />;
//       case "Billing & AR Rules":
//         return <BillingARRulesLayout />;
//       case "Clause Library":
//         return <ClauseLibraryLayout />;
//       case "Profile":
//         return <ProfilePage />;
//       default:
//         return (
//           <PlaceholderPage
//             title={`Master Data - ${activeTab
//               .toLowerCase()
//               .replace(/\s+/g, "-")}`}
//           />
//         );
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }
  

//   if (!isAuthenticated || showLogin) {
//     return <Login onClose={() => setShowLogin(false)} />;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar
//         activeTab={activeTab}
//         onTabChange={setActiveTab}
//         onLoginClick={() => setShowLogin(true)}
//       />
//       {renderPage()}
//     </div>
//   );
// };

// const App = () => {
//   return (
//     <>
//       <Toaster position="top-right" />
//       <AppContent />
//     </>
//   );
// };

// export default App;



import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import Navbar from "./Components/Navbar";
import Login from "./Components/Login";
import ManagementDashboard from "./Components/ManagementDashboard";
import PropertyTypesPage from "./Components/PropertyTypesPage";
import UnitTypesPage from "./Components/UnitTypesPage";
import TenantManagement from "./Components/Tenant/TenantManagement";
import CustomUnitFieldsPage from "./Components/CustomUnitFieldsPage";
import LeaseListPage from "./Components/lease/LeaseListPage";
import BillingARRulesLayout from "./Components/billing/BillingARRulesLayout";
import ClauseLibraryLayout from "./Components/clause/ClauseLibraryLayout";
import ProfilePage from "./Components/ProfilePage";
import FloorSetupPage from "./Components/billing/FloorSetupPage";

import { Toaster } from "react-hot-toast";

import Snowfall from "react-snowfall";

const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600">This page is under construction</p>
    </div>
  </div>
);

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "Dashboard";
  });

  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const renderPage = () => {
    switch (activeTab) {
      case "Dashboard":
        return <ManagementDashboard />;
      case "Floor Setup":
        return <FloorSetupPage />;

      case "Property Types":
        return <PropertyTypesPage />;
      case "Unit Types":
        return <UnitTypesPage />;
      case "Custom Unit Fields":
        return <CustomUnitFieldsPage />;
      case "Tenant/Contact Templates":
        return <TenantManagement />;
      case "Lease Templates":
        return <LeaseListPage />;
      case "Billing & AR Rules":
        return <BillingARRulesLayout />;
      case "Clause Library":
        return <ClauseLibraryLayout />;
      case "Profile":
        return <ProfilePage />;
      default:
        return (
          <PlaceholderPage
            title={`Master Data - ${activeTab.toLowerCase().replace(/\s+/g, "-")}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || showLogin) {
    // ✅ also show snowfall on login page
    return (
      <div className="relative min-h-screen">
        <Snowfall
          style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none" }}
        />
        <Login onClose={() => setShowLogin(false)} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* ✅ Snow on ALL pages (fixed overlay) */}
      <Snowfall
        style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none" }}
      />

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLoginClick={() => setShowLogin(true)}
      />
      {renderPage()}
    </div>
  );
};

const App = () => {
  return (
    <>
      <Toaster position="top-right" />
      <AppContent />
    </>
  );
};

export default App;
