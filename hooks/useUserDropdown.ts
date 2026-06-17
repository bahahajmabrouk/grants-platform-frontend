/**
 * Hook personnalisé useUserDropdown
 * 
 * Centralise la logique du dropdown pour réutilisabilité
 * et tests plus faciles
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/auth';
import { UserStats, DropdownState } from '@/types/dropdown';
import {
  getDarkMode,
  setDarkMode,
  getNotificationsEnabled,
  setNotificationsEnabled,
  getUserFromStorage,
  getAccessToken,
  fetchUserStats,
} from '@/lib/dropdown-utils';

interface UseUserDropdownReturn {
  // État
  isOpen: boolean;
  darkMode: boolean;
  notificationsEnabled: boolean;
  user: User | null;
  stats: UserStats | null;
  isLoading: boolean;

  // Actions
  toggleDropdown: () => void;
  closeDropdown: () => void;
  openDropdown: () => void;
  toggleDarkMode: () => void;
  toggleNotifications: () => void;
  loadStats: () => Promise<void>;
}

/**
 * Hook principal pour la gestion du UserDropdown
 */
export const useUserDropdown = (): UseUserDropdownReturn => {
  // État principal
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkModeState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser l'état depuis localStorage au montage
  useEffect(() => {
    try {
      const isDark = getDarkMode();
      const notif = getNotificationsEnabled();
      const currentUser = getUserFromStorage();

      setDarkModeState(isDark);
      setNotificationsEnabledState(notif);
      setUser(currentUser);
    } catch (error) {
      console.error('Erreur initialisation useUserDropdown:', error);
    }
  }, []);

  // Actions
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkModeState(newDarkMode);
    setDarkMode(newDarkMode);
  }, [darkMode]);

  const toggleNotifications = useCallback(() => {
    const newNotifications = !notificationsEnabled;
    setNotificationsEnabledState(newNotifications);
    setNotificationsEnabled(newNotifications);
  }, [notificationsEnabled]);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const userStats = await fetchUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isOpen,
    darkMode,
    notificationsEnabled,
    user,
    stats,
    isLoading,
    toggleDropdown,
    closeDropdown,
    openDropdown,
    toggleDarkMode,
    toggleNotifications,
    loadStats,
  };
};

/**
 * Hook pour gérer le click outside
 * Ferme le dropdown quand on clique en dehors
 */
interface UseClickOutsideOptions {
  onClose: () => void;
}

export const useClickOutside = (
  ref: React.RefObject<HTMLDivElement>,
  { onClose }: UseClickOutsideOptions
): void => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, onClose]);
};

/**
 * Hook pour gérer les touches clavier
 * Ferme le dropdown avec Escape
 */
interface UseKeyboardOptions {
  onEscape: () => void;
}

export const useKeyboard = (
  { onEscape }: UseKeyboardOptions,
  isActive: boolean = true
): void => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, isActive]);
};

/**
 * Hook pour récupérer les données utilisateur
 * Combine user et stats
 */
export const useUserData = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = getUserFromStorage();
        const stats = await fetchUserStats();

        setUserData({
          ...user,
          stats,
        });
      } catch (error) {
        console.error('Erreur chargement user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  return { userData, isLoading };
};

/**
 * Hook pour les animations du dropdown
 */
export const useDropdownAnimation = (isOpen: boolean) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Petit délai pour trigger l'animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Attendre la durée de l'animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return { shouldRender, isAnimating };
};

/**
 * Hook pour synchroniser le mode sombre avec le DOM
 */
export const useDarkModeSync = (darkMode: boolean) => {
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
};

/**
 * Hook pour tracker les changements de user
 */
export const useUserChange = (callback: (user: User | null) => void) => {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          callback(newUser);
        } catch (error) {
          console.error('Erreur parsing user event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [callback]);
};
