/**
 * Types pour le composant UserDropdown
 */

import { User } from '@/types/auth';

/**
 * Interface pour les statistiques utilisateur
 * 
 * @property pitches - Nombre de pitchs créés
 * @property grants - Nombre de grants trouvés
 * @property avgScore - Score moyen sur 10
 */
export interface UserStats {
  pitches: number;
  grants: number;
  avgScore: number;
}

/**
 * Interface pour le profil utilisateur complet
 * Combine User existant avec les stats
 */
export interface UserProfile extends User {
  stats?: UserStats;
  isVerified?: boolean;
}

/**
 * Types pour localStorage
 */
export interface LocalStorageKeys {
  darkMode: string;                  // 'true' | 'false'
  notificationsEnabled: string;      // 'true' | 'false'
  access_token: string;              // JWT token
  user: string;                       // User JSON string
  pitch_id?: string;                  // Pour le step navbar
  selectedGrantIds?: string;         // Pour le step navbar
  adapted_data?: string;             // Pour le step navbar
}

/**
 * Props pour les notifications toast
 */
export interface NotificationToast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

/**
 * État du dropdown
 */
export interface DropdownState {
  isOpen: boolean;
  darkMode: boolean;
  notificationsEnabled: boolean;
  isLoading: boolean;
}
