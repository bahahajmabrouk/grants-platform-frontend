"use client";
 
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, getAccessToken } from "@/lib/auth";
import { User } from "@/types/auth";
import { AdaptedGrant } from "@/types/grants";
import StepsNavbar from "@/components/StepsNavbar";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/api";
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
interface Submission {
  id: number;
  pitch_id: string;
  grant_id: string | null;
  grant_name: string;
  grant_url: string | null;
  grant_source: string | null;
  adapted_text: string;
  key_points: string[];
  word_count: number;
  status: SubmissionStatus;
  notes: string | null;
  screenshot_b64: string | null;
  submitted_at: string | null;
  created_at: string;
}
 
type SubmissionStatus =
  | "pending"
  | "navigating"
  | "filling"
  | "reviewing"
  | "submitted"
  | "failed"
  | "blocked"
  | "brouillon"
  | "en_attente"
  | "accepte"
  | "rejete";
 
// ─── API helpers ──────────────────────────────────────────────────────────────
 
async function apiCreateSubmission(payload: {
  pitch_id: string;
  grant_id?: string;
  grant_name: string;
  grant_url?: string;
  grant_source?: string;
  adapted_text: string;
  key_points: string[];
  word_count: number;
}): Promise<Submission> {
  const res = await api.post("/submissions/", payload);
  return res.data;
}
 
async function apiListSubmissions(): Promise<Submission[]> {
  const res = await api.get("/submissions/");
  return res.data;
}
 
async function apiUpdateSubmission(
  id: number,
  payload: { status?: string; notes?: string }
): Promise<Submission> {
  const res = await api.patch(`/submissions/${id}`, payload);
  return res.data;
}
 
async function apiApproveSubmission(id: number): Promise<void> {
  await api.post(`/submissions/${id}/approve`);
}
 
async function apiDeleteSubmission(id: number): Promise<void> {
  await api.delete(`/submissions/${id}`);
}
 
async function apiPollSubmission(id: number): Promise<Submission> {
  const res = await api.get(`/submissions/${id}`);
  return res.data;
}
 
// ─── Status config ────────────────────────────────────────────────────────────
 
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  pending:    { label: "En attente",    color: "#d29922", bg: "rgba(210,153,34,0.08)",   border: "rgba(210,153,34,0.3)",  dot: "#d29922" },
  navigating: { label: "Navigation...", color: "#58a6ff", bg: "rgba(88,166,255,0.08)",   border: "rgba(88,166,255,0.3)",  dot: "#58a6ff" },
  filling:    { label: "Remplissage...",color: "#58a6ff", bg: "rgba(88,166,255,0.08)",   border: "rgba(88,166,255,0.3)",  dot: "#58a6ff" },
  reviewing:  { label: "À valider",     color: "#e3b341", bg: "rgba(227,179,65,0.08)",   border: "rgba(227,179,65,0.3)",  dot: "#e3b341" },
  submitted:  { label: "Soumis ✓",      color: "#3fb950", bg: "rgba(63,185,80,0.08)",    border: "rgba(63,185,80,0.3)",   dot: "#3fb950" },
  failed:     { label: "Échoué",        color: "#f85149", bg: "rgba(248,81,73,0.08)",    border: "rgba(248,81,73,0.3)",   dot: "#f85149" },
  blocked:    { label: "Bloqué",        color: "#f0883e", bg: "rgba(240,136,62,0.08)",   border: "rgba(240,136,62,0.3)",  dot: "#f0883e" },
  brouillon:  { label: "Brouillon",     color: "#7d8590", bg: "rgba(125,133,144,0.08)",  border: "rgba(125,133,144,0.3)", dot: "#7d8590" },
  en_attente: { label: "En attente",    color: "#d29922", bg: "rgba(210,153,34,0.08)",   border: "rgba(210,153,34,0.3)",  dot: "#d29922" },
  accepte:    { label: "Accepté ✓",     color: "#3fb950", bg: "rgba(63,185,80,0.08)",    border: "rgba(63,185,80,0.3)",   dot: "#3fb950" },
  rejete:     { label: "Rejeté",        color: "#f85149", bg: "rgba(248,81,73,0.08)",    border: "rgba(248,81,73,0.3)",   dot: "#f85149" },
};
 
const AGENT_STATUSES = new Set(["pending", "navigating", "filling", "reviewing"]);
const PROGRESS_MAP: Record<string, number> = {
  pending: 5, navigating: 25, filling: 55, reviewing: 80,
  submitted: 100, failed: 0, blocked: 80,
};
 
const PROGRESS_STEPS = [
  { key: "navigating", label: "Navigation" },
  { key: "filling",    label: "Remplissage" },
  { key: "reviewing",  label: "Validation" },
  { key: "submitted",  label: "Soumis" },
];
 
function stepIndex(status: string) {
  if (status === "submitted") return 4;
  return PROGRESS_STEPS.findIndex((s) => s.key === status);
}
 
// ─── Component ────────────────────────────────────────────────────────────────
 
export default function SubmissionsPage() {
  const router = useRouter();
  const { addToast } = useToast();
 
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
 
  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    setUser(getUser());
    setIsLoading(false);
  }, [router]);
 
  // ── Create submissions from localStorage on mount ─────────────────────────
  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem("adaptations");
      const pitchId = localStorage.getItem("pitch_id") || "";
      if (!raw || !pitchId) { await loadSubmissions(); return; }
 
      try {
        const adaptations: Record<string, AdaptedGrant> = JSON.parse(raw);
        const done = Object.values(adaptations).filter((a) => a.status === "done");
 
        if (done.length > 0) {
          // Créer les submissions en DB
          await Promise.allSettled(
            done.map((a) =>
              apiCreateSubmission({
                pitch_id:     pitchId,
                grant_id:     a.grant_id,
                grant_name:   a.grant_name,
                grant_url:    a.portal_url || undefined,
                adapted_text: a.adapted_text,
                key_points:   a.key_points,
                word_count:   a.word_count,
              })
            )
          );
          // Nettoyer localStorage après création
          localStorage.removeItem("adaptations");
          localStorage.removeItem("selectedGrantsData");
        }
      } catch (_) {}
 
      await loadSubmissions();
    };
    init();
  }, []); // eslint-disable-line
 
  // ── Load from API ─────────────────────────────────────────────────────────
  const loadSubmissions = async () => {
    setFetching(true);
    try {
      const data = await apiListSubmissions();
      setSubmissions(data);
    } catch (_) {
      addToast("error", "Erreur", "Impossible de charger les soumissions.");
    } finally {
      setFetching(false);
    }
  };
 
  // ── Polling for agent submissions ─────────────────────────────────────────
  useEffect(() => {
    const active = submissions.filter((s) => AGENT_STATUSES.has(s.status));
    if (active.length === 0) return;
 
    const interval = setInterval(async () => {
      const updated = await Promise.all(
        active.map((s) => apiPollSubmission(s.id).catch(() => s))
      );
      setSubmissions((prev) =>
        prev.map((s) => {
          const u = updated.find((u) => u.id === s.id);
          if (!u) return s;
          if (u.status !== s.status) {
            if (u.status === "reviewing") addToast("info", "Validation requise", `${u.grant_name} est prêt à soumettre.`);
            if (u.status === "submitted") addToast("success", "Soumis !", `Candidature "${u.grant_name}" envoyée.`);
            if (u.status === "failed")    addToast("error", "Échec", `Erreur sur "${u.grant_name}".`);
          }
          return u;
        })
      );
    }, 4000);
 
    return () => clearInterval(interval);
  }, [submissions]); // eslint-disable-line
 
  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (sub: Submission) => {
    setApproving(sub.id);
    try {
      await apiApproveSubmission(sub.id);
      addToast("success", "Agent relancé", `Soumission de "${sub.grant_name}" en cours...`);
      setSubmissions((prev) =>
        prev.map((s) => s.id === sub.id ? { ...s, status: "navigating" } : s)
      );
    } catch (_) {
      addToast("error", "Erreur", "Impossible de lancer la soumission.");
    } finally {
      setApproving(null);
    }
  };
 
  const handleStatusChange = async (sub: Submission, status: string) => {
    try {
      const updated = await apiUpdateSubmission(sub.id, { status });
      setSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (_) {
      addToast("error", "Erreur", "Impossible de mettre à jour le statut.");
    }
  };
 
  const handleSaveNotes = async (sub: Submission) => {
    const notes = editingNotes[sub.id] ?? sub.notes ?? "";
    try {
      const updated = await apiUpdateSubmission(sub.id, { notes });
      setSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setEditingNotes((prev) => { const n = { ...prev }; delete n[sub.id]; return n; });
      addToast("success", "Notes sauvegardées", "");
    } catch (_) {
      addToast("error", "Erreur", "Impossible de sauvegarder les notes.");
    }
  };
 
  const handleDelete = async (sub: Submission) => {
    if (!confirm(`Supprimer la soumission "${sub.grant_name}" ?`)) return;
    try {
      await apiDeleteSubmission(sub.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      addToast("success", "Supprimé", "");
    } catch (_) {
      addToast("error", "Erreur", "Impossible de supprimer.");
    }
  };
 
  const handleCopy = (sub: Submission) => {
    navigator.clipboard.writeText(sub.adapted_text);
    setCopied(sub.id);
    setTimeout(() => setCopied(null), 2000);
  };
 
  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:      submissions.length,
    reviewing:  submissions.filter((s) => s.status === "reviewing").length,
    submitted:  submissions.filter((s) => s.status === "submitted" || s.status === "accepte").length,
    inProgress: submissions.filter((s) => AGENT_STATUSES.has(s.status) && s.status !== "reviewing").length,
    failed:     submissions.filter((s) => s.status === "failed" || s.status === "blocked").length,
  };
 
  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0d1117;color:#e6edf3;font-family:'Segoe UI',system-ui,sans-serif}
        .page{min-height:100vh;background:#0d1117;padding-bottom:80px}
 
        /* NAV */
        .nav{border-bottom:1px solid #21262d;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;background:rgba(13,17,23,0.97);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50}
        .nav-logo{display:flex;align-items:center;gap:9px}
        .nav-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#238636,#2ea043);display:flex;align-items:center;justify-content:center;font-size:14px}
        .nav-logo-text{font-size:14px;font-weight:700;color:white}
        .loading-spinner{width:12px;height:12px;border:2px solid #30363d;border-top-color:#3fb950;border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
 
        /* CONTAINER */
        .container{max-width:960px;margin:0 auto;padding:36px 40px}
 
        /* BADGE */
        .step-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(35,134,54,.1);border:1px solid rgba(35,134,54,.3);color:#3fb950;font-size:11px;font-weight:600;padding:3px 12px;border-radius:20px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:16px}
        .step-badge-dot{width:5px;height:5px;border-radius:50%;background:#3fb950;animation:pulse 2s infinite}
 
        /* HEADER */
        .page-title{font-size:26px;font-weight:800;color:white;margin-bottom:6px}
        .page-sub{font-size:13px;color:#7d8590;line-height:1.6;margin-bottom:24px}
 
        /* STATS */
        .stats-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}
        .stat-card{background:#161b22;border:1px solid #21262d;border-radius:10px;padding:12px 14px}
        .stat-label{font-size:10px;color:#7d8590;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;font-weight:700}
        .stat-val{font-size:20px;font-weight:800;color:white}
        .stat-val.green{color:#3fb950}
        .stat-val.blue{color:#58a6ff}
        .stat-val.amber{color:#d29922}
        .stat-val.red{color:#f85149}
 
        /* EMPTY */
        .empty{text-align:center;padding:70px 20px;border:1px dashed #30363d;border-radius:14px;background:#0d1117}
        .empty-icon{font-size:44px;margin-bottom:16px}
        .empty-title{font-size:16px;font-weight:700;color:#adbac7;margin-bottom:8px}
        .empty-sub{font-size:13px;color:#7d8590;margin-bottom:20px}
        .empty-btn{background:#238636;border:1px solid #2ea043;color:white;font-size:13px;font-weight:700;padding:10px 22px;border-radius:8px;cursor:pointer}
 
        /* SUBMISSION CARD */
        .sub-card{background:#161b22;border:1px solid #21262d;border-radius:14px;margin-bottom:14px;overflow:hidden;animation:fadeIn .25s ease;transition:border-color .2s}
        .sub-card.reviewing{border-color:rgba(227,179,65,.5)}
        .sub-card.submitted,.sub-card.accepte{border-color:rgba(63,185,80,.4)}
        .sub-card.failed,.sub-card.blocked,.sub-card.rejete{border-color:rgba(248,81,73,.3)}
        .sub-card.navigating,.sub-card.filling,.sub-card.pending{border-color:rgba(88,166,255,.3)}
 
        /* CARD HEADER */
        .card-head{padding:14px 18px;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none}
        .card-head:hover{background:rgba(255,255,255,.02)}
        .grant-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;background:#21262d;border:1px solid #30363d}
        .grant-info{flex:1;min-width:0}
        .grant-name{font-size:13px;font-weight:700;color:white;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .grant-org{font-size:11px;color:#7d8590}
        .status-pill{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
        .status-dot{width:6px;height:6px;border-radius:50%;animation:pulse 2s infinite}
        .chevron{color:#7d8590;font-size:12px;flex-shrink:0;transition:transform .2s}
        .chevron.open{transform:rotate(180deg)}
 
        /* PROGRESS BAR (agent) */
        .agent-progress{padding:10px 18px;border-bottom:1px solid #21262d;background:rgba(88,166,255,.03)}
        .progress-steps{display:flex;align-items:center;margin-bottom:8px}
        .p-step{display:flex;align-items:center;gap:4px;font-size:10px;flex:1}
        .p-dot{width:20px;height:20px;border-radius:50%;border:1px solid #30363d;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;color:#7d8590}
        .p-dot.done{background:#238636;border-color:#238636;color:white}
        .p-dot.active{background:rgba(88,166,255,.15);border-color:#58a6ff;color:#58a6ff}
        .p-label{font-size:10px;color:#7d8590;margin-left:3px}
        .p-label.done{color:#3fb950}
        .p-label.active{color:#58a6ff;font-weight:600}
        .p-connector{flex:1;height:1px;background:#21262d;margin:0 4px}
        .p-connector.done{background:#238636}
        .progress-track{height:3px;background:#21262d;border-radius:2px;overflow:hidden}
        .progress-fill{height:100%;border-radius:2px;transition:width .6s ease}
 
        /* CARD BODY */
        .card-body{padding:16px 18px;border-top:1px solid #21262d;display:flex;flex-direction:column;gap:14px}
 
        /* SCREENSHOT */
        .screenshot-wrap{background:#0d1117;border:1px solid #30363d;border-radius:8px;overflow:hidden}
        .screenshot-label{font-size:10px;font-weight:700;color:#7d8590;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;border-bottom:1px solid #30363d;display:flex;align-items:center;justify-content:space-between}
        .screenshot-img{width:100%;max-height:200px;object-fit:cover;object-position:top;cursor:zoom-in;display:block}
        .screenshot-mock{height:80px;display:flex;align-items:center;justify-content:center;color:#7d8590;font-size:12px;gap:8px}
 
        /* KEY POINTS */
        .section-label{font-size:10px;font-weight:700;color:#7d8590;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px;display:flex;align-items:center;gap:6px}
        .section-label::before{content:"";display:block;width:3px;height:10px;border-radius:2px}
        .section-label.green::before{background:#238636}
        .section-label.blue::before{background:#58a6ff}
        .kp-list{display:flex;flex-direction:column;gap:5px}
        .kp{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#adbac7;line-height:1.5;background:rgba(35,134,54,.05);border:1px solid rgba(35,134,54,.12);border-radius:6px;padding:7px 9px}
        .kp-check{color:#3fb950;flex-shrink:0;margin-top:1px;font-size:11px}
 
        /* ADAPTED TEXT */
        .adapted-box{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;color:#adbac7;line-height:1.7;max-height:100px;overflow:hidden;position:relative;cursor:pointer;transition:max-height .3s}
        .adapted-box.expanded{max-height:none}
        .adapted-box::after{content:"";position:absolute;bottom:0;left:0;right:0;height:30px;background:linear-gradient(transparent,#0d1117);pointer-events:none}
        .adapted-box.expanded::after{display:none}
        .word-count{font-size:10px;color:#7d8590;text-align:right;margin-top:4px}
 
        /* NOTES */
        .notes-textarea{width:100%;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:9px 11px;font-size:12px;color:#e6edf3;resize:none;height:56px;font-family:inherit;transition:border-color .15s}
        .notes-textarea:focus{outline:none;border-color:#238636}
        .notes-save-row{display:flex;justify-content:flex-end;margin-top:5px}
 
        /* ACTIONS */
        .card-actions{display:flex;gap:7px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #21262d}
        .act-btn{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:7px 13px;border-radius:7px;border:1px solid #30363d;color:#adbac7;background:transparent;cursor:pointer;transition:all .15s;white-space:nowrap}
        .act-btn:hover{border-color:#7d8590;color:#e6edf3}
        .act-btn:disabled{opacity:.5;cursor:not-allowed}
        .act-btn.primary{background:#238636;border-color:#2ea043;color:white}
        .act-btn.primary:hover:not(:disabled){background:#2ea043}
        .act-btn.blue{background:rgba(88,166,255,.08);border-color:rgba(88,166,255,.3);color:#58a6ff}
        .act-btn.blue:hover{background:rgba(88,166,255,.15)}
        .act-btn.amber{background:rgba(210,153,34,.08);border-color:rgba(210,153,34,.3);color:#d29922}
        .act-btn.amber:hover{background:rgba(210,153,34,.15)}
        .act-btn.danger{border-color:rgba(248,81,73,.3);color:#f85149}
        .act-btn.danger:hover{border-color:rgba(248,81,73,.6)}
        .act-btn.copied{background:rgba(63,185,80,.1);border-color:rgba(63,185,80,.3);color:#3fb950}
        .act-btn.save-notes{background:rgba(88,166,255,.08);border-color:rgba(88,166,255,.3);color:#58a6ff;font-size:11px;padding:5px 10px}
 
        /* STATUS SELECTOR */
        .status-select{background:#0d1117;border:1px solid #30363d;border-radius:7px;padding:6px 10px;color:#adbac7;font-size:12px;font-family:inherit;cursor:pointer}
        .status-select:focus{outline:none;border-color:#238636}
 
        /* APPROVE BANNER */
        .approve-banner{background:rgba(227,179,65,.06);border:1px solid rgba(227,179,65,.25);border-radius:8px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .approve-banner-text{font-size:12px;color:#e3b341;line-height:1.5}
        .approve-banner-text strong{display:block;font-size:13px;margin-bottom:2px}
 
        /* MODAL */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal-img{max-width:100%;max-height:90vh;border-radius:8px;border:1px solid #30363d}
        .modal-close{position:absolute;top:16px;right:20px;color:white;font-size:24px;cursor:pointer;background:rgba(0,0,0,.5);border:none;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center}
 
        /* FOOTER */
        .footer{position:fixed;bottom:0;left:0;right:0;background:rgba(13,17,23,.97);border-top:1px solid #21262d;padding:12px 40px;display:flex;align-items:center;justify-content:space-between;z-index:40;backdrop-filter:blur(12px)}
        .footer-info{font-size:12px;color:#7d8590}
        .footer-info strong{color:#3fb950}
        .footer-btns{display:flex;gap:8px}
        .f-btn{font-size:12px;font-weight:600;padding:8px 16px;border-radius:8px;border:1px solid #30363d;color:#adbac7;background:transparent;cursor:pointer;transition:all .15s}
        .f-btn:hover{border-color:#7d8590;color:#e6edf3}
        .f-btn.primary{background:#238636;border-color:#2ea043;color:white}
        .f-btn.primary:hover{background:#2ea043}
 
        /* LOADING SKELETON */
        .skeleton{background:linear-gradient(90deg,#161b22 25%,#21262d 50%,#161b22 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;border-radius:8px}
 
        @media(max-width:768px){
          .container{padding:20px}
          .nav{padding:12px 20px}
          .stats-row{grid-template-columns:repeat(2,1fr)}
          .footer{padding:10px 20px;flex-direction:column;gap:8px}
          .footer-btns{width:100%;justify-content:space-between}
        }
      `}</style>
 
      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚀</div>
            <span className="nav-logo-text">Grants Platform</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <StepsNavbar />
            {isLoading ? (
              <div className="loading-spinner" />
            ) : user ? (
              <>
                <NotificationBell />
                <UserDropdown user={user} />
              </>
            ) : null}
          </div>
        </nav>
 
        <div className="container">
          {/* HEADER */}
          <div className="step-badge">
            <div className="step-badge-dot" />
            Étape 4 sur 4
          </div>
          <div className="page-title">Soumission des candidatures</div>
          <div className="page-sub">
            L'agent navigue et remplit automatiquement les formulaires. Validez chaque candidature avant soumission finale.
          </div>
 
          {/* STATS */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-val">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">En cours</div>
              <div className="stat-val blue">{stats.inProgress}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">À valider</div>
              <div className="stat-val amber">{stats.reviewing}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Soumises</div>
              <div className="stat-val green">{stats.submitted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Échecs</div>
              <div className="stat-val red">{stats.failed}</div>
            </div>
          </div>
 
          {/* CONTENT */}
          {fetching ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 72 }} />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-title">Aucune soumission</div>
              <div className="empty-sub">
                Retournez à l'étape précédente pour adapter votre pitch et lancer des soumissions.
              </div>
              <button className="empty-btn" onClick={() => router.push("/grants-adaptation")}>
                ← Retour à l'adaptation
              </button>
            </div>
          ) : (
            submissions.map((sub) => {
              const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG["brouillon"];
              const isAgentActive = AGENT_STATUSES.has(sub.status);
              const isExpanded = expandedId === sub.id;
              const progress = PROGRESS_MAP[sub.status] ?? 0;
              const curStep = stepIndex(sub.status);
              const notesVal = editingNotes[sub.id] !== undefined ? editingNotes[sub.id] : (sub.notes ?? "");
 
              return (
                <div key={sub.id} className={`sub-card ${sub.status}`}>
                  {/* HEADER */}
                  <div
                    className="card-head"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className="grant-icon">🎯</div>
                    <div className="grant-info">
                      <div className="grant-name">{sub.grant_name}</div>
                      <div className="grant-org">
                        {sub.grant_source || "Portail externe"}
                        {sub.submitted_at && (
                          <span style={{ marginLeft: 8, color: "#3fb950" }}>
                            · Soumis le {new Date(sub.submitted_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="status-pill"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                    >
                      <div className="status-dot" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </div>
                    <div className={`chevron ${isExpanded ? "open" : ""}`}>▼</div>
                  </div>
 
                  {/* AGENT PROGRESS BAR */}
                  {isAgentActive && (
                    <div className="agent-progress">
                      <div className="progress-steps">
                        {PROGRESS_STEPS.map((step, i) => {
                          const isDone = curStep > i;
                          const isActive = curStep === i;
                          return (
                            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                              <div className={`p-dot ${isDone ? "done" : isActive ? "active" : ""}`}>
                                {isDone ? "✓" : i + 1}
                              </div>
                              <span className={`p-label ${isDone ? "done" : isActive ? "active" : ""}`}>
                                {step.label}
                              </span>
                              {i < PROGRESS_STEPS.length - 1 && (
                                <div className={`p-connector ${isDone ? "done" : ""}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%`, background: progress === 100 ? "#3fb950" : "#58a6ff" }}
                        />
                      </div>
                    </div>
                  )}
 
                  {/* EXPANDED BODY */}
                  {isExpanded && (
                    <div className="card-body">
                      {/* APPROVE BANNER */}
                      {sub.status === "reviewing" && (
                        <div className="approve-banner">
                          <div className="approve-banner-text">
                            <strong>✅ Formulaire rempli — validation requise</strong>
                            L'agent a rempli le formulaire. Vérifiez l'aperçu ci-dessous puis approuvez.
                          </div>
                          <button
                            className="act-btn primary"
                            disabled={approving === sub.id}
                            onClick={() => handleApprove(sub)}
                          >
                            {approving === sub.id ? "⏳ Lancement..." : "🚀 Approuver et soumettre"}
                          </button>
                        </div>
                      )}
 
                      {/* SCREENSHOT */}
                      {sub.screenshot_b64 && (
                        <div className="screenshot-wrap">
                          <div className="screenshot-label">
                            <span>📸 Aperçu du formulaire rempli</span>
                            <span style={{ fontSize: 10, color: "#58a6ff", cursor: "pointer" }}
                              onClick={() => setScreenshotModal(sub.screenshot_b64!)}>
                              Agrandir ↗
                            </span>
                          </div>
                          <img
                            src={`data:image/png;base64,${sub.screenshot_b64}`}
                            alt="Aperçu formulaire"
                            className="screenshot-img"
                            onClick={() => setScreenshotModal(sub.screenshot_b64!)}
                          />
                        </div>
                      )}
 
                      {/* KEY POINTS */}
                      {sub.key_points?.length > 0 && (
                        <div>
                          <div className="section-label green">Points clés mis en avant</div>
                          <div className="kp-list">
                            {sub.key_points.map((kp, i) => (
                              <div key={i} className="kp">
                                <span className="kp-check">✓</span>
                                {kp}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
 
                      {/* ADAPTED TEXT */}
                      <div>
                        <div className="section-label blue">Texte de candidature adapté</div>
                        <div
                          className={`adapted-box ${isExpanded ? "expanded" : ""}`}
                          style={{ maxHeight: "none" }}
                        >
                          {sub.adapted_text}
                        </div>
                        <div className="word-count">{sub.word_count} mots</div>
                      </div>
 
                      {/* NOTES */}
                      <div>
                        <div className="section-label green">Notes</div>
                        <textarea
                          className="notes-textarea"
                          placeholder="Numéro de dossier, contact, date limite, remarques..."
                          value={notesVal}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                        />
                        {editingNotes[sub.id] !== undefined && (
                          <div className="notes-save-row">
                            <button
                              className="act-btn save-notes"
                              onClick={() => handleSaveNotes(sub)}
                            >
                              💾 Sauvegarder
                            </button>
                          </div>
                        )}
                      </div>
 
                      {/* STATUS SELECTOR (manual) */}
                      {!isAgentActive && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: "#7d8590" }}>Statut :</span>
                          <select
                            className="status-select"
                            value={sub.status}
                            onChange={(e) => handleStatusChange(sub, e.target.value)}
                          >
                            <option value="brouillon">Brouillon</option>
                            <option value="soumis">Soumis</option>
                            <option value="en_attente">En attente</option>
                            <option value="accepte">Accepté</option>
                            <option value="rejete">Rejeté</option>
                          </select>
                        </div>
                      )}
 
                      {/* ACTIONS */}
                      <div className="card-actions">
                        <button
                          className={`act-btn ${copied === sub.id ? "copied" : "blue"}`}
                          onClick={() => handleCopy(sub)}
                        >
                          {copied === sub.id ? "✅ Copié !" : "📋 Copier le texte"}
                        </button>
                        {sub.grant_url && (
                          <a
                            href={sub.grant_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="act-btn"
                            style={{ textDecoration: "none" }}
                          >
                            🔗 Ouvrir le portail
                          </a>
                        )}
                        {sub.status === "blocked" && (
                          <button className="act-btn amber" onClick={() => handleApprove(sub)}>
                            🔄 Réessayer
                          </button>
                        )}
                        <button
                          className="act-btn danger"
                          style={{ marginLeft: "auto" }}
                          onClick={() => handleDelete(sub)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
 
        {/* FOOTER */}
        <div className="footer">
          <button className="f-btn" onClick={() => router.push("/grants-adaptation")}>
            ← Retour à l'adaptation
          </button>
          <div className="footer-info">
            {stats.submitted > 0 && (
              <><strong>{stats.submitted}</strong> soumission{stats.submitted > 1 ? "s" : ""} envoyée{stats.submitted > 1 ? "s" : ""} · </>
            )}
            {stats.reviewing > 0 && (
              <><strong style={{ color: "#e3b341" }}>{stats.reviewing}</strong> en attente de validation · </>
            )}
            {stats.inProgress > 0 && (
              <><strong style={{ color: "#58a6ff" }}>{stats.inProgress}</strong> en cours</>
            )}
          </div>
          <div className="footer-btns">
            <button className="f-btn" onClick={() => router.push("/pitches")}>
              Mes pitches
            </button>
            <button className="f-btn primary" onClick={() => router.push("/dashboard")}>
              Tableau de bord →
            </button>
          </div>
        </div>
      </div>
 
      {/* SCREENSHOT MODAL */}
      {screenshotModal && (
        <div className="modal-overlay" onClick={() => setScreenshotModal(null)}>
          <button className="modal-close" onClick={() => setScreenshotModal(null)}>✕</button>
          <img
            src={`data:image/png;base64,${screenshotModal}`}
            alt="Screenshot plein écran"
            className="modal-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}