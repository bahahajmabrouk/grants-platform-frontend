"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { uploadPitchDeck, getPitchStatus } from "@/lib/api";
import { PitchUploadResponse, PitchExtractedData } from "@/types/pitch";
import { isAuthenticated, getUser, clearAuth, getAccessToken } from "@/lib/auth";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";

// ── Types Chatbot
interface CriterionScore { name: string; score: number; feedback: string; }
interface EvaluationResult {
  pitch_id: string; conversation_id: string; overall_score: number;
  criteria_scores: Record<string, CriterionScore>; summary: string; recommendations: string[];
}
interface ChatMsg { role: "user" | "assistant"; content: string; }

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
    body: JSON.stringify({ pitch_id: pitchId, user_id: userId, message, conversation_id: convId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Score helpers
const sc  = (s: number) => s >= 8 ? "#3fb950" : s >= 6 ? "#d29922" : "#f85149";
const scb = (s: number) => s >= 8 ? "rgba(63,185,80,0.1)" : s >= 6 ? "rgba(210,153,34,0.1)" : "rgba(248,81,73,0.1)";
const scd = (s: number) => s >= 8 ? "rgba(63,185,80,0.3)" : s >= 6 ? "rgba(210,153,34,0.3)" : "rgba(248,81,73,0.3)";
const icons: Record<string, string> = {
  market_clarity:"📊", problem_solution_fit:"🎯", team_experience:"👥",
  competitive_advantage:"⚡", traction:"📈", funding_clarity:"💰",
};

export default function UploadPage() {
  const router = useRouter();

  // Upload
  const [status, setStatus]     = useState<"idle"|"uploading"|"processing"|"done"|"error">("idle");
  const [result, setResult]     = useState<PitchExtractedData | null>(null);
  const [error, setError]       = useState("");
  const [filename, setFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [pitchId, setPitchId]   = useState("");

  // Auth
  const [user, setUser]               = useState<User | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Chatbot
  const [chatOpen, setChatOpen]             = useState(false);
  const [chatTab, setChatTab]               = useState<"evaluate"|"chat">("evaluate");
  const [evaluation, setEvaluation]         = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating]         = useState(false);
  const [evalError, setEvalError]           = useState("");
  const [messages, setMessages]             = useState<ChatMsg[]>([]);
  const [convId, setConvId]                 = useState<string | null>(null);
  const [chatInput, setChatInput]           = useState("");
  const [sending, setSending]               = useState(false);
  const [chatError, setChatError]           = useState("");

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); }
    else { setUser(getUser()); setIsLoading(false); }
  }, [router]);

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
        .profile-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #161b22; border: 1px solid #30363d; border-radius: 12px;
          min-width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 100;
          opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
        }
        .profile-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
        .dropdown-header {
          padding: 16px; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 12px;
        }
        .dropdown-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; color: white;
        }
        .dropdown-user-name { font-size: 13px; font-weight: 700; color: white; }
        .dropdown-user-email { font-size: 12px; color: #7d8590; }
        .dropdown-user-company { font-size: 11px; color: #58a6ff; }
        .dropdown-body { padding: 8px; }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          color: #7d8590; font-size: 13px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
        }
        .dropdown-item:hover { background: rgba(35,134,54,0.1); color: #adbac7; }
        .dropdown-item.logout { color: #f85149; border-top: 1px solid #21262d; margin-top: 4px; }
        .dropdown-item.logout:hover { background: rgba(248,81,73,0.1); color: #ff7b72; }
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
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #3fb950; animation: pulse 2s infinite;
        }
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

        /* CHATBOT FAB */
        .chatbot-fab {
          position: fixed; bottom: 32px; right: 32px; z-index: 200;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          border: none; cursor: pointer; font-size: 24px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(35,134,54,0.4); transition: transform 0.2s;
        }
        .chatbot-fab:hover { transform: scale(1.1); }

        /* CHATBOT PANEL */
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

        /* Evaluate */
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

        /* Chat */
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
              <div className="user-profile-wrapper">
                <div className="user-profile-card"
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
                <div className={`profile-dropdown ${showDropdown?"active":""}`}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {(user.first_name?.[0]||"").toUpperCase()}{(user.last_name?.[0]||"").toUpperCase()}
                    </div>
                    <div>
                      <div className="dropdown-user-name">{user.first_name} {user.last_name}</div>
                      <div className="dropdown-user-email">{user.email}</div>
                      <div className="dropdown-user-company">{user.company_name||"No company"}</div>
                    </div>
                  </div>
                  <div className="dropdown-body">
                    <div className="dropdown-item logout" onClick={() => { setShowDropdown(false); handleLogout(); }}>
                      <span>🚪</span><span>Logout</span>
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
              {/* IDLE */}
              {status === "idle" && (
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
              )}

              {/* ERROR */}
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

              {/* PROCESSING */}
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

              {/* RESULTS */}
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

      {/* ── CHATBOT FAB — visible seulement après extraction ── */}
      {status === "done" && result && pitchId && user && (
        <>
          <button className="chatbot-fab" onClick={() => setChatOpen(!chatOpen)} title="Pitch Advisor AI">
            {chatOpen ? "✕" : "🤖"}
          </button>

          {chatOpen && (
            <div className="chatbot-panel">
              {/* Header */}
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

              {/* Tabs */}
              <div className="cb-tabs">
                <button className={`cb-tab ${chatTab==="evaluate"?"active":""}`} onClick={() => setChatTab("evaluate")}>
                  📊 Évaluation
                </button>
                <button className={`cb-tab ${chatTab==="chat"?"active":""}`} onClick={() => setChatTab("chat")}>
                  💬 Chat
                </button>
              </div>

              {/* Body */}
              <div className="cb-body">

                {/* EVALUATE TAB */}
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
                        {/* Score global */}
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

                        {/* Critères */}
                        <div className="criteria-list">
                          {Object.entries(evaluation.criteria_scores).map(([key, c]) => (
                            <div className="criterion-item" key={key}>
                              <div className="criterion-header">
                                <div className="criterion-name">{icons[key]||"•"} {c.name}</div>
                                <div className="criterion-score" style={{
                                  color: sc(c.score), background: scb(c.score), borderColor: scd(c.score),
                                }}>
                                  {c.score}/10
                                </div>
                              </div>
                              <div className="criterion-bar-bg">
                                <div className="criterion-bar" style={{width:`${c.score*10}%`, background: sc(c.score)}} />
                              </div>
                              {c.feedback && c.feedback !== "Évalué par Ollama" && (
                                <div style={{fontSize:"11px",color:"#7d8590",marginTop:"6px",lineHeight:"1.4"}}>{c.feedback}</div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Résumé */}
                        {evaluation.summary && (
                          <div className="summary-box">
                            <div className="summary-label">📝 Résumé</div>
                            <div className="summary-text">{evaluation.summary}</div>
                          </div>
                        )}

                        {/* Recommandations */}
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

                {/* CHAT TAB */}
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

              {/* Chat input */}
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