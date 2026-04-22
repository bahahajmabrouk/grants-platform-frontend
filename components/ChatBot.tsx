"use client";

import { useState, useEffect, useRef } from "react";
import {
  evaluatePitch,
  sendChatMessage,
  getConversationHistory,
} from "@/lib/api";
import {
  EvaluationResponse,
  ChatMessage,
  ConversationHistory,
} from "@/types/chatbot";

interface ChatBotProps {
  pitchId: string;
  userId: number;
  startupName: string;
  onClose?: () => void;
}

export default function ChatBot({
  pitchId,
  userId,
  startupName,
  onClose,
}: ChatBotProps) {
  const [status, setStatus] = useState<
    "idle" | "evaluating" | "ready" | "chatting" | "error"
  >("idle");
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChatBot = async () => {
    setStatus("evaluating");
    setError("");
    setMessages([]);
    try {
      console.log("🤖 Démarrage évaluation pour pitch:", pitchId, "user:", userId);
      const evaluationData = await evaluatePitch(pitchId, userId);
      console.log("✅ Évaluation reçue:", evaluationData);

      setEvaluation(evaluationData);
      setConversationId(evaluationData.conversation_id);

      // Add initial AI message with evaluation summary
      const initialMessage: ChatMessage = {
        role: "assistant",
        content: `Bonjour! J'ai analysé ton pitch pour **${startupName}**. 

**Score Overall: ${evaluationData.overall_score}/100**

${evaluationData.summary}

**Recommandations:**
${evaluationData.recommendations.map((rec) => `• ${rec}`).join("\n")}

Pose-moi des questions pour approfondir certains aspects de ton pitch! 🚀`,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialMessage]);
      setStatus("ready");
    } catch (err: any) {
      console.error("❌ Erreur évaluation:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Erreur lors de l'évaluation";
      setError(errorMsg);
      setStatus("error");
    }
  };

  // Initialize chatbot by evaluating pitch
  useEffect(() => {
    initializeChatBot();
  }, [pitchId, userId, startupName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !conversationId) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setStatus("chatting");

    // Add user message immediately
    const userMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await sendChatMessage(
        pitchId,
        userId,
        userMessage,
        conversationId
      );

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.assistant_response,
        timestamp: response.timestamp,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStatus("ready");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <style>{`
      .chatbot-container {
        background: #161b22;
        border: 1px solid #21262d;
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 800px;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .chatbot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #21262d;
        background: rgba(22, 27, 34, 0.8);
        backdrop-filter: blur(8px);
        flex-shrink: 0;
      }

      .chatbot-header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        font-weight: 700;
        color: white;
      }

      .chatbot-header-icon {
        font-size: 18px;
      }

      .chatbot-close-btn {
        background: transparent;
        border: none;
        color: #7d8590;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
      }

      .chatbot-close-btn:hover {
        color: #e6edf3;
      }

      /* EVALUATION DISPLAY */
      .evaluation-section {
        padding: 20px;
        border-bottom: 1px solid #21262d;
        background: rgba(35, 134, 54, 0.03);
        flex-shrink: 0;
        overflow-y: auto;
        max-height: 300px;
      }

      .evaluation-title {
        font-size: 14px;
        font-weight: 700;
        color: white;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .score-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: rgba(63, 185, 80, 0.15);
        border: 1px solid rgba(63, 185, 80, 0.3);
        font-size: 20px;
        font-weight: 700;
        color: #3fb950;
      }

      .criteria-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .criteria-item {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }

      .criteria-name {
        font-size: 11px;
        font-weight: 600;
        color: #7d8590;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .criteria-score {
        font-size: 20px;
        font-weight: 700;
        color: #3fb950;
      }

      .summary-text {
        font-size: 12px;
        color: #adbac7;
        line-height: 1.6;
        margin-bottom: 8px;
      }

      .recommendations-list {
        font-size: 11px;
        color: #7d8590;
        line-height: 1.6;
        padding-left: 4px;
      }

      /* CHAT MESSAGES */
      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #0d1117;
      }

      .messages-container::-webkit-scrollbar {
        width: 6px;
      }

      .messages-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .messages-container::-webkit-scrollbar-thumb {
        background: #30363d;
        border-radius: 3px;
      }

      .messages-container::-webkit-scrollbar-thumb:hover {
        background: #3fb950;
      }

      .message {
        display: flex;
        gap: 10px;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .message.user {
        justify-content: flex-end;
      }

      .message-content {
        max-width: 75%;
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 13px;
        line-height: 1.5;
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      .message.assistant .message-content {
        background: #161b22;
        border: 1px solid #30363d;
        color: #adbac7;
      }

      .message.user .message-content {
        background: #238636;
        color: white;
        border: 1px solid #2ea043;
      }

      .message-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .message.assistant .message-avatar {
        background: rgba(63, 185, 80, 0.15);
        border: 1px solid rgba(63, 185, 80, 0.3);
        color: #3fb950;
      }

      .message.user .message-avatar {
        background: rgba(88, 166, 255, 0.15);
        border: 1px solid rgba(88, 166, 255, 0.3);
        color: #58a6ff;
      }

      /* LOADING & ERROR */
      .loading-message {
        display: flex;
        gap: 6px;
        align-items: center;
        color: #7d8590;
        font-size: 12px;
      }

      .loading-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3fb950;
        animation: bounce 1.4s infinite;
      }

      .loading-dot:nth-child(1) {
        animation-delay: 0s;
      }
      .loading-dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      .loading-dot:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes bounce {
        0%,
        60%,
        100% {
          transform: translateY(0);
          opacity: 1;
        }
        30% {
          transform: translateY(-8px);
          opacity: 0.5;
        }
      }

      .error-message {
        padding: 12px;
        background: rgba(248, 81, 73, 0.1);
        border: 1px solid rgba(248, 81, 73, 0.3);
        border-radius: 8px;
        font-size: 12px;
        color: #f85149;
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }

      .error-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      /* INPUT AREA */
      .input-container {
        padding: 12px 16px;
        border-top: 1px solid #21262d;
        background: #161b22;
        flex-shrink: 0;
        display: flex;
        gap: 8px;
      }

      .chat-input-form {
        display: flex;
        gap: 8px;
        width: 100%;
      }

      .chat-input {
        flex: 1;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 13px;
        color: white;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      .chat-input:focus {
        outline: none;
        border-color: #3fb950;
        box-shadow: 0 0 0 3px rgba(63, 185, 80, 0.1);
      }

      .chat-input::placeholder {
        color: #7d8590;
      }

      .send-btn {
        background: #238636;
        border: 1px solid #2ea043;
        color: white;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s;
        flex-shrink: 0;
      }

      .send-btn:hover:not(:disabled) {
        background: #2ea043;
      }

      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* LOADING STATE */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        gap: 16px;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #21262d;
        border-top-color: #3fb950;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        font-size: 13px;
        color: #7d8590;
        text-align: center;
      }

      /* ERROR STATE */
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justifyContent: center;
        padding: 48px 20px;
        gap: 16px;
        text-align: center;
      }

      .error-title {
        font-size: 14px;
        font-weight: 700;
        color: #f85149;
      }

      .error-description {
        font-size: 12px;
        color: #7d8590;
        margin-bottom: 16px;
      }

      .retry-btn {
        background: transparent;
        border: 1px solid #30363d;
        color: #7d8590;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .retry-btn:hover {
        border-color: #7d8590;
        color: #e6edf3;
      }

      @media (max-width: 768px) {
        .chatbot-container {
          max-height: 600px;
        }

        .message-content {
          max-width: 90%;
        }

        .criteria-grid {
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        }
      }
    `}

      <div className="chatbot-container">
        {/* HEADER */}
        <div className="chatbot-header">
          <div className="chatbot-header-title">
            <span className="chatbot-header-icon">🤖</span>
            <span>Chatbot d'Évaluation</span>
          </div>
          {onClose && (
            <button className="chatbot-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* STATUS SPECIFIC CONTENT */}
        {(status === "idle" || status === "evaluating") && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Analyse de ton pitch en cours...</div>
          </div>
        )}

        {status === "error" && (
          <div className="error-container">
            <div className="error-title">⚠️ Erreur d'évaluation</div>
            <div className="error-description">
              {error}
              <br />
              <br />
              <strong>Conseil:</strong>
              <ul style={{ marginTop: "8px", paddingLeft: "20px", fontSize: "11px", color: "#7d8590" }}>
                <li>Vérifiez que le backend est connecté à Ollama</li>
                <li>Assurez-vous que Ollama est lancé: <code style={{ background: "#0d1117", padding: "2px 6px", borderRadius: "3px" }}>ollama serve</code></li>
                <li>Vérifiez les logs du backend pour plus de détails</li>
              </ul>
            </div>
            <button
              className="retry-btn"
              onClick={() => {
                initializeChatBot();
              }}
            >
              🔄 Réessayer
            </button>
          </div>
        )}

        {status !== "idle" &&
          status !== "evaluating" &&
          status !== "error" &&
          evaluation && (
            <>
              {/* EVALUATION SECTION */}
              <div className="evaluation-section">
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "16px",
                    alignItems: "center",
                  }}
                >
                  <div className="evaluation-title" style={{ margin: 0 }}>
                    ✅ Évaluation
                  </div>
                  <div className="score-badge">
                    {evaluation.overall_score}
                  </div>
                </div>

                <div className="criteria-grid">
                  {Object.entries(evaluation.criteria_scores).map(
                    ([key, criteria]) => (
                      <div className="criteria-item" key={key}>
                        <div className="criteria-name">{criteria.name}</div>
                        <div className="criteria-score">{criteria.score}</div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* MESSAGES */}
              <div className="messages-container">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="message-avatar">🤖</div>
                    )}
                    <div className="message-content">
                      {msg.content
                        .split("\n")
                        .map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                    </div>
                    {msg.role === "user" && (
                      <div className="message-avatar">👤</div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div className="message-avatar">🤖</div>
                    <div className="loading-message">
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                      <div className="loading-dot"></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    <div className="error-icon">⚠️</div>
                    <div>{error}</div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div className="input-container">
                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Pose une question sur ton pitch..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={!inputValue.trim() || isLoading}
                  >
                    📤
                  </button>
                </form>
              </div>
            </>
          )}
      </div>
    </style>
  );
}
