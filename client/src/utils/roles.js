/**
 * Centralized Role Constants and Route Helpers for PawAlert AI
 */

export const ROLES = {
  CITIZEN: 'citizen',
  NGO: 'ngo',
  AUTHORITY: 'authority',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

export const ROLE_CONFIG = {
  citizen: {
    key: 'citizen',
    label: 'Citizen',
    welcomeHeading: 'Welcome, Citizen',
    shortDesc: 'Report animal accidents and track rescue requests.',
    dashboardRoute: '/citizen/dashboard',
    themeColor: '#0d9488',
    bgColor: '#ccfbf1',
    icon: 'User',
    emoji: '👤',
  },
  ngo: {
    key: 'ngo',
    label: 'NGO / Veterinary',
    welcomeHeading: 'Welcome, Rescue Partner',
    shortDesc: 'Manage rescue requests and coordinate animal rescue.',
    dashboardRoute: '/ngo/dashboard',
    themeColor: '#e11d48',
    bgColor: '#ffe4e6',
    icon: 'HeartHandshake',
    emoji: '🐾',
  },
  authority: {
    key: 'authority',
    label: 'Authority',
    welcomeHeading: 'Welcome, Authority',
    shortDesc: 'Monitor accident reports and manage accident hotspots.',
    dashboardRoute: '/authority/dashboard',
    themeColor: '#7c3aed',
    bgColor: '#ede9fe',
    icon: 'Shield',
    emoji: '🏛️',
  },
  driver: {
    key: 'driver',
    label: 'Driver',
    welcomeHeading: 'Welcome, Driver',
    shortDesc: 'Receive alerts when approaching animal accident hotspots.',
    dashboardRoute: '/driver/dashboard',
    themeColor: '#0284c7',
    bgColor: '#e0f2fe',
    icon: 'Car',
    emoji: '🚗',
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    welcomeHeading: 'Welcome, Administrator',
    shortDesc: 'Manage users, reports, hotspots and the platform.',
    dashboardRoute: '/admin/dashboard',
    themeColor: '#d97706',
    bgColor: '#fef3c7',
    icon: 'Settings',
    emoji: '⚙️',
  },
};

/**
 * Get the exact isolated dashboard route for a given user role
 * @param {string} role
 * @returns {string}
 */
export function getDashboardRoute(role) {
  const normalized = (role || '').toLowerCase().trim();
  const config = ROLE_CONFIG[normalized];
  return config ? config.dashboardRoute : '/login';
}

/**
 * Get readable role display name
 * @param {string} role
 * @returns {string}
 */
export function getRoleDisplayName(role) {
  const normalized = (role || '').toLowerCase().trim();
  const config = ROLE_CONFIG[normalized];
  return config ? config.label : 'Stakeholder';
}
