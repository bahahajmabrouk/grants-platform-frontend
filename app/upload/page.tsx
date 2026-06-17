"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { uploadPitchDeck, getPitchStatus, listPitches } from "@/lib/api";
import { PitchUploadResponse, PitchExtractedData } from "@/types/pitch";
import { isAuthenticated, getUser, clearAuth, getAccessToken } from "@/lib/auth";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/components/ui/ToastProvider";

// ── Types Chatbot
interface CriterionScore { criterion: string; score: number; feedback: string; }
interface EvaluationResult {
  pitch_id: string; conversation_id: string; overall_score: number;
  criteria: CriterionScore[]; summary: string; recommendations: string[];
}
interface ChatMsg { role: "user" | "assistant"; content: string; }

// ── Type Stats utilisateur
interface UserStats { pitches: number; grants: number; submissions: number; }

interface PitchListItem {
  pitch_id: string;
  filename?: string;
  status?: string;
  created_at?: string;
  extracted_data?: PitchExtractedData;
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
    }))
    .filter((p: PitchListItem) => Boolean(p.pitch_id));
}

function formatPitchDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

// ── API Chatbot
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiEvaluate(pitchId: string, userId: number): Promise<EvaluationResult> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/v1/chatbot/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pitch_id: pitchId, user_id: userId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiChat(pitchId: string, userId: number, message: string, convId: string | null) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/v1/chatbot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pitch_id: pitchId, message, conversation_id: convId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Score helpers
const sc  = (s: number) => s >= 8 ? "#3fb950" : s >= 6 ? "#d29922" : "#f85149";
const scb = (s: number) => s >= 8 ? "rgba(63,185,80,0.1)" : s >= 6 ? "rgba(210,153,34,0.1)" : "rgba(248,81,73,0.1)";
const scd = (s: number) => s >= 8 ? "rgba(63,185,80,0.3)" : s >= 6 ? "rgba(210,153,34,0.3)" : "rgba(248,81,73,0.3)";

function getCriterionIcon(criterion: string): string {
  if (criterion.includes("marché")) return "📊";
  if (criterion.includes("problème") || criterion.includes("solution")) return "🎯";
  if (criterion.includes("équipe")) return "👥";
  if (criterion.includes("concurrentiel")) return "⚡";
  if (criterion.includes("traction")) return "📈";
  if (criterion.includes("financement")) return "💰";
  return "•";
}

export default function UploadPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Upload
  const [status, setStatus]     = useState<"idle"|"uploading"|"processing"|"done"|"error">("idle");
  const [result, setResult]     = useState<PitchExtractedData | null>(null);
  const [error, setError]       = useState("");
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [pitchId, setPitchId]   = useState("");

  // Auth
  const [user, setUser]                 = useState<User | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Stats utilisateur (nouveau)
  const [userStats, setUserStats] = useState<UserStats>({ pitches: 0, grants: 0, submissions: 0 });
  const [previousPitches, setPreviousPitches] = useState<PitchListItem[]>([]);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [pitchSearch, setPitchSearch] = useState("");
  const [pitchesError, setPitchesError] = useState("");

  // Chatbot
  const [chatOpen, setChatOpen]   = useState(false);
  const [chatTab, setChatTab]     = useState<"evaluate"|"chat">("evaluate");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError]   = useState("");
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [convId, setConvId]         = useState<string | null>(null);
  const [chatInput, setChatInput]   = useState("");
  const [sending, setSending]       = useState(false);
  const [chatError, setChatError]   = useState("");
  const [autoEvaluate, setAutoEvaluate] = useState(false);

  // ── Fetch stats utilisateur
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
      // silencieux — les stats restent à 0 si l'endpoint n'est pas encore prêt
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); }
    else {
      setUser(getUser());
      setIsLoading(false);
      fetchUserStats();
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) return;

    const fetchPreviousPitches = async () => {
      setLoadingPitches(true);
      setPitchesError("");
      try {
        const data = await listPitches();
        setPreviousPitches(normalizePitches(data));
      } catch (err: any) {
        setPitchesError(err?.message || "Impossible de charger les pitches existants.");
      } finally {
        setLoadingPitches(false);
      }
    };

    fetchPreviousPitches();
  }, []);

  useEffect(() => {
    const pendingEvalId = localStorage.getItem("open_eval_pitch_id");
    if (pendingEvalId) {
      localStorage.removeItem("open_eval_pitch_id");
      setPitchId(pendingEvalId);
      setChatOpen(true);
      setChatTab("evaluate");
      setAutoEvaluate(true);
    }
  }, []);

  useEffect(() => {
    if (!autoEvaluate) return;
    if (!user?.id || !pitchId) return;
    setAutoEvaluate(false);
    handleEvaluate();
  }, [autoEvaluate, user?.id, pitchId]);

  const handleLogout = () => { clearAuth(); router.push("/login"); };

  const pollStatus = async (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      setProgress(Math.min(90, attempts * 10));
      try {
        const data: PitchUploadResponse = await getPitchStatus(id);
        if (data.status === "completed" && data.extracted_data) {
          clearInterval(interval);
          setProgress(100);
          setResult(data.extracted_data);
          setPitchId(data.pitch_id);
          localStorage.setItem("pitch_id", data.pitch_id);
          localStorage.setItem("pitch_data", JSON.stringify({ pitch_id: data.pitch_id, ...data.extracted_data }));
          setStatus("done");
          addToast(
            "success",
            "Extraction réussie",
            `Pitch "${data.extracted_data.startup_name || "Votre startup"}" analysé avec succès.`
          );
          // Rafraîchir les stats après upload réussi
          fetchUserStats();
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError(data.message);
          setStatus("error");
        }
      } catch { clearInterval(interval); setStatus("error"); }
    }, 2000);
  };

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFilename(file.name); setStatus("uploading"); setProgress(10); setError(""); setResult(null);
    try {
      const response: PitchUploadResponse = await uploadPitchDeck(file);
      const msg = response.message || "";
      if (/duplicate|déjà|already|exist/i.test(msg)) {
        addToast(
          "warning",
          "Pitch déjà analysé",
          `Le fichier "${file.name}" a déjà été traité.`
        );
      }
      localStorage.setItem("pitch_id", response.pitch_id);
      setStatus("processing"); setProgress(20);
      await pollStatus(response.pitch_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'upload");
      setStatus("error");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    },
    maxFiles: 1,
    disabled: status === "uploading" || status === "processing",
  });

  const reset = () => { setStatus("idle"); setResult(null); setError(""); setProgress(0); };

  const searchablePitches = useMemo(() => {
    const q = pitchSearch.trim().toLowerCase();
    return [...previousPitches]
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .filter((pitch) => {
        if (!pitch.extracted_data) return false;
        if (!q) return true;
        const data = pitch.extracted_data;
        return [
          data.startup_name,
          pitch.filename,
          data.industry,
          data.stage,
          data.country,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      });
  }, [previousPitches, pitchSearch]);

  const handleUseExistingPitch = (pitch: PitchListItem) => {
    if (!pitch.extracted_data) {
      addToast("error", "Pitch incomplet", "Ce pitch n'a pas encore de donnees extraites.");
      return;
    }

    localStorage.setItem("pitch_id", pitch.pitch_id);
    localStorage.setItem(
      "pitch_data",
      JSON.stringify({ pitch_id: pitch.pitch_id, ...pitch.extracted_data })
    );
    addToast(
      "success",
      "Pitch selectionne",
      `Recherche de grants lancee pour ${pitch.extracted_data.startup_name || pitch.filename || "ce pitch"}.`
    );
    router.push("/grants");
  };

  const handleLaunchSearch = () => {
    if (!result) return;
    if (!localStorage.getItem("pitch_id") || !localStorage.getItem("pitch_data")) {
      alert("Erreur: données du pitch manquantes. Réessayez."); return;
    }
    router.push("/grants");
  };

  // Chatbot handlers
  const handleEvaluate = async () => {
    if (!user?.id || !pitchId) return;
    setEvaluating(true); setEvalError("");
    try {
      const res = await apiEvaluate(pitchId, user.id);
      setEvaluation(res); setConvId(res.conversation_id);
    } catch { setEvalError("Erreur. Vérifiez qu'Ollama est lancé (ollama serve)."); }
    finally { setEvaluating(false); }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !user?.id || !pitchId || sending) return;
    const msg = chatInput.trim();
    setChatInput(""); setSending(true); setChatError("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    try {
      const res = await apiChat(pitchId, user.id, msg, convId);
      setConvId(res.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.assistant_response }]);
    } catch { setChatError("Erreur. Vérifiez qu'Ollama est lancé."); }
    finally { setSending(false); }
  };

  // ── Calcul complétion profil
  const profileCompletion = (() => {
    if (!user) return 0;
    const fields = [user.first_name, user.last_name, user.email, user.company_name];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

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

        /* ── PROFILE TRIGGER ── */
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
          font-size: 14px; font-weight: 700; color: white;
        }
        .profile-name { font-size: 13px; font-weight: 600; color: white; }
        .profile-company { font-size: 11px; color: #7d8590; }
        .profile-chevron { font-size: 12px; color: #7d8590; transition: transform 0.2s; margin-left: 4px; }
        .profile-chevron.active { transform: rotate(180deg); color: #3fb950; }

        /* ── DROPDOWN ── */
        .profile-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #161b22; border: 1px solid #30363d; border-radius: 14px;
          width: 300px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); z-index: 100;
          opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
          overflow: hidden;
        }
        .profile-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }

        /* Header */
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

        /* Stats */
        .dd-stats {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: #21262d;
          border-top: 1px solid #21262d; border-bottom: 1px solid #21262d;
        }
        .dd-stat {
          background: #0d1117; padding: 12px 8px; text-align: center;
        }
        .dd-stat-val { font-size: 18px; font-weight: 700; color: white; line-height: 1; }
        .dd-stat-lbl { font-size: 10px; color: #7d8590; margin-top: 4px; letter-spacing: 0.3px; }

        /* Progression */
        .dd-progress { padding: 12px 16px; border-bottom: 1px solid #21262d; }
        .dd-progress-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px;
        }
        .dd-progress-label { font-size: 11px; color: #7d8590; }
        .dd-progress-pct { font-size: 11px; font-weight: 700; color: #3fb950; }
        .dd-progress-track {
          height: 4px; background: #21262d; border-radius: 4px; overflow: hidden;
        }
        .dd-progress-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #238636, #3fb950); transition: width 0.6s ease;
        }

        /* Navigation items */
        .dd-body { padding: 6px; }
        .dd-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 10px;
          color: #adbac7; font-size: 13px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
          text-decoration: none;
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

        .loading-spinner {
          width: 12px; height: 12px; border: 2px solid #30363d;
          border-top-color: #3fb950; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        .hero { padding: 60px 40px 40px; max-width: 900px; margin: 0 auto; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; font-size: 11px; font-weight: 600; padding: 4px 12px;
          border-radius: 20px; margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase;
        }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #3fb950; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .hero h1 { font-size: 36px; font-weight: 800; color: white; margin-bottom: 12px; line-height: 1.2; }
        .hero h1 span { color: #3fb950; }
        .hero p { font-size: 15px; color: #7d8590; line-height: 1.6; max-width: 500px; }
        .content { max-width: 900px; margin: 0 auto; padding: 0 40px 80px; }
        .layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
        .dropzone-wrap {
          border: 2px dashed #30363d; border-radius: 16px; padding: 64px 40px;
          text-align: center; cursor: pointer; transition: all 0.2s; background: #161b22;
        }
        .dropzone-wrap:hover { border-color: #3fb950; background: rgba(35,134,54,0.03); }
        .dropzone-wrap.dz-active { border-color: #3fb950; background: rgba(35,134,54,0.07); }
        .dropzone-icon {
          width: 64px; height: 64px; border-radius: 16px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px; font-size: 28px;
        }
        .dropzone-title { font-size: 18px; font-weight: 700; color: white; margin-bottom: 8px; }
        .dropzone-sub { font-size: 13px; color: #7d8590; margin-bottom: 24px; }
        .dropzone-btn {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 8px; cursor: pointer;
        }
        .dropzone-btn:hover { background: #2ea043; }
        .dropzone-formats { display: flex; gap: 8px; justify-content: center; margin-top: 20px; }
        .format-tag {
          font-size: 11px; padding: 3px 10px; border-radius: 4px;
          background: #21262d; border: 1px solid #30363d; color: #7d8590; font-family: monospace;
        }
        .existing-panel {
          margin-top: 16px; background: #161b22; border: 1px solid #21262d;
          border-radius: 12px; padding: 16px;
        }
        .existing-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px; margin-bottom: 14px;
        }
        .existing-title { font-size: 14px; font-weight: 800; color: white; margin-bottom: 4px; }
        .existing-sub { font-size: 12px; color: #7d8590; line-height: 1.5; }
        .existing-count {
          flex-shrink: 0; font-size: 11px; font-weight: 700; color: #3fb950;
          border: 1px solid rgba(35,134,54,0.3); background: rgba(35,134,54,0.08);
          border-radius: 999px; padding: 4px 10px;
        }
        .existing-search {
          width: 100%; background: #0d1117; border: 1px solid #30363d;
          border-radius: 8px; padding: 10px 12px; color: #e6edf3;
          font-size: 12px; font-family: inherit; margin-bottom: 12px;
        }
        .existing-search:focus { outline: none; border-color: #3fb950; }
        .existing-search::placeholder { color: #7d8590; }
        .existing-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; }
        .existing-item {
          display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
          background: #0d1117; border: 1px solid #21262d; border-radius: 10px; padding: 12px;
        }
        .existing-name { font-size: 13px; font-weight: 800; color: white; margin-bottom: 4px; }
        .existing-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: #7d8590; }
        .existing-tag {
          border: 1px solid #30363d; background: #161b22; color: #7d8590;
          border-radius: 999px; padding: 2px 8px; max-width: 170px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .existing-action {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 8px;
          cursor: pointer; white-space: nowrap;
        }
        .existing-action:hover { background: #2ea043; }
        .existing-empty {
          border: 1px dashed #30363d; border-radius: 10px; padding: 18px;
          text-align: center; color: #7d8590; font-size: 12px; line-height: 1.6;
        }
        .processing-card {
          border: 1px solid #30363d; border-radius: 16px; padding: 48px 40px;
          text-align: center; background: #161b22;
        }
        .spinner {
          width: 48px; height: 48px; border-radius: 50%;
          border: 3px solid #21262d; border-top-color: #3fb950;
          animation: spin 0.8s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .processing-title { font-size: 17px; font-weight: 700; color: white; margin-bottom: 6px; }
        .processing-sub { font-size: 13px; color: #7d8590; margin-bottom: 24px; font-family: monospace; }
        .progress-bar-wrap {
          background: #21262d; border-radius: 8px; height: 6px; max-width: 300px; margin: 0 auto; overflow: hidden;
        }
        .progress-bar {
          height: 100%; border-radius: 8px;
          background: linear-gradient(90deg, #238636, #3fb950); transition: width 0.5s ease;
        }
        .processing-steps { display: flex; gap: 24px; justify-content: center; margin-top: 28px; }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #3fb950; animation: pulse 1.5s infinite; }
        .step-dot.done { animation: none; }
        .step-dot.wait { animation: none; background: #30363d; }
        .step-label { font-size: 11px; color: #7d8590; font-family: monospace; }
        .error-card {
          border: 1px solid rgba(248,81,73,0.3); border-radius: 16px; padding: 24px;
          background: rgba(248,81,73,0.05); display: flex; align-items: flex-start; gap: 14px;
        }
        .error-title { font-size: 14px; font-weight: 700; color: #f85149; margin-bottom: 4px; }
        .error-msg { font-size: 12px; color: #7d8590; font-family: monospace; line-height: 1.5; }
        .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .results-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: white; }
        .success-badge {
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;
        }
        .new-btn {
          background: transparent; border: 1px solid #30363d; color: #7d8590;
          font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer;
        }
        .new-btn:hover { border-color: #7d8590; color: #e6edf3; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 12px; }
        .info-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; }
        .info-label { font-size: 10px; color: #7d8590; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .info-value { font-size: 14px; font-weight: 700; color: white; }
        .text-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .text-label { font-size: 10px; color: #7d8590; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .text-value { font-size: 13px; color: #adbac7; line-height: 1.7; }
        .keywords-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .keyword {
          font-size: 12px; padding: 4px 12px; border-radius: 20px;
          background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.2); color: #58a6ff; font-family: monospace;
        }
        .cta-btn {
          width: 100%; margin-top: 24px; background: #238636; border: 1px solid #2ea043;
          color: white; font-size: 14px; font-weight: 700; padding: 14px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s;
        }
        .cta-btn:hover { background: #2ea043; }
        .sidebar { display: flex; flex-direction: column; gap: 12px; }
        .sidebar-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; }
        .sidebar-title { font-size: 12px; font-weight: 700; color: white; margin-bottom: 12px; }
        .sidebar-item {
          display: flex; align-items: flex-start; gap: 10px; padding: 8px 0;
          border-bottom: 1px solid #21262d; font-size: 12px; color: #7d8590;
        }
        .sidebar-item:last-child { border-bottom: none; padding-bottom: 0; }
        .sidebar-item-icon { font-size: 14px; flex-shrink: 0; }
        .chatbot-fab {
          position: fixed; bottom: 32px; right: 32px; z-index: 200;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          border: none; cursor: pointer; font-size: 24px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(35,134,54,0.4); transition: transform 0.2s;
        }
        .chatbot-fab:hover { transform: scale(1.1); }
        .chatbot-panel {
          position: fixed; bottom: 100px; right: 32px; z-index: 200;
          width: 420px; max-height: 620px; background: #161b22;
          border: 1px solid #30363d; border-radius: 16px;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden;
        }
        .cb-header {
          padding: 16px 20px; background: #0d1117; border-bottom: 1px solid #21262d;
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .cb-header-left { display: flex; align-items: center; gap: 10px; }
        .cb-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .cb-title { font-size: 14px; font-weight: 700; color: white; }
        .cb-sub { font-size: 11px; color: #7d8590; font-family: monospace; }
        .cb-close { background: none; border: none; color: #7d8590; cursor: pointer; font-size: 18px; }
        .cb-close:hover { color: white; }
        .cb-tabs { display: flex; border-bottom: 1px solid #21262d; flex-shrink: 0; }
        .cb-tab {
          flex: 1; padding: 10px; background: none; border: none; color: #7d8590;
          font-size: 12px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .cb-tab.active { color: #3fb950; border-bottom-color: #3fb950; }
        .cb-tab:hover { color: #e6edf3; }
        .cb-body { flex: 1; overflow-y: auto; padding: 16px; scrollbar-width: thin; scrollbar-color: #30363d transparent; }
        .eval-start { text-align: center; padding: 32px 16px; }
        .eval-start-icon { font-size: 48px; margin-bottom: 16px; }
        .eval-start-title { font-size: 15px; font-weight: 700; color: white; margin-bottom: 8px; }
        .eval-start-sub { font-size: 12px; color: #7d8590; line-height: 1.6; margin-bottom: 20px; }
        .eval-btn {
          background: #238636; border: 1px solid #2ea043; color: white;
          font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: 8px;
          cursor: pointer; width: 100%; transition: background 0.15s;
        }
        .eval-btn:hover:not(:disabled) { background: #2ea043; }
        .eval-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .eval-loading { text-align: center; padding: 32px 16px; }
        .eval-spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid #21262d; border-top-color: #3fb950;
          animation: spin 0.8s linear infinite; margin: 0 auto 16px;
        }
        .overall-score {
          text-align: center; padding: 20px; background: #0d1117; border-radius: 12px; margin-bottom: 16px;
        }
        .score-circle {
          width: 80px; height: 80px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px; font-size: 24px; font-weight: 800; border: 3px solid;
        }
        .score-label { font-size: 12px; color: #7d8590; font-family: monospace; text-transform: uppercase; }
        .criteria-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .criterion-item { background: #0d1117; border-radius: 8px; padding: 10px 12px; border: 1px solid #21262d; }
        .criterion-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .criterion-name { font-size: 11px; font-weight: 600; color: #e6edf3; display: flex; align-items: center; gap: 6px; }
        .criterion-score { font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 20px; border: 1px solid; }
        .criterion-bar-bg { height: 4px; background: #21262d; border-radius: 4px; overflow: hidden; }
        .criterion-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .summary-box { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
        .summary-label { font-size: 10px; color: #7d8590; font-family: monospace; text-transform: uppercase; margin-bottom: 6px; }
        .summary-text { font-size: 12px; color: #adbac7; line-height: 1.6; }
        .reco-item {
          display: flex; gap: 8px; align-items: flex-start;
          background: #0d1117; border: 1px solid #21262d; border-radius: 8px;
          padding: 10px; font-size: 12px; color: #adbac7; line-height: 1.5; margin-bottom: 6px;
        }
        .reco-icon { color: #3fb950; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
        .cb-chat-btn {
          width: 100%; margin-top: 16px; background: rgba(35,134,54,0.1);
          border: 1px solid rgba(35,134,54,0.3); color: #3fb950;
          font-size: 12px; font-weight: 600; padding: 10px; border-radius: 8px; cursor: pointer;
        }
        .cb-chat-btn:hover { background: rgba(35,134,54,0.2); }
        .chat-messages { display: flex; flex-direction: column; gap: 10px; }
        .chat-empty { text-align: center; padding: 32px 16px; font-size: 12px; color: #7d8590; }
        .msg-bubble { max-width: 85%; padding: 10px 12px; border-radius: 10px; font-size: 12px; line-height: 1.6; }
        .msg-user {
          background: rgba(35,134,54,0.15); border: 1px solid rgba(35,134,54,0.2);
          color: #e6edf3; align-self: flex-end; border-radius: 10px 10px 2px 10px;
        }
        .msg-assistant {
          background: #0d1117; border: 1px solid #21262d;
          color: #adbac7; align-self: flex-start; border-radius: 10px 10px 10px 2px;
        }
        .msg-typing { display: flex; gap: 4px; align-items: center; padding: 12px; }
        .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: #7d8590; animation: bounce 1.2s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        .cb-input-wrap {
          padding: 12px 16px; border-top: 1px solid #21262d;
          display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
        }
        .cb-input {
          flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
          padding: 8px 12px; color: #e6edf3; font-size: 12px; font-family: inherit;
          resize: none; min-height: 36px; max-height: 100px; transition: border-color 0.15s;
        }
        .cb-input:focus { outline: none; border-color: #3fb950; }
        .cb-input::placeholder { color: #7d8590; }
        .cb-send {
          background: #238636; border: 1px solid #2ea043; color: white;
          width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;
        }
        .cb-send:hover:not(:disabled) { background: #2ea043; }
        .cb-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .cb-error { font-size: 11px; color: #f85149; padding: 8px; background: rgba(248,81,73,0.05); border-radius: 6px; margin-top: 8px; }

        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; }
          .grid-4 { grid-template-columns: repeat(2,1fr); }
          .hero { padding: 40px 20px 24px; }
          .content { padding: 0 20px 60px; }
          .nav { padding: 12px 20px; }
          .chatbot-panel { width: calc(100vw - 32px); right: 16px; bottom: 90px; }
          .chatbot-fab { right: 16px; bottom: 16px; }
          .profile-dropdown { width: calc(100vw - 32px); right: -8px; }
          .existing-header { display: block; }
          .existing-count { display: inline-flex; margin-top: 10px; }
          .existing-item { grid-template-columns: 1fr; }
          .existing-action { width: 100%; }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚀</div>
            <span className="nav-logo-text">Grants Platform</span>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:"24px"}}>
            <StepsNavbar />
            {isLoading ? (
              <div style={{display:"flex",alignItems:"center",gap:"8px",color:"#7d8590",fontSize:"13px"}}>
                <div className="loading-spinner" />
              </div>
            ) : user ? (
              <NotificationBell />
            ) : null}
            {user ? (
              <div className="user-profile-wrapper">
                {/* ── Trigger ── */}
                <div
                  className="user-profile-card"
                  onClick={() => setShowDropdown(!showDropdown)}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="profile-avatar">
                    {(user.first_name?.[0]||"").toUpperCase()}{(user.last_name?.[0]||"").toUpperCase()}
                  </div>
                  <div>
                    <div className="profile-name">{user.first_name} {user.last_name}</div>
                    <div className="profile-company">{user.company_name || "No company"}</div>
                  </div>
                  <div className={`profile-chevron ${showDropdown?"active":""}`}>▼</div>
                </div>

                {/* ── Dropdown enrichi ── */}
                <div
                  className={`profile-dropdown ${showDropdown?"active":""}`}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  {/* Header */}
                  <div className="dd-header">
                    <div className="dd-avatar">
                      {(user.first_name?.[0]||"").toUpperCase()}{(user.last_name?.[0]||"").toUpperCase()}
                    </div>
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
                      <div className="dd-progress-fill" style={{width:`${profileCompletion}%`}} />
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
            ) : null}
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            Étape 1 sur 4
          </div>
          <h1>Analyse ton <span>Pitch Deck</span></h1>
          <p>Upload ton PDF ou PPTX — notre IA extrait automatiquement toutes les données clés de ton startup en quelques secondes.</p>
        </div>

        {/* CONTENT */}
        <div className="content">
          <div className="layout">
            <div>
              {status === "idle" && (
                <>
                <div {...getRootProps()} className={`dropzone-wrap ${isDragActive?"dz-active":""}`}>
                  <input {...getInputProps()} />
                  <div className="dropzone-icon">📄</div>
                  <div className="dropzone-title">{isDragActive ? "Dépose le fichier ici..." : "Glisse ton pitch deck ici"}</div>
                  <div className="dropzone-sub">ou clique pour sélectionner un fichier</div>
                  <div className="dropzone-btn">Choisir un fichier</div>
                  <div className="dropzone-formats">
                    <span className="format-tag">.pdf</span>
                    <span className="format-tag">.pptx</span>
                    <span className="format-tag">max 20MB</span>
                  </div>
                </div>

                <div className="existing-panel">
                  <div className="existing-header">
                    <div>
                      <div className="existing-title">Utiliser un pitch deck deja uploade</div>
                      <div className="existing-sub">
                        Lance la recherche de grants sur un fichier deja analyse, sans re-uploader le meme PDF.
                      </div>
                    </div>
                    <div className="existing-count">{searchablePitches.length} disponibles</div>
                  </div>

                  <input
                    className="existing-search"
                    placeholder="Rechercher par startup, fichier, industrie..."
                    value={pitchSearch}
                    onChange={(e) => setPitchSearch(e.target.value)}
                  />

                  {loadingPitches ? (
                    <div className="existing-empty">Chargement de tes pitch decks...</div>
                  ) : pitchesError ? (
                    <div className="existing-empty">{pitchesError}</div>
                  ) : searchablePitches.length === 0 ? (
                    <div className="existing-empty">
                      Aucun pitch deck analyse trouve. Tu peux uploader un nouveau fichier ci-dessus.
                    </div>
                  ) : (
                    <div className="existing-list">
                      {searchablePitches.slice(0, 5).map((pitch) => {
                        const data = pitch.extracted_data!;
                        return (
                          <div className="existing-item" key={pitch.pitch_id}>
                            <div>
                              <div className="existing-name">{data.startup_name || pitch.filename || "Pitch deck"}</div>
                              <div className="existing-meta">
                                {pitch.filename && <span className="existing-tag">{pitch.filename}</span>}
                                {data.industry && <span className="existing-tag">{data.industry}</span>}
                                {data.stage && <span className="existing-tag">{data.stage}</span>}
                                {formatPitchDate(pitch.created_at) && (
                                  <span className="existing-tag">{formatPitchDate(pitch.created_at)}</span>
                                )}
                              </div>
                            </div>
                            <button className="existing-action" onClick={() => handleUseExistingPitch(pitch)}>
                              Chercher des grants
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </>
              )}

              {status === "error" && (
                <>
                  <div {...getRootProps()} className="dropzone-wrap" style={{marginBottom:"16px"}}>
                    <input {...getInputProps()} />
                    <div className="dropzone-icon">📄</div>
                    <div className="dropzone-title">Glisse ton pitch deck ici</div>
                    <div className="dropzone-sub">ou clique pour sélectionner un fichier</div>
                    <div className="dropzone-btn">Choisir un fichier</div>
                    <div className="dropzone-formats">
                      <span className="format-tag">.pdf</span>
                      <span className="format-tag">.pptx</span>
                    </div>
                  </div>
                  <div className="error-card">
                    <span style={{fontSize:"20px"}}>⚠️</span>
                    <div>
                      <div className="error-title">Erreur d'extraction</div>
                      <div className="error-msg">{error.substring(0,200)}{error.length>200?"...":""}</div>
                    </div>
                  </div>
                </>
              )}

              {(status==="uploading"||status==="processing") && (
                <div className="processing-card">
                  <div className="spinner" />
                  <div className="processing-title">
                    {status==="uploading" ? "Upload en cours..." : "🧠 Analyse par l'IA en cours..."}
                  </div>
                  <div className="processing-sub">{filename}</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{width:`${progress}%`}} />
                  </div>
                  {status==="processing" && (
                    <div className="processing-steps">
                      <div className="step-item"><div className="step-dot done"/><div className="step-label">Extraction texte</div></div>
                      <div className="step-item"><div className="step-dot"/><div className="step-label">Analyse LLM</div></div>
                      <div className="step-item"><div className="step-dot wait"/><div className="step-label">Structuration</div></div>
                    </div>
                  )}
                </div>
              )}

              {status==="done" && result && (
                <div>
                  <div className="results-header">
                    <div className="results-title">
                      🎉 {result.startup_name}
                      <div className="success-badge">✅ Extraction réussie</div>
                    </div>
                    <button className="new-btn" onClick={reset}>+ Nouveau</button>
                  </div>
                  <div className="grid-4">
                    {[
                      {label:"🏭 Industrie", value:result.industry},
                      {label:"📈 Stade",     value:result.stage},
                      {label:"🌍 Pays",      value:result.country},
                      {label:"💰 Funding",   value:result.funding_needed||"Non précisé"},
                    ].map(({label,value}) => (
                      <div className="info-card" key={label}>
                        <div className="info-label">{label}</div>
                        <div className="info-value">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid-2">
                    <div className="text-card">
                      <div className="text-label">❓ Problème</div>
                      <div className="text-value">{result.problem}</div>
                    </div>
                    <div className="text-card">
                      <div className="text-label">💡 Solution</div>
                      <div className="text-value">{result.solution}</div>
                    </div>
                  </div>
                  <div className="text-card">
                    <div className="text-label">📊 Marché</div>
                    <div className="text-value">{result.market_size}</div>
                  </div>
                  <div className="text-card">
                    <div className="text-label">💼 Business Model</div>
                    <div className="text-value">{result.business_model}</div>
                  </div>
                  <div className="text-card">
                    <div className="text-label">👥 Équipe</div>
                    <div className="text-value">{result.team}</div>
                  </div>
                  {result.traction && (
                    <div className="text-card">
                      <div className="text-label">📈 Traction</div>
                      <div className="text-value">{result.traction}</div>
                    </div>
                  )}
                  <div className="text-card">
                    <div className="text-label">🏷️ Mots-clés pour la recherche de grants</div>
                    <div className="keywords-wrap">
                      {result.keywords.map(k => <span className="keyword" key={k}>{k}</span>)}
                    </div>
                  </div>
                  <button className="cta-btn" onClick={handleLaunchSearch}>
                    🔍 Lancer la Recherche de Grants →
                  </button>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="sidebar">
              <div className="sidebar-card">
                <div className="sidebar-title">🤖 Comment ça marche ?</div>
                {[
                  {icon:"1️⃣",text:"Upload ton pitch deck PDF ou PPTX"},
                  {icon:"2️⃣",text:"Le LLM extrait automatiquement tes données business"},
                  {icon:"3️⃣",text:"L'agent cherche les grants adaptés à ton profil"},
                  {icon:"4️⃣",text:"Soumission autonome sur les portails"},
                ].map(({icon,text}) => (
                  <div className="sidebar-item" key={icon}>
                    <div className="sidebar-item-icon">{icon}</div>
                    <div>{text}</div>
                  </div>
                ))}
              </div>
              <div className="sidebar-card">
                <div className="sidebar-title">✅ Formats supportés</div>
                <div className="sidebar-item"><div className="sidebar-item-icon">📄</div><div>PDF — pitch deck, présentation</div></div>
                <div className="sidebar-item"><div className="sidebar-item-icon">📊</div><div>PPTX — PowerPoint</div></div>
                <div className="sidebar-item"><div className="sidebar-item-icon">⚖️</div><div>Max 20MB par fichier</div></div>
              </div>
              <div className="sidebar-card" style={{borderColor:"rgba(35,134,54,0.3)",background:"rgba(35,134,54,0.03)"}}>
                <div className="sidebar-title" style={{color:"#3fb950"}}>🔒 Confidentialité</div>
                <div style={{fontSize:"12px",color:"#7d8590",lineHeight:"1.6"}}>
                  Tes données ne sont jamais partagées. Le fichier est traité localement et supprimé après extraction.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHATBOT FAB */}
      {status === "done" && result && pitchId && user && (
        <>
          <button className="chatbot-fab" onClick={() => setChatOpen(!chatOpen)} title="Pitch Advisor AI">
            {chatOpen ? "✕" : "🤖"}
          </button>
          {chatOpen && (
            <div className="chatbot-panel">
              <div className="cb-header">
                <div className="cb-header-left">
                  <div className="cb-avatar">🤖</div>
                  <div>
                    <div className="cb-title">Pitch Advisor AI</div>
                    <div className="cb-sub">{result.startup_name}</div>
                  </div>
                </div>
                <button className="cb-close" onClick={() => setChatOpen(false)}>✕</button>
              </div>
              <div className="cb-tabs">
                <button className={`cb-tab ${chatTab==="evaluate"?"active":""}`} onClick={() => setChatTab("evaluate")}>
                  📊 Évaluation
                </button>
                <button className={`cb-tab ${chatTab==="chat"?"active":""}`} onClick={() => setChatTab("chat")}>
                  💬 Chat
                </button>
              </div>
              <div className="cb-body">
                {chatTab === "evaluate" && (
                  <>
                    {!evaluation && !evaluating && (
                      <div className="eval-start">
                        <div className="eval-start-icon">📋</div>
                        <div className="eval-start-title">Évaluer ton Pitch Deck</div>
                        <div className="eval-start-sub">
                          L'IA analyse ton pitch sur 6 critères clés et te donne un score détaillé avec des recommandations.
                        </div>
                        <button className="eval-btn" onClick={handleEvaluate}>🚀 Lancer l'évaluation</button>
                        {evalError && <div className="cb-error">⚠️ {evalError}</div>}
                      </div>
                    )}
                    {evaluating && (
                      <div className="eval-loading">
                        <div className="eval-spinner" />
                        <div style={{color:"#e6edf3",fontSize:"13px",fontWeight:700}}>Analyse en cours...</div>
                        <div style={{color:"#7d8590",fontSize:"11px",marginTop:"6px"}}>Ollama évalue ton pitch sur 6 critères</div>
                      </div>
                    )}
                    {evaluation && (
                      <>
                        <div className="overall-score">
                          <div className="score-circle" style={{
                            color: sc(evaluation.overall_score),
                            borderColor: sc(evaluation.overall_score),
                            background: scb(evaluation.overall_score),
                          }}>
                            {evaluation.overall_score.toFixed(1)}
                          </div>
                          <div style={{fontSize:"14px",fontWeight:700,color:"white",marginBottom:"4px"}}>Score Global</div>
                          <div className="score-label">sur 10 points</div>
                        </div>
                        <div className="criteria-list">
                          {[...evaluation.criteria].sort((a, b) => b.score - a.score).map((c, i) => (

                            <div className="criterion-item" key={i}>
                              <div className="criterion-header">
                                <div className="criterion-name">
                                  {getCriterionIcon(c.criterion)} {c.criterion}
                                </div>
                                <div className="criterion-score" style={{
                                  color: sc(c.score), background: scb(c.score), borderColor: scd(c.score),
                                }}>
                                  {c.score}/10
                                </div>
                              </div>
                              <div className="criterion-bar-bg">
                                <div className="criterion-bar" style={{width:`${c.score*10}%`, background: sc(c.score)}} />
                              </div>
                              {c.feedback && (
                                <div style={{fontSize:"11px",color:"#7d8590",marginTop:"6px",lineHeight:"1.4"}}>{c.feedback}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {evaluation.summary && (
                          <div className="summary-box">
                            <div className="summary-label">📝 Résumé</div>
                            <div className="summary-text">{evaluation.summary}</div>
                          </div>
                        )}
                        {evaluation.recommendations.length > 0 && (
                          <div className="summary-box">
                            <div className="summary-label">💡 Recommandations</div>
                            {evaluation.recommendations.map((r, i) => (
                              <div className="reco-item" key={i}>
                                <span className="reco-icon">→</span>{r}
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="cb-chat-btn" onClick={() => setChatTab("chat")}>
                          💬 Discuter de l'évaluation →
                        </button>
                        <button
                          className="eval-btn"
                          onClick={() => { setEvaluation(null); handleEvaluate(); }}
                          style={{marginTop:"8px",background:"transparent",border:"1px solid #30363d",color:"#7d8590"}}
                        >
                          🔄 Re-évaluer
                        </button>
                      </>
                    )}
                  </>
                )}
                {chatTab === "chat" && (
                  <div className="chat-messages">
                    {messages.length === 0 && (
                      <div className="chat-empty">
                        <div style={{fontSize:"32px",marginBottom:"12px"}}>💬</div>
                        <div style={{color:"#e6edf3",fontWeight:700,marginBottom:"6px"}}>Pose tes questions</div>
                        <div>Demande des conseils pour améliorer ton pitch, comprendre les grants, ou affiner ta stratégie.</div>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                        <div className={`msg-bubble ${msg.role==="user"?"msg-user":"msg-assistant"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {sending && (
                      <div style={{display:"flex"}}>
                        <div className="msg-bubble msg-assistant msg-typing">
                          <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                        </div>
                      </div>
                    )}
                    {chatError && <div className="cb-error">⚠️ {chatError}</div>}
                  </div>
                )}
              </div>
              {chatTab === "chat" && (
                <div className="cb-input-wrap">
                  <textarea
                    className="cb-input"
                    placeholder="Pose une question sur ton pitch..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    disabled={sending}
                    rows={1}
                  />
                  <button className="cb-send" onClick={handleSendChat} disabled={!chatInput.trim()||sending}>➤</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
