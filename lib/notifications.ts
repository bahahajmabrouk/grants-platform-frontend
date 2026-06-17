// ── Types ──────────────────────────────────────────────

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

// ── LocalStorage key ───────────────────────────────────

const STORAGE_KEY = "gp_notifications";

// ── Helpers ────────────────────────────────────────────

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Store : lecture / écriture localStorage ────────────

export function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  // Garder max 50 notifications
  const trimmed = notifications.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ── Actions ────────────────────────────────────────────

export function addNotification(
  type: NotificationType,
  title: string,
  message: string
): Notification {
  const notif: Notification = {
    id: generateId(),
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
  };

  const existing = getNotifications();
  saveNotifications([notif, ...existing]);

  // Émettre un événement custom pour que les composants se rafraîchissent
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gp:notification", { detail: notif }));
  }

  return notif;
}

export function markAllAsRead(): void {
  const notifications = getNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(notifications);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gp:notifications:read"));
  }
}

export function clearAllNotifications(): void {
  saveNotifications([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gp:notifications:cleared"));
  }
}

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

// ── Raccourcis par type ────────────────────────────────

export const notify = {
  success: (title: string, message: string) =>
    addNotification("success", title, message),

  error: (title: string, message: string) =>
    addNotification("error", title, message),

  info: (title: string, message: string) =>
    addNotification("info", title, message),

  warning: (title: string, message: string) =>
    addNotification("warning", title, message),
};

// ── Notifications prédéfinies (flow de l'app) ──────────

export const appNotify = {
  uploadSuccess: (startupName: string) =>
    notify.success(
      "Extraction réussie",
      `✅ Pitch de "${startupName}" analysé avec succès.`
    ),

  uploadDuplicate: (startupName: string) =>
    notify.warning(
      "Pitch déjà analysé",
      `♻️ "${startupName}" a déjà été uploadé — données récupérées.`
    ),

  uploadError: () =>
    notify.error(
      "Erreur d'extraction",
      "❌ L'extraction du pitch a échoué. Réessayez."
    ),

  grantsFound: (count: number) =>
    notify.info(
      "Grants trouvés",
      `🔍 ${count} grant${count > 1 ? "s" : ""} correspondent à votre profil.`
    ),

  grantsEmpty: () =>
    notify.warning(
      "Aucun grant trouvé",
      "Aucun grant ne correspond à votre profil pour l'instant."
    ),

  adaptationReady: (grantName: string) =>
    notify.success(
      "Adaptation prête",
      `✍️ Candidature adaptée pour "${grantName}".`
    ),

  adaptationError: (grantName: string) =>
    notify.error(
      "Erreur d'adaptation",
      `❌ Impossible d'adapter le pitch pour "${grantName}".`
    ),

  submissionMarked: (grantName: string) =>
    notify.success(
      "Soumission enregistrée",
      `📬 Candidature pour "${grantName}" marquée comme soumise.`
    ),
};