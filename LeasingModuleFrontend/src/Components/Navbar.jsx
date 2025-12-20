import React from "react";
import { Building, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";


const Navbar = ({ activeTab, onTabChange, onLoginClick }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const tabs = [
     'Dashboard','Property Types','Floor Setup', 'Unit Types', 'Custom Unit Fields', 'Tenant/Contact Templates',
    'Lease Templates', 'Clause Library', 'Billing & AR Rules', 'Rent Schedule & Revenue Recognition',
    'Approval Matrices & Rules', 'User & Role Management (RBAC)', 'Profile'
  ];

  const removeitem = [
    "Alert/Notification Rules",
    "Integrations",
    "Data Import/Export Templates",
    "Audit & Versioning Settings",
    "Feature Toggles",
  ];

  const handleLogout = () => {
  // optional: reset UI tab to Dashboard immediately
  onTabChange?.("Dashboard");

  // clear saved tab so next login starts clean
  localStorage.removeItem("activeTab");

  // optional (recommended): also clear active org/scope
  // localStorage.removeItem("active");

  logout();
};

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">Admin Setup</h1>
          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700 font-medium">{user.username || user.email}</span>
                {user.role && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {user.role}
                  </span>
                )}
              </div>
            )}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto scrollbar-thin-modern">
        <div className="flex px-6 min-w-max ">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;