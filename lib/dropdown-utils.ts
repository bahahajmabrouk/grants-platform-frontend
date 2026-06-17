/**
 * Utilitaires pour le UserDropdown
 * 
 * Fonctions helper pour localStorage, navigation, et gestion d'état
 */

import { User } from '@/types/auth';
import { UserStats } from '@/types/dropdown';

/**
 * Récupérer l'utilisateur depuis localStorage
 * 
 * @returns User | null
 */
export const getUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null;

  try {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Erreur lecture localStorage user:', error);
    return null;
  }
};

/**
 * Sauvegarder l'utilisateur dans localStorage
 * 
 * @param user - User object
 */
export const saveUserToStorage = (user: User): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Erreur écriture localStorage user:', error);
  }
};

/**
 * Récupérer le token d'accès
 * 
 * @returns string | null
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem('access_token');
  } catch (error) {
    console.error('Erreur lecture token:', error);
    return null;
  }
};

/**
 * Récupérer le mode sombre depuis localStorage
 * 
 * @returns boolean
 */
export const getDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem('darkMode') === 'true';
  } catch {
    return false;
  }
};

/**
 * Sauvegarder le mode sombre
 * 
 * @param isDark - boolean
 */
export const setDarkMode = (isDark: boolean): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('darkMode', String(isDark));
    
    // Appliquer le mode sombre au DOM (adapter selon votre setup)
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    console.error('Erreur sauvegarde darkMode:', error);
  }
};

/**
 * Récupérer l'état des notifications
 * 
 * @returns boolean
 */
export const getNotificationsEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;

  try {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  } catch {
    return true;
  }
};

/**
 * Sauvegarder l'état des notifications
 * 
 * @param enabled - boolean
 */
export const setNotificationsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('notificationsEnabled', String(enabled));
  } catch (error) {
    console.error('Erreur sauvegarde notifications:', error);
  }
};

/**
 * Nettoyer localStorage au logout
 */
export const clearAuthStorage = (): void => {
  if (typeof window === 'undefined') return;

  try {
    // Supprimer les données sensibles
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    
    // Optionnel: supprimer les données du step navbar
    localStorage.removeItem('pitch_id');
    localStorage.removeItem('selectedGrantIds');
    localStorage.removeItem('adapted_data');
  } catch (error) {
    console.error('Erreur nettoyage localStorage:', error);
  }
};

/**
 * Formater le nom de l'utilisateur
 * 
 * @param firstName - string
 * @param lastName - string
 * @returns string
 */
export const formatUserName = (
  firstName?: string,
  lastName?: string
): string => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Utilisateur';
};

/**
 * Obtenir les initiales pour l'avatar
 * 
 * @param firstName - string
 * @param lastName - string
 * @returns string
 */
export const getInitials = (
  firstName?: string,
  lastName?: string
): string => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase();
};

/**
 * Valider l'email
 * 
 * @param email - string
 * @returns boolean
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Mock data pour les stats utilisateur
 * À remplacer par un appel API réel
 * 
 * @returns UserStats
 */
export const getMockUserStats = (): UserStats => {
  return {
    pitches: 3,
    grants: 12,
    avgScore: 7.2,
  };
};

/**
 * Récupérer les stats utilisateur depuis l'API
 * 
 * @returns Promise<UserStats>
 */
export const fetchUserStats = async (): Promise<UserStats> => {
  try {
    const token = getAccessToken();
    
    if (!token) {
      console.warn('Pas de token disponible pour fetchUserStats');
      return getMockUserStats();
    }

    // TODO: Remplacer par votre endpoint réel
    const response = await fetch('/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const data = await response.json();
    return data as UserStats;
  } catch (error) {
    console.error('Erreur lors du chargement des stats:', error);
    // Retourner les mock data en cas d'erreur
    return getMockUserStats();
  }
};

/**
 * Déconnecter l'utilisateur
 * Nettoie localStorage et optionnellement appelle une API
 * 
 * @returns Promise<boolean>
 */
export const logout = async (): Promise<boolean> => {
  try {
    const token = getAccessToken();

    // Appel API de logout (optionnel)
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Erreur appel logout API:', error);
        // Continuer même si l'API échoue
      }
    }

    // Nettoyer le localStorage
    clearAuthStorage();
    return true;
  } catch (error) {
    console.error('Erreur lors du logout:', error);
    return false;
  }
};

/**
 * Obtenir l'avatar color en fonction du hash de l'email
 * Utilisé pour générer une couleur d'avatar consistante
 * 
 * @param email - string
 * @returns string - couleur en hex
 */
export const getAvatarColor = (email: string): string => {
  const colors = [
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F59E0B', // amber
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Vérifier si l'utilisateur est authentifié
 * 
 * @returns boolean
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken() && !!getUserFromStorage();
};
