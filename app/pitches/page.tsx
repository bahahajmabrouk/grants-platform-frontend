"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { listPitches, deletePitch } from "@/lib/api";
import { PitchExtractedData } from "@/types/pitch";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/components/ui/ToastProvider";

type PitchStatus = "completed" | "processing" | "failed" | "unknown";
type EvaluationState = "evaluated" | "pending" | "not_evaluated";

interface PitchListItem {
  pitch_id: string;
  filename?: string;
  status?: string;
  created_at?: string;
  extracted_data?: PitchExtractedData;
  evaluation_score?: number | null;
  grants_count?: number | null;
}

function normalizePitches(raw: any): PitchListItem[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.pitches)
      ? raw.pitches
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  return list
    .map((p: any) => ({
      pitch_id: p.pitch_id || p.id || p.pitchId || "",
      filename: p.filename || p.file_name || p.name || "",
      status: p.status || p.state || "",
      created_at: p.created_at || p.createdAt || p.uploaded_at || "",
      extracted_data: p.extracted_data || p.extractedData || p.data || undefined,
      evaluation_score: typeof p.evaluation_score === "number"
        ? p.evaluation_score
        : typeof p.overall_score === "number"
          ? p.overall_score
          : typeof p.score === "number"
            ? p.score
            : null,
      grants_count: typeof p.grants_count === "number"
        ? p.grants_count
        : typeof p.grants_found === "number"
          ? p.grants_found
          : null,
    }))
    .filter((p: PitchListItem) => Boolean(p.pitch_id));
}

function mapStatus(status?: string): { label: string; tone: PitchStatus } {
  if (status === "completed" || status === "done") {
    return { label: "Analyse", tone: "completed" };
  }
  if (status === "processing" || status === "uploading") {
    return { label: "En cours", tone: "processing" };
  }
  if (status === "failed" || status === "error") {
    return { label: "Erreur", tone: "failed" };
  }
  return { label: "Inconnu", tone: "unknown" };
}

function getEvaluationState(pitch: PitchListItem): EvaluationState {
  // Si score existe = déjà évalué
  if (typeof pitch.evaluation_score === "number") {
    return "evaluated";
  }
  
  // Si pitch est complété mais pas évalué = en attente
  if (pitch.status === "completed" || pitch.status === "done") {
    return "pending";
  }
  
  // Sinon = pas encore évalué
  return "not_evaluated";
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function scoreTone(score?: number | null): "good" | "mid" | "low" | "na" {
  if (typeof score !== "number") return "na";
  if (score >= 8) return "good";
  if (score >= 6) return "mid";
  return "low";
}

export default function PitchesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pitches, setPitches] = useState<PitchListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PitchStatus>("all");
  const [industryFilter, setIndustryFilter] = useState("all");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUser(getUser());
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const fetchPitches = async () => {
      setLoadingList(true);
      setError(null);
      try {
        const data = await listPitches();
        setPitches(normalizePitches(data));
      } catch (err: any) {
        setError(err?.message || "Erreur lors du chargement");
      } finally {
        setLoadingList(false);
      }
    };
    fetchPitches();
  }, []);

  const sortedPitches = useMemo(() => {
    return [...pitches].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }, [pitches]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    pitches.forEach((p) => {
      const val = p.extracted_data?.industry;
      if (val) set.add(val);
    });
    return ["all", ...Array.from(set)];
  }, [pitches]);

  const filteredPitches = useMemo(() => {
    return sortedPitches.filter((p) => {
      const name = (p.extracted_data?.startup_name || p.filename || "").toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (statusFilter !== "all") {
        const { tone } = mapStatus(p.status);
        if (tone !== statusFilter) return false;
      }
      if (industryFilter !== "all") {
        if (p.extracted_data?.industry !== industryFilter) return false;
      }
      return true;
    });
  }, [sortedPitches, search, statusFilter, industryFilter]);

  const stats = useMemo(() => {
    const scores = sortedPitches
      .map((p) => p.evaluation_score)
      .filter((s): s is number => typeof s === "number");
    const total = sortedPitches.length;
    const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    const best = scores.length > 0 ? Math.max(...scores) : 0;
    return { total, avg, best };
  }, [sortedPitches]);

  const latestPitch = sortedPitches[0];

  const handleView = (pitch: PitchListItem) => {
    localStorage.setItem("pitch_id", pitch.pitch_id);
    if (pitch.extracted_data) {
      localStorage.setItem(
        "pitch_data",
        JSON.stringify({ pitch_id: pitch.pitch_id, ...pitch.extracted_data })
      );
      router.push("/grants");
      return;
    }
    router.push("/upload");
  };

  const handleResumeFlow = (pitch: PitchListItem) => {
    localStorage.setItem("pitch_id", pitch.pitch_id);
    if (pitch.extracted_data) {
      localStorage.setItem(
        "pitch_data",
        JSON.stringify({ pitch_id: pitch.pitch_id, ...pitch.extracted_data })
      );
    }
    router.push("/grants");
  };

  const handleViewEvaluation = (pitch: PitchListItem) => {
    localStorage.setItem("open_eval_pitch_id", pitch.pitch_id);
    router.push("/upload");
  };

  const handleEvaluate = (pitch: PitchListItem) => {
    // Aller sur la page chatbot pour évaluer
    localStorage.setItem("pitch_id", pitch.pitch_id);
    if (pitch.extracted_data) {
      localStorage.setItem(
        "pitch_data",
        JSON.stringify({ pitch_id: pitch.pitch_id, ...pitch.extracted_data })
      );
    }
    router.push("/chatbot");
  };

  const handleDelete = async (pitch: PitchListItem) => {
    if (!confirm("Supprimer ce pitch ?")) return;
    try {
      await deletePitch(pitch.pitch_id);
      setPitches((prev) => prev.filter((p) => p.pitch_id !== pitch.pitch_id));
      addToast("success", "Pitch supprime", "Le pitch a ete supprime.");
    } catch (err: any) {
      addToast("error", "Suppression impossible", err?.message || "Erreur");
    }
  };

  const handleResumeLatest = () => {
    if (!latestPitch) return;
    handleView(latestPitch);
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
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .container { max-width: 1100px; margin: 0 auto; padding: 40px; }
        .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
        .title { font-size: 28px; font-weight: 800; color: white; margin-bottom: 6px; }
        .subtitle { font-size: 14px; color: #7d8590; line-height: 1.6; }

        .actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .action-btn {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 12px; font-weight: 700; padding: 10px 14px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .action-btn.secondary {
          background: transparent; border: 1px solid #30363d; color: #7d8590;
        }
        .action-btn:hover { background: #2ea043; }
        .action-btn.secondary:hover { border-color: #7d8590; color: #adbac7; background: transparent; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .list-card {
          background: #161b22; border: 1px solid #21262d; border-radius: 14px;
          padding: 18px; animation: fadeIn 0.25s ease;
        }
        .stats-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
        }
        .stat-card {
          background: #0d1117; border: 1px solid #21262d; border-radius: 10px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
        }
        .stat-label { font-size: 10px; color: #7d8590; text-transform: uppercase; letter-spacing: 1px; }
        .stat-value { font-size: 18px; font-weight: 800; color: #3fb950; }

        .filters {
          display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 16px;
        }
        .filter-input, .filter-select {
          background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 9px 12px;
          color: #e6edf3; font-size: 12px; font-family: inherit;
        }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: #3fb950; }
        .list-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12px; color: #7d8590; margin-bottom: 14px;
        }
        .count { font-weight: 700; color: #3fb950; }

        .pitches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .pitch-card {
          background: #0d1117; border: 1px solid #21262d; border-radius: 12px;
          padding: 14px; display: flex; flex-direction: column; gap: 10px;
          position: relative; overflow: hidden;
        }
        .pitch-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(63,185,80,0.05) 0%, transparent 100%);
          pointer-events: none;
        }
        
        .pitch-score-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 10;
          animation: fadeIn 0.3s ease;
        }
        .pitch-score-badge.good { background: #238636; color: white; border: 1px solid #2ea043; }
        .pitch-score-badge.mid { background: #d2931f; color: white; border: 1px solid #d29922; }
        .pitch-score-badge.low { background: #da3633; color: white; border: 1px solid #f85149; }

        .pitch-eval-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 10;
          animation: fadeIn 0.3s ease;
          background: #58a6ff;
          color: white;
          border: 1px solid rgba(88,166,255,0.5);
        }

        .pitch-title { font-size: 14px; font-weight: 700; color: white; margin-right: 70px; }
        .pitch-subtitle { font-size: 12px; color: #7d8590; }
        .tag-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .tag {
          font-size: 10px; padding: 3px 8px; border-radius: 999px;
          background: #161b22; border: 1px solid #21262d; color: #7d8590;
          text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700;
        }
        .tag.primary { color: #58a6ff; border-color: rgba(88,166,255,0.4); background: rgba(88,166,255,0.08); }
        .tag.success { color: #3fb950; border-color: rgba(35,134,54,0.5); background: rgba(35,134,54,0.08); }
        .tag.warn { color: #d29922; border-color: rgba(210,153,34,0.5); background: rgba(210,153,34,0.08); }
        .pitch-meta { font-size: 11px; color: #7d8590; display: flex; gap: 10px; flex-wrap: wrap; }
        .pitch-meta span { display: inline-flex; align-items: center; gap: 6px; }
        .pitch-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .metric {
          background: #161b22; border: 1px solid #21262d; border-radius: 8px;
          padding: 10px; text-align: center; font-size: 11px; color: #adbac7;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .metric strong { display: block; font-size: 16px; font-weight: 800; }
        .metric strong.score-good { color: #3fb950; }
        .metric strong.score-mid { color: #d29922; }
        .metric strong.score-low { color: #f85149; }
        .metric strong.score-na { color: #7d8590; }
        .metric-label {
          font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
          color: #7d8590; font-weight: 700;
        }
        .metric-status {
          font-size: 9px;
          color: #3fb950;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .metric-pending {
          font-size: 9px;
          color: #58a6ff;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .pitch-status {
          font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; border: 1px solid;
          display: inline-flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .status-completed { color: #3fb950; border-color: rgba(35,134,54,0.5); background: rgba(35,134,54,0.08); }
        .status-processing { color: #58a6ff; border-color: rgba(88,166,255,0.4); background: rgba(88,166,255,0.08); }
        .status-failed { color: #f85149; border-color: rgba(248,81,73,0.4); background: rgba(248,81,73,0.08); }
        .status-unknown { color: #7d8590; border-color: #30363d; background: rgba(125,133,144,0.08); }

        .pitch-actions { margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; }
        .pitch-btn {
          background: transparent; border: 1px solid #30363d; color: #adbac7;
          font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .pitch-btn:hover { border-color: #7d8590; color: #e6edf3; }
        .pitch-btn.primary { background: #238636; border-color: #2ea043; color: white; }
        .pitch-btn.primary:hover { background: #2ea043; }
        .pitch-btn.secondary { background: #58a6ff; border-color: rgba(88,166,255,0.5); color: white; }
        .pitch-btn.secondary:hover { background: #79c0ff; border-color: #79c0ff; }
        .pitch-btn.danger { border-color: rgba(248,81,73,0.4); color: #f85149; }
        .pitch-btn.danger:hover { border-color: rgba(248,81,73,0.7); color: #ff7b72; }

        .empty {
          text-align: center; padding: 60px 20px; color: #7d8590;
          border: 1px dashed #30363d; border-radius: 12px; background: #0d1117;
        }
        .empty-title { font-size: 16px; font-weight: 700; color: #adbac7; margin-bottom: 8px; }
        .empty-text { font-size: 13px; margin-bottom: 16px; }

        @media (max-width: 768px) {
          .container { padding: 20px; }
          .nav { padding: 12px 20px; }
          .header { flex-direction: column; align-items: stretch; }
          .actions { width: 100%; }
          .action-btn { flex: 1; text-align: center; }
          .filters { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr; }
          .pitch-title { margin-right: 0; }
        }
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">GP</div>
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
          <div className="header">
            <div>
              <div className="title">Mes pitches</div>
              <div className="subtitle">
                Retrouvez vos pitchs analyses et reprenez rapidement le flux grants.
              </div>
            </div>
            <div className="actions">
              <button className="action-btn" onClick={() => router.push("/upload")}>Nouveau pitch</button>
              <button className="action-btn secondary" onClick={() => router.push("/upload")}>Importer</button>
              <button
                className="action-btn secondary"
                onClick={handleResumeLatest}
                disabled={!latestPitch}
              >
                Reprendre dernier
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total pitches</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Score moyen</div>
              <div className="stat-value">{stats.avg}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Meilleur score</div>
              <div className="stat-value">{stats.best}</div>
            </div>
          </div>

          <div className="filters">
            <input
              className="filter-input"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === "all" ? "Toutes industries" : ind}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PitchStatus)}
            >
              <option value="all">Tous statuts</option>
              <option value="completed">Analyse</option>
              <option value="processing">En cours</option>
              <option value="failed">Erreur</option>
              <option value="unknown">Inconnu</option>
            </select>
          </div>

          <div className="list-card">
            <div className="list-head">
              <span>Liste des pitches</span>
              <span className="count">{filteredPitches.length}</span>
            </div>

            {loadingList ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#7d8590" }}>
                Chargement des pitches...
              </div>
            ) : error ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#f85149" }}>
                {error}
              </div>
            ) : filteredPitches.length === 0 ? (
              <div className="empty">
                <div className="empty-title">Aucun pitch pour le moment</div>
                <div className="empty-text">Commencez par uploader votre premier pitch deck.</div>
                <button className="action-btn" onClick={() => router.push("/upload")}>Uploader un pitch</button>
              </div>
            ) : (
              <div className="pitches-grid">
                {filteredPitches.map((pitch) => {
                  const name = pitch.extracted_data?.startup_name || pitch.filename || "Pitch";
                  const industry = pitch.extracted_data?.industry || "-";
                  const stage = pitch.extracted_data?.stage || "-";
                  const country = pitch.extracted_data?.country || "-";
                  const { label, tone } = mapStatus(pitch.status);
                  const scoreToneClass = scoreTone(pitch.evaluation_score);
                  const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/uploads/${pitch.pitch_id}.pdf`;
                  const evalState = getEvaluationState(pitch);

                  return (
                    <div key={pitch.pitch_id} className="pitch-card">
                      {/* Badge - 3 états différents */}
                      {evalState === "evaluated" && (
                        <div className={`pitch-score-badge ${scoreToneClass}`}>
                          ⭐ {pitch.evaluation_score}/10
                        </div>
                      )}
                      {evalState === "pending" && (
                        <div className="pitch-eval-badge">
                          ⏳ À évaluer
                        </div>
                      )}

                      <div className="pitch-title">{name}</div>
                      <div className="pitch-subtitle">{pitch.filename || "-"}</div>
                      <div className="tag-row">
                        <span className="tag primary">{industry}</span>
                        <span className="tag success">{stage}</span>
                        <span className="tag warn">{country}</span>
                      </div>
                      <div className="pitch-meta">
                        <span>📅 {formatDate(pitch.created_at)}</span>
                        <span>🏢 {industry}</span>
                        <span>📊 {stage}</span>
                      </div>
                      <div className="pitch-metrics">
                        <div className="metric">
                          <strong className={`score-${scoreToneClass}`}>
                            {pitch.evaluation_score ?? "-"}
                          </strong>
                          <span className="metric-label">Score</span>
                          {evalState === "evaluated" && <span className="metric-status">✓ Noté</span>}
                          {evalState === "pending" && <span className="metric-pending">⏳ Attente</span>}
                        </div>
                        <div className="metric">
                          <strong>{pitch.grants_count ?? "-"}</strong>
                          <span className="metric-label">Grants</span>
                        </div>
                        <div className="metric">
                          <strong style={{ fontSize: "12px", textTransform: "uppercase" }}>
                            {label}
                          </strong>
                          <span className="metric-label">Statut</span>
                        </div>
                      </div>
                      <span className={`pitch-status status-${tone}`}>● {label}</span>
                      <div className="pitch-actions">
                        <button className="pitch-btn primary" onClick={() => handleResumeFlow(pitch)}>
                          Reprendre le flow
                        </button>
                        {evalState === "evaluated" && (
                          <button className="pitch-btn" onClick={() => handleViewEvaluation(pitch)}>
                            📊 Évaluation
                          </button>
                        )}
                        {evalState === "pending" && (
                          <button className="pitch-btn secondary" onClick={() => handleEvaluate(pitch)}>
                            🤖 Évaluer maintenant
                          </button>
                        )}
                        <a className="pitch-btn" href={pdfUrl} target="_blank" rel="noreferrer">
                          📄 PDF
                        </a>
                        <button className="pitch-btn danger" onClick={() => handleDelete(pitch)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
