"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import { saveTokens, saveUser, isValidEmail } from "@/lib/auth";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  onSuccess?: () => void;
};

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password) {
      setError("Email et password requis");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Format email invalide");
      return;
    }

    setLoading(true);

    try {
      const response = await login({ email, password });

      // Sauvegarder les tokens et utilisateur
      saveTokens(response.access_token, response.refresh_token);
      saveUser(response.user);

      // Redirection
      router.push("/dashboard");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <style>{`
        .auth-form {
          max-width: 420px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #e6edf3;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 12px 14px;
          color: #e6edf3;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.15s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3fb950;
          box-shadow: 0 0 0 3px rgba(63, 185, 80, 0.1);
          background: #161b22;
        }

        .form-input::placeholder {
          color: #7d8590;
        }

        .password-wrap {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #7d8590;
          cursor: pointer;
          font-size: 16px;
          transition: color 0.15s;
          padding: 4px;
        }

        .password-toggle:hover {
          color: #adbac7;
        }

        .form-error {
          background: rgba(248, 81, 73, 0.05);
          border: 1px solid rgba(248, 81, 73, 0.3);
          color: #f85149;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .submit-btn {
          width: 100%;
          background: #238636;
          border: 1px solid #2ea043;
          color: white;
          font-size: 14px;
          font-weight: 700;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 20px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2ea043;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .signup-link {
          text-align: center;
          margin-top: 16px;
          font-size: 13px;
          color: #7d8590;
        }

        .signup-link a {
          color: #58a6ff;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }

        .signup-link a:hover {
          color: #79c0ff;
        }
      `}</style>

      {error && (
        <div className="form-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">📧 Email</label>
        <input
          type="email"
          className="form-input"
          placeholder="startup@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">🔐 Password</label>
        <div className="password-wrap">
          <input
            type={showPassword ? "text" : "password"}
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ paddingRight: "40px" }}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={loading}
      >
        {loading ? "Connexion en cours..." : "Se connecter"}
      </button>

      <div className="signup-link">
        Pas de compte ? <a href="/signup">Créer un compte</a>
      </div>
    </form>
  );
}