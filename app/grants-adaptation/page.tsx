"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, clearAuth } from "@/lib/auth";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";

export default function GrantsAdaptationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGrantIds, setSelectedGrantIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      const userData = getUser();
      setUser(userData);

      // Retrieve selected grants from localStorage
      const grants = localStorage.getItem("selectedGrantIds");
      if (grants) {
        setSelectedGrantIds(JSON.parse(grants));
      }

      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d1117; color: #e6edf3; font-family: 'Segoe UI', system-ui, sans-serif; }

        .page { min-height: 100vh; background: #0d1117; padding: 0; }

        /* NAV */
        .nav {
          border-bottom: 1px solid #21262d;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(13,17,23,0.95);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-logo { display: flex; align-items: center; gap: 10px; }
        .nav-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .nav-logo-text { font-size: 15px; font-weight: 700; color: white; }

        .nav-steps { display: flex; gap: 4px; }
        .nav-step {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #30363d;
          color: #7d8590;
          cursor: default;
        }
        .nav-step.active {
          background: rgba(35,134,54,0.15);
          border-color: rgba(35,134,54,0.4);
          color: #3fb950;
        }

        /* USER PROFILE CARD */
        .user-profile-wrapper {
          position: relative;
        }

        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(21,25,32,0.5);
          border: 1px solid #30363d;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-profile-card:hover {
          background: rgba(31,35,42,0.8);
          border-color: #3fb950;
        }

        .profile-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-company {
          font-size: 11px;
          color: #7d8590;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-chevron {
          font-size: 12px;
          color: #7d8590;
          transition: transform 0.2s ease;
          flex-shrink: 0;
          margin-left: 4px;
        }

        .profile-chevron.active {
          transform: rotate(180deg);
          color: #3fb950;
        }

        /* DROPDOWN MENU */
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: all 0.2s ease;
        }

        .profile-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .dropdown-header {
          padding: 16px;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dropdown-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .dropdown-user-name {
          font-size: 13px;
          font-weight: 700;
          color: white;
        }

        .dropdown-user-email {
          font-size: 12px;
          color: #7d8590;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-user-company {
          font-size: 11px;
          color: #58a6ff;
          font-weight: 500;
        }

        .dropdown-body {
          padding: 8px 8px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          color: #7d8590;
          font-size: 13px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dropdown-item:hover {
          background: rgba(35,134,54,0.1);
          color: #adbac7;
        }

        .dropdown-item.logout {
          color: #f85149;
          border-top: 1px solid #21262d;
          margin-top: 4px;
          padding-top: 10px;
        }

        .dropdown-item.logout:hover {
          background: rgba(248,81,73,0.1);
          color: #ff7b72;
        }

        /* CONTENT */
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 60px 40px;
          text-align: center;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(35,134,54,0.1);
          border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3fb950;
          animation: pulse 2s infinite;
        }

        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

        .title {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.2;
          color: white;
          margin-bottom: 12px;
        }

        .subtitle {
          font-size: 14px;
          color: #7d8590;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .placeholder-card {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 16px;
          padding: 60px 40px;
          margin-bottom: 24px;
        }

        .placeholder-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .placeholder-text {
          font-size: 14px;
          color: #7d8590;
          margin-bottom: 10px;
        }

        .placeholder-count {
          font-size: 13px;
          color: #7d8590;
          background: rgba(35,134,54,0.1);
          padding: 8px 16px;
          border-radius: 8px;
          display: inline-block;
          margin-top: 16px;
        }

        .button-group {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #30363d;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-secondary {
          background: transparent;
          color: #7d8590;
        }

        .btn-secondary:hover {
          border-color: #3fb950;
          color: #3fb950;
        }

        .btn-primary {
          background: #238636;
          border-color: #2ea043;
          color: white;
        }

        .btn-primary:hover {
          background: #2ea043;
          border-color: #31c42f;
        }

        @media (max-width: 768px) {
          .container {
            padding: 40px 20px;
          }

          .title {
            font-size: 24px;
          }

          .button-group {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚀</div>
            <span className="nav-logo-text">Grants Platform</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <StepsNavbar />

            {/* USER PROFILE SECTION */}
            {isLoading ? (
              <div style={{ padding: "8px 16px", color: "#7d8590", fontSize: "13px" }}>
                Chargement...
              </div>
            ) : user ? (
              <div className="user-profile-wrapper">
                <div
                  className="user-profile-card"
                  onClick={() => setShowDropdown(!showDropdown)}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="profile-avatar">
                    {(user.first_name?.[0] || "").toUpperCase()}
                    {(user.last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="profile-company">
                      {user.company_name || "No company"}
                    </div>
                  </div>
                  <div className={`profile-chevron ${showDropdown ? "active" : ""}`}>
                    ▼
                  </div>
                </div>

                {/* DROPDOWN MENU */}
                <div
                  className={`profile-dropdown ${showDropdown ? "active" : ""}`}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {(user.first_name?.[0] || "").toUpperCase()}
                      {(user.last_name?.[0] || "").toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="dropdown-user-email">{user.email}</div>
                      <div className="dropdown-user-company">
                        {user.company_name || "No company"}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-body">
                    <div
                      className="dropdown-item logout"
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogout();
                      }}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        {/* CONTENT */}
        <div className="container">
          <div className="badge">
            <div className="badge-dot"></div>
            Étape 3 sur 4
          </div>

          <h1 className="title">Personnalisez Vos Candidatures</h1>
          <p className="subtitle">
            Adaptez votre pitch deck pour chaque grant en fonction de leurs critères spécifiques.
          </p>

          <div className="placeholder-card">
            <div className="placeholder-icon">🎯</div>
            <div className="placeholder-text" style={{ fontSize: "16px", fontWeight: "600", color: "#e6edf3" }}>
              Cette page est en cours de développement
            </div>
            <div className="placeholder-text">
              Ici, vous pourrez adapter votre pitch deck pour les grants sélectionnés.
            </div>
            {selectedGrantIds.length > 0 && (
              <div className="placeholder-count">
                📋 {selectedGrantIds.length} grant{selectedGrantIds.length !== 1 ? "s" : ""} à adapter
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={() => router.push("/grants")}
            >
              ← Retour
            </button>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/submissions")}
            >
              Continuer →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
