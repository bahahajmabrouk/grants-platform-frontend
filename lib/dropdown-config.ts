/**
 * Configuration & Constantes du UserDropdown
 * 
 * Centralisez toutes les configurations pour faciliter la maintenance
 * et la customisation
 */

/**
 * Couleurs du thème
 */
export const COLORS = {
  // Palette principale (Dark Mode)
  bg: {
    primary: '#1F2937',      // gray-800
    secondary: '#111827',    // gray-900
    tertiary: '#374151',     // gray-700
    hover: '#4B5563',        // hover state
  },
  text: {
    primary: '#F3F4F6',      // gray-100
    secondary: '#9CA3AF',    // gray-400
    tertiary: '#6B7280',     // gray-500
  },
  accent: {
    primary: '#10B981',      // emerald-500
    light: '#6EE7B7',        // emerald-300
    dark: '#059669',         // emerald-600
  },
  danger: {
    primary: '#EF4444',      // red-500
    light: '#FCA5A5',        // red-300
    dark: '#DC2626',         // red-600
  },
  border: '#374151',         // gray-700
} as const;

/**
 * Routes de navigation
 */
export const ROUTES = {
  profile: '/profile',
  pitches: '/pitches',
  activity: '/activity',
  settings: '/settings',
  settingsPassword: '/settings/password',
  login: '/login',
  logout: '/logout',
} as const;

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  user: 'user',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  darkMode: 'darkMode',
  notificationsEnabled: 'notificationsEnabled',
  pitchId: 'pitch_id',
  selectedGrantIds: 'selectedGrantIds',
  adaptedData: 'adapted_data',
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  userStats: '/api/user/stats',
  userProfile: '/api/user/profile',
  logout: '/api/auth/logout',
  updateNotifications: '/api/user/notifications',
  updateDarkMode: '/api/user/theme',
} as const;

/**
 * Messages de l'application
 */
export const MESSAGES = {
  logout: {
    success: 'Vous avez été déconnecté avec succès',
    error: 'Erreur lors de la déconnexion',
  },
  notifications: {
    enabled: 'Notifications activées',
    disabled: 'Notifications désactivées',
  },
  darkMode: {
    enabled: 'Mode sombre activé',
    disabled: 'Mode clair activé',
  },
  error: {
    loadUser: 'Erreur lors du chargement du profil utilisateur',
    loadStats: 'Erreur lors du chargement des statistiques',
    logout: 'Erreur lors de la déconnexion',
  },
} as const;

/**
 * Configurations de timing/délais
 */
export const TIMING = {
  animationDuration: 200,      // ms
  dropdownDelay: 10,           // ms
  statsLoadDelay: 500,         // ms
  debounceDelay: 300,          // ms
  clickOutsideDelay: 100,      // ms
} as const;

/**
 * Tailles et dimensions
 */
export const SIZES = {
  dropdownWidth: 320,          // px (w-80)
  avatarSize: 32,              // px
  iconSize: 16,                // px (default)
  iconSizeLarge: 24,           // px
  borderRadius: 8,             // px
  spacing: 4,                  // px (base unit)
} as const;

/**
 * Animations CSS Tailwind
 */
export const ANIMATIONS = {
  fadeIn: 'animate-in fade-in',
  slideInTop: 'slide-in-from-top-2',
  duration: 'duration-200',
} as const;

/**
 * Breakpoints (responsive)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Validation regexs
 */
export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  passwordMinLength: 8,
  nameMinLength: 2,
} as const;

/**
 * Pagination/Limite des listes
 */
export const LIMITS = {
  maxPitches: 100,
  maxGrants: 1000,
  statsDisplayLimit: 3,        // Affichage max dans le dropdown
} as const;

/**
 * États d'authentification
 */
export enum AuthStatus {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  LOADING = 'loading',
  ERROR = 'error',
}

/**
 * Types d'notifications
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

/**
 * Interface pour les éléments du menu
 */
export interface MenuItem {
  id: string;
  label: string;
  icon: any; // Lucide React icon
  path?: string;
  action?: () => void;
  divider?: boolean;
  danger?: boolean;
}

/**
 * Configuration d'un menu section
 */
export interface MenuSection {
  id: string;
  title: string;
  icon?: any;
  items: MenuItem[];
}

/**
 * Configuration complète du dropdown menu
 */
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'user-info',
    title: 'Infos Utilisateur',
    items: [],
  },
  {
    id: 'stats',
    title: 'Mes Statistiques',
    items: [],
  },
  {
    id: 'quick-links',
    title: 'Liens Rapides',
    items: [
      {
        id: 'profile',
        label: 'Mon Profil',
        icon: 'User',
        path: ROUTES.profile,
      },
      {
        id: 'pitches',
        label: 'Mes Pitchs',
        icon: 'Briefcase',
        path: ROUTES.pitches,
      },
      {
        id: 'activity',
        label: 'Activité',
        icon: 'Calendar',
        path: ROUTES.activity,
      },
      {
        id: 'settings',
        label: 'Paramètres',
        icon: 'Settings',
        path: ROUTES.settings,
      },
    ],
  },
  {
    id: 'account',
    title: 'Compte',
    items: [
      {
        id: 'password',
        label: 'Changer mot de passe',
        icon: 'Lock',
        path: ROUTES.settingsPassword,
      },
      {
        id: 'notifications-toggle',
        label: 'Notifications',
        icon: 'Bell',
      },
      {
        id: 'darkmode-toggle',
        label: 'Mode Sombre',
        icon: 'Moon',
      },
    ],
  },
  {
    id: 'logout',
    title: '',
    items: [
      {
        id: 'logout',
        label: 'Se Déconnecter',
        icon: 'LogOut',
        danger: true,
        action: () => {
          // Action définie dans le composant
        },
      },
    ],
  },
];

/**
 * Configuration des toggle switches
 */
export const TOGGLE_CONFIG = {
  notifications: {
    key: STORAGE_KEYS.notificationsEnabled,
    endpoint: API_ENDPOINTS.updateNotifications,
    messages: MESSAGES.notifications,
  },
  darkMode: {
    key: STORAGE_KEYS.darkMode,
    endpoint: API_ENDPOINTS.updateDarkMode,
    messages: MESSAGES.darkMode,
  },
} as const;

/**
 * Helper pour obtenir une couleur par type
 */
export const getColorByType = (type: 'accent' | 'danger' | 'success' = 'accent') => {
  const colorMap = {
    accent: COLORS.accent.primary,
    danger: COLORS.danger.primary,
    success: COLORS.accent.primary,
  };
  return colorMap[type];
};

/**
 * Helper pour obtenir une route
 */
export const getRoute = (
  key: keyof typeof ROUTES
): string => {
  return ROUTES[key];
};

/**
 * Helper pour obtenir une clé de stockage
 */
export const getStorageKey = (
  key: keyof typeof STORAGE_KEYS
): string => {
  return STORAGE_KEYS[key];
};
