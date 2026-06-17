"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, getAccessToken } from "@/lib/auth";
import { User } from "@/types/auth";
import { Grant, AdaptedGrant } from "@/types/grants";
import StepsNavbar from "@/components/StepsNavbar";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/components/ui/ToastProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiAdaptPitch(
  pitchId: string,
  grant: Grant,
  token: string
): Promise<{ adapted_text: string; key_points: string[]; word_count: number }> {
  const res = await fetch(`${API_URL}/api/v1/chatbot/adapt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pitch_id: pitchId,
      grant_name: grant.name,
      grant_description: grant.description,
      grant_eligibility: "",
      grant_portal_url: grant.portal_url || "",
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function GrantsAdaptationPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrants, setSelectedGrants] = useState<Grant[]>([]);
  const [adaptations, setAdaptations] = useState<Record<string, AdaptedGrant>>({});
  const [pitchId, setPitchId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    setUser(getUser());
    setIsLoading(false);

    // Charger les données depuis localStorage
    const pid = localStorage.getItem("pitch_id") || "";
    const grantsRaw = localStorage.getItem("selectedGrantsData");
    setPitchId(pid);

    if (grantsRaw) {
      try {
        const grants: Grant[] = JSON.parse(grantsRaw);
        setSelectedGrants(grants);

        // Initialiser toutes les adaptations en état "idle"
        const initial: Record<string, AdaptedGrant> = {};
        grants.forEach(g => {
          initial[g.id] = {
            grant_id: g.id,
            grant_name: g.name,
            adapted_text: "",
            key_points: [],
            word_count: 0,
            portal_url: g.portal_url || "",
            status: "idle",
          };
        });
        setAdaptations(initial);
      } catch {}
    }
  }, [router]);

  // Lance l'adaptation pour un grant
  const handleAdapt = async (grant: Grant) => {
    const token = getAccessToken();
    if (!token || !pitchId) return;

    setAdaptations(prev => ({
      ...prev,
      [grant.id]: { ...prev[grant.id], status: "loading", error: undefined },
    }));

    try {
      const result = await apiAdaptPitch(pitchId, grant, token);
      setAdaptations(prev => ({
        ...prev,
        [grant.id]: {
          ...prev[grant.id],
          status: "done",
          adapted_text: result.adapted_text,
          key_points: result.key_points,
          word_count: result.word_count,
        },
      }));
      addToast(
        "success",
        "Adaptation prête",
        `Candidature adaptée pour "${grant.name}".`
      );
    } catch (e: any) {
      setAdaptations(prev => ({
        ...prev,
        [grant.id]: {
          ...prev[grant.id],
          status: "error",
          error: "Erreur. Vérifiez qu'Ollama est lancé.",
        },
      }));
    }
  };

  // Adapter tous les grants en séquence
  const handleAdaptAll = async () => {
    for (const grant of selectedGrants) {
      if (adaptations[grant.id]?.status !== "done") {
        await handleAdapt(grant);
      }
    }
  };

  // Copier le texte
  const handleCopy = (grantId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(grantId);
    setTimeout(() => setCopied(null), 2000);
  };

  // Sauvegarder l'édition
  const handleSaveEdit = (grantId: string) => {
    setAdaptations(prev => ({
      ...prev,
      [grantId]: {
        ...prev[grantId],
        adapted_text: editText,
        word_count: editText.split(/\s+/).filter(Boolean).length,
      },
    }));
    setEditingId(null);
  };

  const doneCount = Object.values(adaptations).filter(a => a.status === "done").length;
  const totalCount = selectedGrants.length;

  const handleNext = () => {
    localStorage.setItem("adaptations", JSON.stringify(adaptations));
    router.push("/submissions");
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d1117; color: #e6edf3; font-family: 'Segoe UI', system-ui, sans-serif; }
        .page { min-height: 100vh; background: #0d1117; }

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
        .loading-spinner {
          width: 12px; height: 12px; border: 2px solid #30363d;
          border-top-color: #3fb950; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .container { max-width: 900px; margin: 0 auto; padding: 40px; }

        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; font-size: 11px; font-weight: 600; padding: 4px 12px;
          border-radius: 20px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #3fb950; animation: pulse 2s infinite; }

        .page-header { margin-bottom: 32px; }
        .page-title { font-size: 28px; font-weight: 800; color: white; margin-bottom: 8px; }
        .page-subtitle { font-size: 14px; color: #7d8590; line-height: 1.6; }

        /* Progress bar */
        .progress-section {
          background: #161b22; border: 1px solid #21262d; border-radius: 12px;
          padding: 20px; margin-bottom: 28px;
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
        }
        .progress-info { flex: 1; }
        .progress-label { font-size: 13px; color: #adbac7; margin-bottom: 8px; font-weight: 600; }
        .progress-track { height: 6px; background: #21262d; border-radius: 4px; overflow: hidden; }
        .progress-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #238636, #3fb950); transition: width 0.5s ease;
        }
        .progress-count { font-size: 13px; font-weight: 700; color: #3fb950; white-space: nowrap; }
        .btn-adapt-all {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-adapt-all:hover { background: #2ea043; }
        .btn-adapt-all:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Grant adaptation cards */
        .grant-adapt-card {
          background: #161b22; border: 1px solid #21262d; border-radius: 14px;
          margin-bottom: 20px; overflow: hidden; animation: fadeIn 0.3s ease;
          transition: border-color 0.2s;
        }
        .grant-adapt-card.status-done { border-color: rgba(35,134,54,0.4); }
        .grant-adapt-card.status-loading { border-color: rgba(88,166,255,0.3); }
        .grant-adapt-card.status-error { border-color: rgba(248,81,73,0.3); }

        .card-header {
          padding: 18px 20px; display: flex; align-items: center; gap: 14px;
          border-bottom: 1px solid #21262d;
        }
        .card-header.status-done { background: rgba(35,134,54,0.05); }
        .card-header.status-loading { background: rgba(88,166,255,0.04); }

        .grant-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .grant-name { font-size: 14px; font-weight: 700; color: white; margin-bottom: 2px; }
        .grant-org { font-size: 11px; color: #7d8590; }
        .card-status { margin-left: auto; display: flex; align-items: center; gap: 8px; }

        .status-badge {
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
        }
        .status-badge.idle { background: rgba(125,133,144,0.1); color: #7d8590; border: 1px solid #30363d; }
        .status-badge.loading { background: rgba(88,166,255,0.1); color: #58a6ff; border: 1px solid rgba(88,166,255,0.3); }
        .status-badge.done { background: rgba(35,134,54,0.1); color: #3fb950; border: 1px solid rgba(35,134,54,0.3); }
        .status-badge.error { background: rgba(248,81,73,0.1); color: #f85149; border: 1px solid rgba(248,81,73,0.3); }

        .btn-start {
          background: transparent; border: 1px solid rgba(35,134,54,0.4); color: #3fb950;
          font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-start:hover { background: rgba(35,134,54,0.1); }

        /* Loading state */
        .card-loading { padding: 32px 20px; text-align: center; }
        .loading-ring {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid #21262d; border-top-color: #58a6ff;
          animation: spin 0.8s linear infinite; margin: 0 auto 12px;
        }
        .loading-text { font-size: 13px; color: #7d8590; }
        .loading-sub { font-size: 11px; color: #4a5568; margin-top: 4px; font-family: monospace; }

        /* Idle state */
        .card-idle { padding: 28px 20px; text-align: center; }
        .idle-icon { font-size: 32px; margin-bottom: 12px; }
        .idle-text { font-size: 13px; color: #7d8590; margin-bottom: 16px; }
        .btn-start-center {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-start-center:hover { background: #2ea043; }

        /* Error state */
        .card-error {
          padding: 20px; background: rgba(248,81,73,0.05);
          display: flex; align-items: center; gap: 12px;
        }
        .error-text { font-size: 12px; color: #f85149; flex: 1; }
        .btn-retry {
          background: transparent; border: 1px solid rgba(248,81,73,0.3); color: #f85149;
          font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .btn-retry:hover { background: rgba(248,81,73,0.08); }

        /* Done state */
        .card-done { padding: 20px; }

        /* Key points */
        .key-points { margin-bottom: 16px; }
        .key-points-title {
          font-size: 10px; font-weight: 700; color: #7d8590; text-transform: uppercase;
          letter-spacing: 1px; margin-bottom: 10px;
          display: flex; align-items: center; gap: 6px;
        }
        .key-points-title::before { content: ""; display: block; width: 3px; height: 12px; background: #238636; border-radius: 2px; }
        .key-points-list { display: flex; flex-direction: column; gap: 6px; }
        .key-point {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 12px; color: #adbac7; line-height: 1.5;
          background: rgba(35,134,54,0.05); border: 1px solid rgba(35,134,54,0.15);
          border-radius: 6px; padding: 8px 10px;
        }
        .key-point-icon { color: #3fb950; font-size: 12px; margin-top: 1px; flex-shrink: 0; }

        /* Adapted text */
        .adapted-text-section { margin-bottom: 16px; }
        .adapted-text-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
        }
        .adapted-text-label {
          font-size: 10px; font-weight: 700; color: #7d8590; text-transform: uppercase;
          letter-spacing: 1px; display: flex; align-items: center; gap: 6px;
        }
        .adapted-text-label::before { content: ""; display: block; width: 3px; height: 12px; background: #58a6ff; border-radius: 2px; }
        .word-count { font-size: 11px; color: #7d8590; }

        .adapted-text-box {
          background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
          padding: 14px; font-size: 13px; color: #adbac7; line-height: 1.7;
          white-space: pre-wrap;
        }
        .adapted-text-edit {
          background: #0d1117; border: 1px solid #3fb950; border-radius: 8px;
          padding: 14px; font-size: 13px; color: #e6edf3; line-height: 1.7;
          width: 100%; resize: vertical; min-height: 160px;
          font-family: inherit; outline: none;
        }

        /* Action buttons */
        .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-copy {
          display: flex; align-items: center; gap: 6px;
          background: rgba(88,166,255,0.08); border: 1px solid rgba(88,166,255,0.2);
          color: #58a6ff; font-size: 12px; font-weight: 600; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; transition: all 0.15s;
        }
        .btn-copy:hover { background: rgba(88,166,255,0.15); border-color: rgba(88,166,255,0.4); }
        .btn-copy.copied { background: rgba(35,134,54,0.1); border-color: rgba(35,134,54,0.3); color: #3fb950; }
        .btn-edit {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 12px; font-weight: 600; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; transition: all 0.15s;
        }
        .btn-edit:hover { border-color: #7d8590; color: #adbac7; }
        .btn-save {
          display: flex; align-items: center; gap: 6px;
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 12px; font-weight: 600; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; transition: all 0.15s;
        }
        .btn-save:hover { background: #2ea043; }
        .btn-regen {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 12px; font-weight: 600; padding: 7px 14px;
          border-radius: 6px; cursor: pointer; transition: all 0.15s; margin-left: auto;
        }
        .btn-regen:hover { border-color: #7d8590; color: #adbac7; }

        .portal-link {
          display: flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid rgba(88,166,255,0.2);
          color: #58a6ff; font-size: 12px; font-weight: 600; padding: 7px 14px;
          border-radius: 6px; text-decoration: none; transition: all 0.15s;
        }
        .portal-link:hover { background: rgba(88,166,255,0.08); border-color: rgba(88,166,255,0.4); }

        /* No grants */
        .no-grants {
          text-align: center; padding: 60px 20px; color: #7d8590;
        }
        .no-grants-icon { font-size: 48px; margin-bottom: 16px; }
        .no-grants-title { font-size: 16px; font-weight: 700; color: #adbac7; margin-bottom: 8px; }

        /* Footer */
        .action-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px; background: rgba(13,17,23,0.8); border-top: 1px solid #21262d;
          position: sticky; bottom: 0;
        }
        .footer-info { font-size: 13px; color: #7d8590; }
        .footer-info strong { color: #3fb950; }
        .btn-next {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 8px;
        }
        .btn-next:hover:not(:disabled) { background: #2ea043; }
        .btn-next:disabled { background: #30363d; border-color: #21262d; color: #7d8590; cursor: not-allowed; opacity: 0.6; }
        .btn-back {
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-back:hover { border-color: #7d8590; color: #adbac7; }

        @media (max-width: 768px) {
          .container { padding: 20px; }
          .nav { padding: 12px 20px; }
          .progress-section { flex-direction: column; align-items: stretch; }
          .btn-adapt-all { width: 100%; justify-content: center; }
          .action-footer { padding: 16px 20px; flex-direction: column; gap: 10px; }
          .btn-next, .btn-back { width: 100%; justify-content: center; }
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
            {isLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7d8590" }}>
                <div className="loading-spinner" />
              </div>
            ) : user ? (
              <>
                <NotificationBell />
                <UserDropdown user={user} />
              </>
            ) : null}
          </div>
        </nav>

        <div className="container">
          <div className="badge">
            <div className="badge-dot" />
            Étape 3 sur 4
          </div>

          <div className="page-header">
            <h1 className="page-title">Adaptation de votre Pitch</h1>
            <p className="page-subtitle">
              L'IA adapte automatiquement votre pitch aux exigences spécifiques de chaque grant sélectionné.
              Vous pouvez modifier le texte généré avant de soumettre.
            </p>
          </div>

          {selectedGrants.length === 0 ? (
            <div className="no-grants">
              <div className="no-grants-icon">📭</div>
              <div className="no-grants-title">Aucun grant sélectionné</div>
              <p style={{ fontSize: "13px", marginBottom: "20px" }}>Retournez à l'étape précédente pour sélectionner des grants.</p>
              <button className="btn-back" onClick={() => router.push("/grants")}>
                ← Retour aux grants
              </button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="progress-section">
                <div className="progress-info">
                  <div className="progress-label">
                    Adaptations générées : {doneCount} / {totalCount}
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="progress-count">{doneCount}/{totalCount}</div>
                <button
                  className="btn-adapt-all"
                  onClick={handleAdaptAll}
                  disabled={doneCount === totalCount}
                >
                  ⚡ Tout adapter
                </button>
              </div>

              {/* Grant cards */}
              {selectedGrants.map((grant) => {
                const adapt = adaptations[grant.id];
                if (!adapt) return null;

                return (
                  <div
                    key={grant.id}
                    className={`grant-adapt-card status-${adapt.status}`}
                  >
                    {/* Card header */}
                    <div className={`card-header status-${adapt.status}`}>
                      <div className="grant-icon-wrap">{grant.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="grant-name">{grant.name}</div>
                        <div className="grant-org">{grant.organization}</div>
                      </div>
                      <div className="card-status">
                        <span className={`status-badge ${adapt.status}`}>
                          {adapt.status === "idle" && "En attente"}
                          {adapt.status === "loading" && "⏳ Génération..."}
                          {adapt.status === "done" && "✅ Prêt"}
                          {adapt.status === "error" && "❌ Erreur"}
                        </span>
                        {adapt.status === "idle" && (
                          <button className="btn-start" onClick={() => handleAdapt(grant)}>
                            Adapter →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading */}
                    {adapt.status === "loading" && (
                      <div className="card-loading">
                        <div className="loading-ring" />
                        <div className="loading-text">Ollama génère la candidature...</div>
                        <div className="loading-sub">llama3.2:1b • ~30 secondes</div>
                      </div>
                    )}

                    {/* Idle */}
                    {adapt.status === "idle" && (
                      <div className="card-idle">
                        <div className="idle-icon">✍️</div>
                        <div className="idle-text">
                          Cliquez pour adapter votre pitch aux critères de ce grant.
                        </div>
                        <button className="btn-start-center" onClick={() => handleAdapt(grant)}>
                          🚀 Générer l'adaptation
                        </button>
                      </div>
                    )}

                    {/* Error */}
                    {adapt.status === "error" && (
                      <div className="card-error">
                        <span style={{ fontSize: "20px" }}>⚠️</span>
                        <div className="error-text">{adapt.error}</div>
                        <button className="btn-retry" onClick={() => handleAdapt(grant)}>
                          🔄 Réessayer
                        </button>
                      </div>
                    )}

                    {/* Done */}
                    {adapt.status === "done" && (
                      <div className="card-done">
                        {/* Key points */}
                        {adapt.key_points.length > 0 && (
                          <div className="key-points">
                            <div className="key-points-title">Points clés mis en avant</div>
                            <div className="key-points-list">
                              {adapt.key_points.map((kp, i) => (
                                <div key={i} className="key-point">
                                  <span className="key-point-icon">✓</span>
                                  {kp}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Adapted text */}
                        <div className="adapted-text-section">
                          <div className="adapted-text-header">
                            <div className="adapted-text-label">Texte de candidature adapté</div>
                            <span className="word-count">{adapt.word_count} mots</span>
                          </div>

                          {editingId === grant.id ? (
                            <textarea
                              className="adapted-text-edit"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                            />
                          ) : (
                            <div className="adapted-text-box">{adapt.adapted_text}</div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="card-actions">
                          {editingId === grant.id ? (
                            <>
                              <button className="btn-save" onClick={() => handleSaveEdit(grant.id)}>
                                💾 Sauvegarder
                              </button>
                              <button className="btn-edit" onClick={() => setEditingId(null)}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={`btn-copy ${copied === grant.id ? "copied" : ""}`}
                                onClick={() => handleCopy(grant.id, adapt.adapted_text)}
                              >
                                {copied === grant.id ? "✅ Copié !" : "📋 Copier"}
                              </button>
                              <button
                                className="btn-edit"
                                onClick={() => { setEditingId(grant.id); setEditText(adapt.adapted_text); }}
                              >
                                ✏️ Modifier
                              </button>
                              {grant.portal_url && (
                                <a
                                  href={grant.portal_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="portal-link"
                                >
                                  🔗 Voir le portail
                                </a>
                              )}
                              <button className="btn-regen" onClick={() => handleAdapt(grant)}>
                                🔄 Regénérer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="action-footer">
          <button className="btn-back" onClick={() => router.push("/grants")}>
            ← Retour aux grants
          </button>
          <div className="footer-info">
            {doneCount > 0 ? (
              <><strong>{doneCount}</strong> adaptation{doneCount > 1 ? "s" : ""} prête{doneCount > 1 ? "s" : ""}</>
            ) : (
              <>Générez au moins 1 adaptation pour continuer</>
            )}
          </div>
          <button
            className="btn-next"
            disabled={doneCount === 0}
            onClick={handleNext}
          >
            Suivant → Soumettre
          </button>
        </div>
      </div>
    </>
  );
}