"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadPitchDeck, getPitchStatus } from "@/lib/api";
import { PitchUploadResponse, PitchExtractedData } from "@/types/pitch";

export default function UploadPage() {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [result, setResult] = useState<PitchExtractedData | null>(null);
  const [error, setError] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const pollStatus = async (pitchId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      setProgress(Math.min(90, attempts * 10));
      try {
        const data: PitchUploadResponse = await getPitchStatus(pitchId);
        if (data.status === "completed" && data.extracted_data) {
          clearInterval(interval);
          setProgress(100);
          setResult(data.extracted_data);
          setStatus("done");
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError(data.message);
          setStatus("error");
        }
      } catch {
        clearInterval(interval);
        setStatus("error");
      }
    }, 2000);
  };

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFilename(file.name);
    setStatus("uploading");
    setProgress(10);
    setError("");
    setResult(null);
    try {
      const response: PitchUploadResponse = await uploadPitchDeck(file);
      setStatus("processing");
      setProgress(20);
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
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(13,17,23,0.95);
          backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 50;
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; }
        .nav-logo-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .nav-logo-text { font-size: 15px; font-weight: 700; color: white; }
        .nav-steps { display: flex; gap: 4px; }
        .nav-step {
          padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600;
          border: 1px solid #30363d; color: #7d8590; cursor: default;
        }
        .nav-step.active {
          background: rgba(35,134,54,0.15);
          border-color: rgba(35,134,54,0.4);
          color: #3fb950;
        }

        /* HERO */
        .hero {
          padding: 60px 40px 40px;
          max-width: 900px; margin: 0 auto;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; font-size: 11px; font-weight: 600;
          padding: 4px 12px; border-radius: 20px; margin-bottom: 20px;
          letter-spacing: 1px; text-transform: uppercase;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #3fb950;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

        .hero h1 {
          font-size: 36px; font-weight: 800; line-height: 1.2;
          color: white; margin-bottom: 12px;
        }
        .hero h1 span { color: #3fb950; }
        .hero p { font-size: 15px; color: #7d8590; line-height: 1.6; max-width: 500px; }

        /* MAIN CONTENT */
        .content { max-width: 900px; margin: 0 auto; padding: 0 40px 80px; }

        /* DROPZONE */
        .dropzone-wrap {
          border: 2px dashed #30363d; border-radius: 16px;
          padding: 64px 40px; text-align: center; cursor: pointer;
          transition: all 0.2s;
          background: #161b22;
          position: relative; overflow: hidden;
        }
        .dropzone-wrap:hover { border-color: #3fb950; background: rgba(35,134,54,0.03); }
        .dropzone-wrap.active { border-color: #3fb950; background: rgba(35,134,54,0.07); }
        .dropzone-wrap.disabled { cursor: not-allowed; opacity: 0.6; }

        .dropzone-icon {
          width: 64px; height: 64px; border-radius: 16px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px; font-size: 28px;
        }
        .dropzone-title { font-size: 18px; font-weight: 700; color: white; margin-bottom: 8px; }
        .dropzone-sub { font-size: 13px; color: #7d8590; margin-bottom: 24px; }
        .dropzone-btn {
          display: inline-flex; align-items: center; gap-8px;
          background: #238636; border: 1px solid #2ea043;
          color: white; font-size: 13px; font-weight: 600;
          padding: 9px 20px; border-radius: 8px; cursor: pointer;
          transition: background 0.15s;
        }
        .dropzone-btn:hover { background: #2ea043; }
        .dropzone-formats {
          display: flex; gap: 8px; justify-content: center; margin-top: 20px;
        }
        .format-tag {
          font-size: 11px; padding: 3px 10px; border-radius: 4px;
          background: #21262d; border: 1px solid #30363d;
          color: #7d8590; font-family: monospace;
        }

        /* PROCESSING */
        .processing-card {
          border: 1px solid #30363d; border-radius: 16px;
          padding: 48px 40px; text-align: center;
          background: #161b22;
        }
        .spinner {
          width: 48px; height: 48px; border-radius: 50%;
          border: 3px solid #21262d;
          border-top-color: #3fb950;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .processing-title { font-size: 17px; font-weight: 700; color: white; margin-bottom: 6px; }
        .processing-sub { font-size: 13px; color: #7d8590; margin-bottom: 24px; font-family: monospace; }
        .progress-bar-wrap {
          background: #21262d; border-radius: 8px; height: 6px;
          max-width: 300px; margin: 0 auto;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%; border-radius: 8px;
          background: linear-gradient(90deg, #238636, #3fb950);
          transition: width 0.5s ease;
        }
        .processing-steps {
          display: flex; gap: 24px; justify-content: center; margin-top: 28px;
        }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3fb950; animation: pulse 1.5s infinite;
        }
        .step-dot.done { animation: none; background: #3fb950; }
        .step-dot.wait { animation: none; background: #30363d; }
        .step-label { font-size: 11px; color: #7d8590; font-family: monospace; }

        /* ERROR */
        .error-card {
          border: 1px solid rgba(248,81,73,0.3); border-radius: 16px;
          padding: 24px; background: rgba(248,81,73,0.05);
          display: flex; align-items: flex-start; gap: 14px;
        }
        .error-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
        .error-title { font-size: 14px; font-weight: 700; color: #f85149; margin-bottom: 4px; }
        .error-msg { font-size: 12px; color: #7d8590; font-family: monospace; line-height: 1.5; }
        .retry-btn {
          margin-top: 16px; background: transparent;
          border: 1px solid #30363d; color: #e6edf3;
          font-size: 13px; font-weight: 600;
          padding: 8px 18px; border-radius: 8px; cursor: pointer;
          transition: border-color 0.15s;
        }
        .retry-btn:hover { border-color: #7d8590; }

        /* RESULTS */
        .results-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .results-title {
          display: flex; align-items: center; gap: 10px;
          font-size: 18px; font-weight: 800; color: white;
        }
        .success-badge {
          display: flex; align-items: center; gap: 6px;
          background: rgba(35,134,54,0.1); border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950; font-size: 12px; font-weight: 600;
          padding: 4px 12px; border-radius: 20px;
        }
        .new-btn {
          background: transparent; border: 1px solid #30363d;
          color: #7d8590; font-size: 12px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px; cursor: pointer;
          transition: all 0.15s;
        }
        .new-btn:hover { border-color: #7d8590; color: #e6edf3; }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }

        .info-card {
          background: #161b22; border: 1px solid #21262d;
          border-radius: 10px; padding: 16px;
          transition: border-color 0.15s;
        }
        .info-card:hover { border-color: #30363d; }
        .info-label {
          font-size: 10px; color: #7d8590; font-family: monospace;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;
        }
        .info-value { font-size: 14px; font-weight: 700; color: white; }

        .text-card {
          background: #161b22; border: 1px solid #21262d;
          border-radius: 10px; padding: 16px; margin-bottom: 12px;
          transition: border-color 0.15s;
        }
        .text-card:hover { border-color: #30363d; }
        .text-label {
          font-size: 10px; color: #7d8590; font-family: monospace;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
          display: flex; align-items: center; gap: 6px;
        }
        .text-value { font-size: 13px; color: #adbac7; line-height: 1.7; }

        .keywords-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .keyword {
          font-size: 12px; padding: 4px 12px; border-radius: 20px;
          background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.2);
          color: #58a6ff; font-family: monospace;
        }

        .cta-btn {
          width: 100%; margin-top: 24px;
          background: #238636; border: 1px solid #2ea043;
          color: white; font-size: 14px; font-weight: 700;
          padding: 14px; border-radius: 10px; cursor: pointer;
          transition: background 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .cta-btn:hover { background: #2ea043; }

        /* SIDEBAR INFO */
        .layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
        .sidebar { display: flex; flex-direction: column; gap: 12px; }
        .sidebar-card {
          background: #161b22; border: 1px solid #21262d;
          border-radius: 10px; padding: 16px;
        }
        .sidebar-title { font-size: 12px; font-weight: 700; color: white; margin-bottom: 12px; }
        .sidebar-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 12px; color: #7d8590;
        }
        .sidebar-item:last-child { border-bottom: none; padding-bottom: 0; }
        .sidebar-item-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr; }
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .hero { padding: 40px 20px 24px; }
          .content { padding: 0 20px 60px; }
          .nav { padding: 12px 20px; }
          .nav-steps { display: none; }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚀</div>
            <span className="nav-logo-text">Grants Platform</span>
          </div>
          <div className="nav-steps">
            <div className="nav-step active">1 · Upload</div>
            <div className="nav-step">2 · Grants</div>
            <div className="nav-step">3 · Adaptation</div>
            <div className="nav-step">4 · Soumission</div>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-badge">
            <div className="hero-badge-dot"></div>
            Étape 1 sur 4
          </div>
          <h1>Analyse ton <span>Pitch Deck</span></h1>
          <p>Upload ton PDF ou PPTX — notre IA extrait automatiquement toutes les données clés de ton startup en quelques secondes.</p>
        </div>

        {/* CONTENT */}
        <div className="content">
          <div className="layout">
            {/* MAIN */}
            <div>
              {/* IDLE */}
              {(status === "idle") && (
                <div {...getRootProps()} className={`dropzone-wrap ${isDragActive ? "active" : ""}`}>
                  <input {...getInputProps()} />
                  <div className="dropzone-icon">📄</div>
                  <div className="dropzone-title">
                    {isDragActive ? "Dépose le fichier ici..." : "Glisse ton pitch deck ici"}
                  </div>
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
                  <div {...getRootProps()} className="dropzone-wrap" style={{marginBottom: '16px'}}>
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
                    <div className="error-icon">⚠️</div>
                    <div>
                      <div className="error-title">Erreur d'extraction</div>
                      <div className="error-msg">{error.substring(0, 200)}{error.length > 200 ? '...' : ''}</div>
                    </div>
                  </div>
                </>
              )}

              {/* PROCESSING */}
              {(status === "uploading" || status === "processing") && (
                <div className="processing-card">
                  <div className="spinner"></div>
                  <div className="processing-title">
                    {status === "uploading" ? "Upload en cours..." : "🧠 Analyse par l'IA en cours..."}
                  </div>
                  <div className="processing-sub">{filename}</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{width: `${progress}%`}}></div>
                  </div>
                  {status === "processing" && (
                    <div className="processing-steps">
                      <div className="step-item">
                        <div className="step-dot done"></div>
                        <div className="step-label">Extraction texte</div>
                      </div>
                      <div className="step-item">
                        <div className="step-dot"></div>
                        <div className="step-label">Analyse LLM</div>
                      </div>
                      <div className="step-item">
                        <div className="step-dot wait"></div>
                        <div className="step-label">Structuration</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RESULTS */}
              {status === "done" && result && (
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
                      {label: "🏭 Industrie", value: result.industry},
                      {label: "📈 Stade", value: result.stage},
                      {label: "🌍 Pays", value: result.country},
                      {label: "💰 Funding", value: result.funding_needed || "Non précisé"},
                    ].map(({label, value}) => (
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
                      {result.keywords.map((k) => (
                        <span className="keyword" key={k}>{k}</span>
                      ))}
                    </div>
                  </div>

                  <button className="cta-btn">
                    🔍 Lancer la Recherche de Grants →
                  </button>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="sidebar">
              <div className="sidebar-card">
                <div className="sidebar-title">🤖 Comment ça marche ?</div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">1️⃣</div>
                  <div>Upload ton pitch deck PDF ou PPTX</div>
                </div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">2️⃣</div>
                  <div>Le LLM extrait automatiquement tes données business</div>
                </div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">3️⃣</div>
                  <div>L'agent cherche les grants adaptés à ton profil</div>
                </div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">4️⃣</div>
                  <div>Soumission autonome sur les portails</div>
                </div>
              </div>

              <div className="sidebar-card">
                <div className="sidebar-title">✅ Formats supportés</div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">📄</div>
                  <div>PDF — pitch deck, présentation</div>
                </div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">📊</div>
                  <div>PPTX — PowerPoint</div>
                </div>
                <div className="sidebar-item">
                  <div className="sidebar-item-icon">⚖️</div>
                  <div>Max 20MB par fichier</div>
                </div>
              </div>

              <div className="sidebar-card" style={{borderColor: 'rgba(35,134,54,0.3)', background: 'rgba(35,134,54,0.03)'}}>
                <div className="sidebar-title" style={{color: '#3fb950'}}>🔒 Confidentialité</div>
                <div style={{fontSize: '12px', color: '#7d8590', lineHeight: '1.6'}}>
                  Tes données ne sont jamais partagées. Le fichier est traité localement et supprimé après extraction.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}