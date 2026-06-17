"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { addNotification, NotificationType } from "@/lib/notifications";

// ── Types ──────────────────────────────────────────────

interface Toast {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface ToastContextValue {
  addToast: (type: NotificationType, title: string, message: string) => void;
}

// ── Context ────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ── Colors per type ────────────────────────────────────

const TOAST_STYLES: Record<NotificationType, { border: string; icon: string; iconColor: string; bg: string }> = {
  success: {
    bg: "rgba(22,27,34,0.98)",
    border: "rgba(35,134,54,0.5)",
    icon: "✅",
    iconColor: "#3fb950",
  },
  error: {
    bg: "rgba(22,27,34,0.98)",
    border: "rgba(248,81,73,0.5)",
    icon: "❌",
    iconColor: "#f85149",
  },
  info: {
    bg: "rgba(22,27,34,0.98)",
    border: "rgba(88,166,255,0.5)",
    icon: "🔍",
    iconColor: "#58a6ff",
  },
  warning: {
    bg: "rgba(22,27,34,0.98)",
    border: "rgba(210,153,34,0.5)",
    icon: "⚠️",
    iconColor: "#d29922",
  },
};

// ── Toast Item ─────────────────────────────────────────

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const s = TOAST_STYLES[toast.type];

  useEffect(() => {
    // Entrée
    const t1 = setTimeout(() => setVisible(true), 10);
    // Sortie
    const t2 = setTimeout(() => setVisible(false), 4000);
    // Suppression
    const t3 = setTimeout(() => onRemove(toast.id), 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [toast.id, onRemove]);

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(100%); }
        }
        .toast-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px;
          background: ${s.bg};
          border: 1px solid ${s.border};
          border-radius: 10px;
          min-width: 300px; max-width: 380px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          animation: toast-in 0.3s ease forwards;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .toast-item.hiding {
          animation: toast-out 0.35s ease forwards;
        }
        .toast-progress {
          position: absolute; bottom: 0; left: 0;
          height: 2px; background: ${s.border};
          animation: progress 4s linear forwards;
        }
        @keyframes progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .toast-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .toast-title { font-size: 13px; font-weight: 700; color: #e6edf3; margin-bottom: 2px; }
        .toast-msg { font-size: 12px; color: #7d8590; line-height: 1.4; }
        .toast-close {
          margin-left: auto; background: none; border: none;
          color: #7d8590; cursor: pointer; font-size: 14px; flex-shrink: 0;
          padding: 0; line-height: 1;
        }
        .toast-close:hover { color: #e6edf3; }
      `}</style>
      <div
        className={`toast-item ${!visible ? "hiding" : ""}`}
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 350); }}
      >
        <span className="toast-icon">{s.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.message}</div>
        </div>
        <button className="toast-close" onClick={(e) => { e.stopPropagation(); setVisible(false); setTimeout(() => onRemove(toast.id), 350); }}>✕</button>
        <div className="toast-progress" />
      </div>
    </>
  );
}

// ── Provider ───────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: NotificationType, title: string, message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      // Ajouter au store localStorage aussi
      addNotification(type, title, message);
      // Ajouter au state local pour affichage
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "all" }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}