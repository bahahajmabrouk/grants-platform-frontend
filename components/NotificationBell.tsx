"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearAllNotifications,
  getNotifications,
  markAllAsRead,
  Notification,
} from "@/lib/notifications";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    const list = getNotifications();
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("gp:notification", handler);
    window.addEventListener("gp:notifications:read", handler);
    window.addEventListener("gp:notifications:cleared", handler);
    return () => {
      window.removeEventListener("gp:notification", handler);
      window.removeEventListener("gp:notifications:read", handler);
      window.removeEventListener("gp:notifications:cleared", handler);
    };
  }, [refresh]);

  const handleMarkAll = () => {
    markAllAsRead();
    refresh();
  };

  const handleClear = () => {
    clearAllNotifications();
    refresh();
  };

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .notif-btn {
          position: relative;
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(21,25,32,0.5);
          border: 1px solid #30363d;
          color: #e6edf3;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .notif-btn:hover { border-color: #3fb950; background: rgba(31,35,42,0.8); }
        .notif-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 999px; background: #f85149; color: white;
          font-size: 10px; font-weight: 700; line-height: 18px; text-align: center;
          border: 1px solid #1f2328;
        }
        .notif-panel {
          position: absolute; right: 0; top: calc(100% + 10px);
          width: 340px; max-height: 360px; overflow: hidden;
          background: #161b22; border: 1px solid #30363d; border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          z-index: 200; display: flex; flex-direction: column;
        }
        .notif-header {
          padding: 12px 14px; border-bottom: 1px solid #21262d;
          display: flex; align-items: center; justify-content: space-between;
        }
        .notif-title { font-size: 12px; font-weight: 700; color: #e6edf3; }
        .notif-actions { display: flex; gap: 8px; }
        .notif-action {
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 11px; padding: 4px 8px; border-radius: 6px; cursor: pointer;
        }
        .notif-action:hover { border-color: #7d8590; color: #e6edf3; }
        .notif-list { overflow-y: auto; max-height: 300px; }
        .notif-item {
          padding: 10px 14px; border-bottom: 1px solid #21262d;
          display: flex; flex-direction: column; gap: 4px;
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item.unread { background: rgba(35,134,54,0.05); }
        .notif-item-title { font-size: 12px; font-weight: 700; color: #e6edf3; }
        .notif-item-msg { font-size: 12px; color: #7d8590; line-height: 1.4; }
        .notif-empty {
          padding: 20px 14px; font-size: 12px; color: #7d8590; text-align: center;
        }
        @media (max-width: 768px) {
          .notif-panel { width: calc(100vw - 32px); right: -8px; }
        }
      `}</style>

      <button className="notif-btn" onClick={() => setIsOpen((v) => !v)}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-header">
            <span className="notif-title">Notifications</span>
            <div className="notif-actions">
              <button className="notif-action" onClick={handleMarkAll}>
                Tout lire
              </button>
              <button className="notif-action" onClick={handleClear}>
                Effacer
              </button>
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">Aucune notification pour le moment.</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item ${n.read ? "" : "unread"}`}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-msg">{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
