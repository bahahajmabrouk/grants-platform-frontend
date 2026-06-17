"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, clearAuth, getUser } from "@/lib/auth";
import { User } from "@/types/auth";

interface UserStats { pitches: number; grants: number; submissions: number; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UserDropdownProps {
  user: User;
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({ pitches: 0, grants: 0, submissions: 0 });

  const fetchUserStats = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const profileCompletion = (() => {
    const fields = [user.first_name, user.last_name, user.email, user.company_name];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const initials =
    (user.first_name?.[0] || "").toUpperCase() +
    (user.last_name?.[0] || "").toUpperCase();

  return (
    <>
      <style>{`
        .user-profile-wrapper { position: relative; }
        .user-profile-card {
          display: flex; align-items: center; gap: 12px; padding: 8px 16px;
          background: rgba(21,25,32,0.5); border: 1px solid #30363d; border-radius: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .user-profile-card:hover { background: rgba(31,35,42,0.8); border-color: #3fb950; }
        .profile-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;
        }
        .profile-name { font-size: 13px; font-weight: 600; color: white; }
        .profile-company { font-size: 11px; color: #7d8590; }
        .profile-chevron { font-size: 12px; color: #7d8590; transition: transform 0.2s; margin-left: 4px; }
        .profile-chevron.active { transform: rotate(180deg); color: #3fb950; }

        .profile-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #161b22; border: 1px solid #30363d; border-radius: 14px;
          width: 300px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); z-index: 100;
          opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
          overflow: hidden;
        }
        .profile-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }

        .dd-header {
          padding: 16px; background: #0d1117;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .dd-avatar {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: white;
        }
        .dd-info { flex: 1; min-width: 0; }
        .dd-name { font-size: 13px; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dd-email { font-size: 11px; color: #7d8590; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dd-company-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        .dd-company { font-size: 11px; color: #58a6ff; }
        .dd-plan {
          font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.5px;
          background: rgba(35,134,54,0.15); border: 1px solid rgba(35,134,54,0.3); color: #3fb950;
        }

        .dd-stats {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: #21262d;
          border-top: 1px solid #21262d; border-bottom: 1px solid #21262d;
        }
        .dd-stat { background: #0d1117; padding: 12px 8px; text-align: center; }
        .dd-stat-val { font-size: 18px; font-weight: 700; color: white; line-height: 1; }
        .dd-stat-lbl { font-size: 10px; color: #7d8590; margin-top: 4px; letter-spacing: 0.3px; }

        .dd-progress { padding: 12px 16px; border-bottom: 1px solid #21262d; }
        .dd-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
        .dd-progress-label { font-size: 11px; color: #7d8590; }
        .dd-progress-pct { font-size: 11px; font-weight: 700; color: #3fb950; }
        .dd-progress-track { height: 4px; background: #21262d; border-radius: 4px; overflow: hidden; }
        .dd-progress-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #238636, #3fb950); transition: width 0.6s ease;
        }

        .dd-body { padding: 6px; }
        .dd-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 10px;
          color: #adbac7; font-size: 13px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
        }
        .dd-item:hover { background: rgba(35,134,54,0.08); color: #e6edf3; }
        .dd-item-icon { font-size: 15px; flex-shrink: 0; width: 20px; text-align: center; }
        .dd-item-badge {
          margin-left: auto; font-size: 11px; font-weight: 600;
          color: #7d8590; background: #21262d; padding: 1px 7px; border-radius: 10px;
        }
        .dd-item-dot {
          margin-left: auto; width: 8px; height: 8px; border-radius: 50%; background: #f85149; flex-shrink: 0;
        }
        .dd-sep { height: 1px; background: #21262d; margin: 4px 6px; }
        .dd-item.logout { color: #f85149; }
        .dd-item.logout:hover { background: rgba(248,81,73,0.08); color: #ff7b72; }

        @media (max-width: 768px) {
          .profile-dropdown { width: calc(100vw - 32px); right: -8px; }
        }
      `}</style>

      <div className="user-profile-wrapper">
        {/* Trigger */}
        <div
          className="user-profile-card"
          onClick={() => setShowDropdown(!showDropdown)}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="profile-avatar">{initials}</div>
          <div>
            <div className="profile-name">{user.first_name} {user.last_name}</div>
            <div className="profile-company">{user.company_name || "No company"}</div>
          </div>
          <div className={`profile-chevron ${showDropdown ? "active" : ""}`}>▼</div>
        </div>

        {/* Dropdown */}
        <div
          className={`profile-dropdown ${showDropdown ? "active" : ""}`}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {/* Header */}
          <div className="dd-header">
            <div className="dd-avatar">{initials}</div>
            <div className="dd-info">
              <div className="dd-name">{user.first_name} {user.last_name}</div>
              <div className="dd-email">{user.email}</div>
              <div className="dd-company-row">
                <span className="dd-company">{user.company_name || "No company"}</span>
                <span className="dd-plan">Free</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="dd-stats">
            <div className="dd-stat">
              <div className="dd-stat-val">{userStats.pitches}</div>
              <div className="dd-stat-lbl">Pitches</div>
            </div>
            <div className="dd-stat">
              <div className="dd-stat-val">{userStats.grants}</div>
              <div className="dd-stat-lbl">Grants</div>
            </div>
            <div className="dd-stat">
              <div className="dd-stat-val">{userStats.submissions}</div>
              <div className="dd-stat-lbl">Soumis</div>
            </div>
          </div>

          {/* Progression profil */}
          <div className="dd-progress">
            <div className="dd-progress-header">
              <span className="dd-progress-label">Profil complété</span>
              <span className="dd-progress-pct">{profileCompletion}%</span>
            </div>
            <div className="dd-progress-track">
              <div className="dd-progress-fill" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>

          {/* Navigation */}
          <div className="dd-body">
            <div className="dd-item" onClick={() => { setShowDropdown(false); router.push("/profile"); }}>
              <span className="dd-item-icon">👤</span>
              Mon profil
            </div>
            <div className="dd-item" onClick={() => { setShowDropdown(false); router.push("/pitches"); }}>
              <span className="dd-item-icon">📁</span>
              Mes pitches
              <span className="dd-item-badge">{userStats.pitches}</span>
            </div>
            <div className="dd-item" onClick={() => { setShowDropdown(false); router.push("/submissions"); }}>
              <span className="dd-item-icon">📋</span>
              Soumissions
              {userStats.submissions > 0 && <div className="dd-item-dot" />}
            </div>
            <div className="dd-item" onClick={() => { setShowDropdown(false); router.push("/settings"); }}>
              <span className="dd-item-icon">⚙️</span>
              Paramètres
            </div>
            <div className="dd-sep" />
            <div className="dd-item logout" onClick={() => { setShowDropdown(false); handleLogout(); }}>
              <span className="dd-item-icon">🚪</span>
              Logout
            </div>
          </div>
        </div>
      </div>
    </>
  );
}