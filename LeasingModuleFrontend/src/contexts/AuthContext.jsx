import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [scopeTree, setScopeTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (authAPI.isAuthenticated()) {
        const storedUser = authAPI.getStoredUser();
        const storedScopeTree = authAPI.getStoredScopeTree();
        if (storedUser) {
          // Verify token is still valid by fetching profile
          try {
            const profile = await authAPI.getProfile();
            setUser(profile.user);
            setScopeTree(storedScopeTree);
            setIsAuthenticated(true);
          } catch (error) {
            // Token invalid, clear auth
            authAPI.logout();
            setUser(null);
            setScopeTree(null);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, scopeTreeData = null) => {
    setUser(userData);
    setScopeTree(scopeTreeData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setScopeTree(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    scopeTree,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


