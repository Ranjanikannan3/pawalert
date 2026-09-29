import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('pawalert_token');
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('pawalert_token');
            setUser(null);
          }
        } catch (err) {
          localStorage.removeItem('pawalert_token');
          setUser(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email, password, role) => {
    const res = await api.login({ email, password, role });
    if (res.success && res.user) {
      localStorage.setItem('pawalert_token', res.user.token);
      setUser(res.user);
      setAuthNotice(null);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.user) {
      localStorage.setItem('pawalert_token', res.user.token);
      setUser(res.user);
      setAuthNotice(null);
      return res.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('pawalert_token');
    setUser(null);
    setAuthNotice(null);
  };

  /**
   * Quick 1-click role switcher for viva and instant testing
   */
  const quickSwitchDemoRole = async (roleName) => {
    const roleEmailMap = {
      citizen: 'citizen@pawalert.demo',
      driver: 'driver@pawalert.demo',
      authority: 'authority@pawalert.demo',
      ngo: 'ngo@pawalert.demo',
      admin: 'admin@pawalert.demo',
    };
    const rolePasswordMap = {
      citizen: 'Citizen@123',
      driver: 'Driver@123',
      authority: 'Authority@123',
      ngo: 'Ngo@123',
      admin: 'Admin@123',
    };

    const email = roleEmailMap[roleName] || 'citizen@pawalert.demo';
    const password = rolePasswordMap[roleName] || 'Citizen@123';

    try {
      return await login(email, password, roleName);
    } catch (err) {
      // Fallback to org account
      return await login(`${roleName}@pawalert.org`, 'password123', roleName);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        isAuthenticated: !!user,
        authNotice,
        setAuthNotice,
        login,
        register,
        logout,
        quickSwitchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
