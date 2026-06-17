"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUser, isAuthenticated } from "@/lib/auth";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";
import UserDropdown from "@/components/UserDropdown";

interface UserStats { pitches: number; grants: number; submissions: number; }

interface UserProfile extends User {
  bio?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  expertise?: string[];
  sectors?: string[];
  notification_email?: boolean;
  notification_sms?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]   = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ pitches: 0, grants: 0, submissions: 0 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState<"personal"|"preferences"|"security"|"history">("personal");
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [newExpertise, setNewExpertise] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // password fields
  const [oldPwd, setOldPwd]       = useState("");
  const [newPwd, setNewPwd]       = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError]   = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    const fetchData = async () => {
      const token = getAccessToken();
      try {
        const userData = getUser() as UserProfile;
        if (userData) { setUser(userData); setFormData(userData); }
        const statsRes = await fetch(`${API_URL}/api/v1/auth/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) setStats(await statsRes.json());
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  const handleSaveProfile = async () => {
    setSaving(true); setSaveSuccess(false);
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) { setUser(await res.json()); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
    } catch {}
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPwdError(""); setPwdSuccess(false);
    if (newPwd !== confirmPwd) { setPwdError("Les mots de passe ne correspondent pas."); return; }
    if (newPwd.length < 8) { setPwdError("Minimum 8 caractères."); return; }
    const token = getAccessToken();
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: oldPwd, new_password: newPwd }),
      });
      if (res.ok) { setPwdSuccess(true); setOldPwd(""); setNewPwd(""); setConfirmPwd(""); }
      else { const d = await res.json(); setPwdError(d.detail || "Erreur"); }
    } catch { setPwdError("Erreur réseau."); }
  };

  const addExpertise = () => {
    if (!newExpertise.trim()) return;
    setFormData({ ...formData, expertise: [...(formData.expertise || []), newExpertise.trim()] });
    setNewExpertise("");
  };
  const removeExpertise = (i: number) =>
    setFormData({ ...formData, expertise: formData.expertise?.filter((_, idx) => idx !== i) });

  const profileCompletion = (() => {
    if (!user) return 0;
    const fields = [user.first_name, user.last_name, user.email, user.company_name];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  const initials = (user?.first_name?.[0] || "").toUpperCase() + (user?.last_name?.[0] || "").toUpperCase();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#7d8590", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #21262d", borderTopColor: "#3fb950", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        Chargement du profil...
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d1117; color: #e6edf3; font-family: 'Segoe UI', system-ui, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

        .nav {
          border-bottom: 1px solid #21262d; padding: 16px 40px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(13,17,23,0.95); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 50;
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; }
        .nav-logo-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .nav-logo-text { font-size: 15px; font-weight: 700; color: white; }

        .page { min-height: 100vh; background: #0d1117; }
        .container { max-width: 900px; margin: 0 auto; padding: 40px; }

        /* ── PROFILE HERO ── */
        .profile-hero {
          background: #161b22; border: 1px solid #21262d; border-radius: 16px;
          padding: 32px; margin-bottom: 24px; display: flex; gap: 28px; align-items: flex-start;
          animation: fadeIn 0.3s ease;
        }
        .hero-avatar {
          width: 88px; height: 88px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700; color: white;
          border: 3px solid rgba(35,134,54,0.3);
        }
        .hero-info { flex: 1; min-width: 0; }
        .hero-name { font-size: 22px; font-weight: 800; color: white; margin-bottom: 4px; }
        .hero-email { font-size: 13px; color: #7d8590; margin-bottom: 4px; }
        .hero-company-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .hero-company { font-size: 13px; color: #58a6ff; }
        .hero-plan {
          font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
          background: rgba(35,134,54,0.15); border: 1px solid rgba(35,134,54,0.3); color: #3fb950;
        }
        .hero-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .hero-stat {
          background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 10px 12px; text-align: center;
        }
        .hero-stat-val { font-size: 20px; font-weight: 800; color: white; line-height: 1; }
        .hero-stat-lbl { font-size: 10px; color: #7d8590; margin-top: 4px; letter-spacing: 0.5px; }
        .completion-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .completion-label { font-size: 11px; color: #7d8590; }
        .completion-pct { font-size: 11px; font-weight: 700; color: #3fb950; }
        .completion-track { height: 4px; background: #21262d; border-radius: 4px; overflow: hidden; }
        .completion-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #238636, #3fb950); transition: width 0.6s ease; }

        /* ── TABS ── */
        .tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid #21262d; }
        .tab {
          padding: 10px 16px; font-size: 13px; font-weight: 600; color: #7d8590;
          border: none; background: transparent; cursor: pointer; transition: all 0.15s;
          border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px;
        }
        .tab:hover { color: #adbac7; }
        .tab.active { color: #3fb950; border-bottom-color: #3fb950; }

        /* ── SECTIONS ── */
        .section {
          background: #161b22; border: 1px solid #21262d; border-radius: 12px;
          padding: 24px; margin-bottom: 16px; animation: fadeIn 0.25s ease;
        }
        .section-title {
          font-size: 13px; font-weight: 700; color: #adbac7; margin-bottom: 16px;
          text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-title::before { content: ""; display: block; width: 3px; height: 14px; background: #238636; border-radius: 2px; }

        /* ── FORM ── */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 11px; font-weight: 600; color: #7d8590; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-input {
          background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
          padding: 10px 12px; color: #e6edf3; font-size: 13px; font-family: inherit; transition: all 0.15s;
          width: 100%;
        }
        .form-input:focus { outline: none; border-color: #3fb950; box-shadow: 0 0 0 3px rgba(35,134,54,0.1); }
        .form-input::placeholder { color: #4a5568; }
        .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
        textarea.form-input { resize: vertical; min-height: 80px; }

        /* ── TAGS ── */
        .tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .tag {
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; padding: 5px 12px; border-radius: 20px; font-size: 12px;
          display: flex; align-items: center; gap: 6px;
        }
        .tag-remove { cursor: pointer; font-size: 11px; opacity: 0.6; transition: opacity 0.15s; }
        .tag-remove:hover { opacity: 1; color: #f85149; }
        .tag-input-row { display: flex; gap: 8px; }
        .tag-input-row .form-input { flex: 1; }

        /* ── CHECKBOX ── */
        .checkbox-row {
          display: flex; align-items: center; gap: 12px; padding: 12px;
          background: #0d1117; border: 1px solid #21262d; border-radius: 8px; margin-bottom: 8px; cursor: pointer;
        }
        .checkbox-row:hover { border-color: #30363d; }
        .checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #3fb950; cursor: pointer; }
        .checkbox-row label { font-size: 13px; color: #adbac7; cursor: pointer; flex: 1; }
        .checkbox-row .check-sub { font-size: 11px; color: #7d8590; }

        /* ── BUTTONS ── */
        .btn-row { display: flex; gap: 12px; margin-top: 20px; align-items: center; }
        .btn-primary {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px;
        }
        .btn-primary:hover:not(:disabled) { background: #2ea043; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary {
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
        }
        .btn-secondary:hover { border-color: #7d8590; color: #adbac7; }
        .btn-danger {
          background: transparent; border: 1px solid rgba(248,81,73,0.3); color: #f85149;
          font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
        }
        .btn-danger:hover { background: rgba(248,81,73,0.08); }

        /* ── ALERTS ── */
        .alert-success {
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; padding: 10px 14px; border-radius: 8px; font-size: 12px;
          display: flex; align-items: center; gap: 8px; animation: fadeIn 0.2s ease;
        }
        .alert-error {
          background: rgba(248,81,73,0.05); border: 1px solid rgba(248,81,73,0.3);
          color: #f85149; padding: 10px 14px; border-radius: 8px; font-size: 12px;
          display: flex; align-items: center; gap: 8px;
        }

        /* ── HISTORY ITEMS ── */
        .history-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px; background: #0d1117; border: 1px solid #21262d;
          border-radius: 8px; margin-bottom: 8px;
        }
        .history-title { font-size: 13px; color: #adbac7; }
        .history-date { font-size: 11px; color: #7d8590; margin-top: 2px; }
        .status-badge {
          font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
        }
        .status-active { color: #3fb950; background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.2); }
        .status-pending { color: #d29922; background: rgba(210,153,34,0.1); border: 1px solid rgba(210,153,34,0.2); }

        /* ── SESSION CARD ── */
        .session-item {
          display: flex; align-items: center; gap: 12px; padding: 14px;
          background: #0d1117; border: 1px solid #21262d; border-radius: 8px; margin-bottom: 8px;
        }
        .session-icon {
          width: 36px; height: 36px; border-radius: 8px; background: rgba(35,134,54,0.1);
          border: 1px solid rgba(35,134,54,0.2); display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .session-info { flex: 1; }
        .session-name { font-size: 13px; color: #e6edf3; font-weight: 600; }
        .session-detail { font-size: 11px; color: #7d8590; margin-top: 2px; }

        @media (max-width: 768px) {
          .container { padding: 20px; }
          .nav { padding: 12px 20px; }
          .profile-hero { flex-direction: column; }
          .form-grid { grid-template-columns: 1fr; }
          .hero-stats { grid-template-columns: repeat(3,1fr); }
          .tabs { overflow-x: auto; }
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
            {user && <UserDropdown user={user} />}
          </div>
        </nav>

        <div className="container">

          {/* ── PROFILE HERO ── */}
          <div className="profile-hero">
            <div className="hero-avatar">{initials}</div>
            <div className="hero-info">
              <div className="hero-name">{user?.first_name} {user?.last_name}</div>
              <div className="hero-email">{user?.email}</div>
              <div className="hero-company-row">
                <span className="hero-company">{user?.company_name || "Pas de société"}</span>
                <span className="hero-plan">Free</span>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-val">{stats.pitches}</div>
                  <div className="hero-stat-lbl">Pitches</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-val">{stats.grants}</div>
                  <div className="hero-stat-lbl">Grants</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-val">{stats.submissions}</div>
                  <div className="hero-stat-lbl">Soumis</div>
                </div>
              </div>
              <div className="completion-row">
                <span className="completion-label">Profil complété</span>
                <span className="completion-pct">{profileCompletion}%</span>
              </div>
              <div className="completion-track">
                <div className="completion-fill" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="tabs">
            {([
              { id: "personal",    label: "Informations",  icon: "👤" },
              { id: "preferences", label: "Préférences",   icon: "⚙️" },
              { id: "security",    label: "Sécurité",      icon: "🔒" },
              { id: "history",     label: "Historique",    icon: "📋" },
            ] as const).map(({ id, label, icon }) => (
              <button key={id} className={`tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* ── TAB: PERSONAL ── */}
          {activeTab === "personal" && (
            <>
              <div className="section">
                <div className="section-title">Informations de base</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Prénom</label>
                    <input className="form-input" value={formData.first_name || ""}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={formData.last_name || ""}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={formData.email || ""} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="form-input" placeholder="+216 XX XXX XXX" value={formData.phone || ""}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Société</label>
                    <input className="form-input" value={formData.company_name || ""}
                      onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secteur</label>
                    <input className="form-input" placeholder="Tech, Finance, Santé..." value={formData.sectors?.[0] || ""}
                      onChange={e => setFormData({ ...formData, sectors: [e.target.value] })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-input" rows={3} placeholder="Décrivez-vous en quelques lignes..."
                    value={formData.bio || ""}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                </div>
              </div>

              <div className="section">
                <div className="section-title">Liens professionnels</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">LinkedIn</label>
                    <input className="form-input" placeholder="https://linkedin.com/in/..." value={formData.linkedin || ""}
                      onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site web</label>
                    <input className="form-input" placeholder="https://..." value={formData.website || ""}
                      onChange={e => setFormData({ ...formData, website: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">Domaines d'expertise</div>
                <div className="tag-input-row">
                  <input className="form-input" placeholder="Ajouter une compétence..."
                    value={newExpertise}
                    onChange={e => setNewExpertise(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addExpertise(); } }} />
                  <button className="btn-primary" onClick={addExpertise}>+ Ajouter</button>
                </div>
                {(formData.expertise?.length || 0) > 0 && (
                  <div className="tags-wrap">
                    {formData.expertise?.map((exp, i) => (
                      <div key={i} className="tag">
                        {exp}
                        <span className="tag-remove" onClick={() => removeExpertise(i)}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="btn-row">
                <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
                </button>
                {saveSuccess && <div className="alert-success">✅ Profil mis à jour avec succès !</div>}
              </div>
            </>
          )}

          {/* ── TAB: PREFERENCES ── */}
          {activeTab === "preferences" && (
            <div className="section">
              <div className="section-title">Notifications</div>
              <div className="checkbox-row">
                <input type="checkbox" id="email-notif" checked={formData.notification_email || false}
                  onChange={e => setFormData({ ...formData, notification_email: e.target.checked })} />
                <label htmlFor="email-notif">
                  <div>📧 Notifications par email</div>
                  <div className="check-sub">Recevoir les alertes de nouveaux grants par email</div>
                </label>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" id="sms-notif" checked={formData.notification_sms || false}
                  onChange={e => setFormData({ ...formData, notification_sms: e.target.checked })} />
                <label htmlFor="sms-notif">
                  <div>📱 Notifications SMS</div>
                  <div className="check-sub">Recevoir les rappels de délais par SMS</div>
                </label>
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
                </button>
                {saveSuccess && <div className="alert-success">✅ Préférences sauvegardées !</div>}
              </div>
            </div>
          )}

          {/* ── TAB: SECURITY ── */}
          {activeTab === "security" && (
            <>
              <div className="section">
                <div className="section-title">Changer le mot de passe</div>
                <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="form-group">
                    <label className="form-label">Mot de passe actuel</label>
                    <input type="password" className="form-input" placeholder="••••••••"
                      value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nouveau mot de passe</label>
                    <input type="password" className="form-input" placeholder="Min. 8 caractères"
                      value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirmer le mot de passe</label>
                    <input type="password" className="form-input" placeholder="••••••••"
                      value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
                  </div>
                </div>
                <div className="btn-row">
                  <button className="btn-primary" onClick={handleChangePassword}>🔐 Changer</button>
                  {pwdSuccess && <div className="alert-success">✅ Mot de passe changé !</div>}
                  {pwdError && <div className="alert-error">⚠️ {pwdError}</div>}
                </div>
              </div>

              <div className="section">
                <div className="section-title">Session active</div>
                <div className="session-item">
                  <div className="session-icon">💻</div>
                  <div className="session-info">
                    <div className="session-name">Windows — Chrome</div>
                    <div className="session-detail">Tunis, TN • Session actuelle</div>
                  </div>
                  <span className="status-badge status-active">Active</span>
                </div>
              </div>
            </>
          )}

          {/* ── TAB: HISTORY ── */}
          {activeTab === "history" && (
            <>
              <div className="section">
                <div className="section-title">Mes pitches uploadés</div>
                {stats.pitches === 0 ? (
                  <div style={{ color: "#7d8590", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                    Aucun pitch uploadé pour l'instant.
                  </div>
                ) : (
                  <div className="history-item">
                    <div>
                      <div className="history-title">Pitch deck uploadé</div>
                      <div className="history-date">{stats.pitches} pitch(es) au total</div>
                    </div>
                    <button className="btn-secondary" style={{ fontSize: "12px", padding: "6px 12px" }}
                      onClick={() => router.push("/upload")}>
                      Voir →
                    </button>
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-title">Dernières soumissions</div>
                {stats.submissions === 0 ? (
                  <div style={{ color: "#7d8590", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                    Aucune soumission pour l'instant.
                  </div>
                ) : (
                  <div className="history-item">
                    <div>
                      <div className="history-title">Soumissions en cours</div>
                      <div className="history-date">{stats.submissions} soumission(s)</div>
                    </div>
                    <span className="status-badge status-pending">En attente</span>
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-title">Activité récente</div>
                <div className="history-item">
                  <div>
                    <div className="history-title">Connexion</div>
                    <div className="history-date">Aujourd'hui</div>
                  </div>
                </div>
                <div className="history-item">
                  <div>
                    <div className="history-title">Profil consulté</div>
                    <div className="history-date">Aujourd'hui</div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}