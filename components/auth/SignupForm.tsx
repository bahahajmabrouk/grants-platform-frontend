"use client";

import { useState } from "react";
import { register } from "@/lib/api";
import { saveTokens, saveUser, isValidEmail, validatePassword } from "@/lib/auth";
import { useRouter } from "next/navigation";

type SignupFormProps = {
  onSuccess?: () => void;
};

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    company_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validation du password en temps réel
    if (name === "password") {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Tous les champs requis");
      return;
    }

    if (!formData.first_name || !formData.last_name) {
      setError("Prénom et nom requis");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Format email invalide");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les passwords ne correspondent pas");
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError("Password ne respecte pas les critères");
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name || undefined,
      });

      // Sauvegarder les tokens et utilisateur
      saveTokens(response.access_token, response.refresh_token);
      saveUser(response.user);

      // Redirection
      router.push("/login");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
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

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-row .form-group {
          margin-bottom: 0;
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

        .password-hints {
          background: rgba(35, 134, 54, 0.05);
          border: 1px solid rgba(35, 134, 54, 0.2);
          border-radius: 6px;
          padding: 12px;
          font-size: 12px;
        }

        .password-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          color: #7d8590;
        }

        .password-hint:last-child {
          margin-bottom: 0;
        }

        .password-hint.done {
          color: #3fb950;
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

        .login-link {
          text-align: center;
          margin-top: 16px;
          font-size: 13px;
          color: #7d8590;
        }

        .login-link a {
          color: #58a6ff;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }

        .login-link a:hover {
          color: #79c0ff;
        }
      `}</style>

      {error && (
        <div className="form-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">👤 Prénom</label>
          <input
            type="text"
            name="first_name"
            className="form-input"
            placeholder="John"
            value={formData.first_name}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label className="form-label">👤 Nom</label>
          <input
            type="text"
            name="last_name"
            className="form-input"
            placeholder="Doe"
            value={formData.last_name}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">📧 Email</label>
        <input
          type="email"
          name="email"
          className="form-input"
          placeholder="startup@example.com"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">🏢 Entreprise (optionnel)</label>
        <input
          type="text"
          name="company_name"
          className="form-input"
          placeholder="MyStartup Inc"
          value={formData.company_name}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">🔐 Password</label>
        <div className="password-wrap">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            className="form-input"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
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
        {formData.password && (
          <div className="password-hints">
            <div className={`password-hint ${formData.password.length >= 8 ? "done" : ""}`}>
              {formData.password.length >= 8 ? "✅" : "⏳"} Minimum 8 caractères
            </div>
            <div className={`password-hint ${/[A-Z]/.test(formData.password) ? "done" : ""}`}>
              {/[A-Z]/.test(formData.password) ? "✅" : "⏳"} Au minimum 1 majuscule
            </div>
            <div className={`password-hint ${/[0-9]/.test(formData.password) ? "done" : ""}`}>
              {/[0-9]/.test(formData.password) ? "✅" : "⏳"} Au minimum 1 chiffre
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">🔐 Confirmer Password</label>
        <input
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          className="form-input"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={loading}
      >
        {loading ? "Inscription en cours..." : "Créer un compte"}
      </button>

      <div className="login-link">
        Vous avez déjà un compte ? <a href="/login">Se connecter</a>
      </div>
    </form>
  );
}