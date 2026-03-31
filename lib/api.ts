import axios from "axios";
import { LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";

// ────────────────────────────────────────────────────────
// 🌐 API CLIENT CONFIGURATION
// ────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${API_URL}/api/v1`;

// Axios instance avec interceptors
export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Ajouter le token aux requêtes
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ────────────────────────────────────────────────────────
// 🔐 AUTH ENDPOINTS
// ────────────────────────────────────────────────────────

export async function register(
  data: RegisterRequest
): Promise<AuthResponse> {
  try {
    const response = await api.post("/auth/register", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Registration failed");
  }
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await api.post("/auth/login", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Login failed");
  }
}

export async function getProfile() {
  try {
    const response = await api.get("/auth/profile");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch profile");
  }
}

export async function validateToken() {
  try {
    const response = await api.get("/auth/validate-token");
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Token validation failed"
    );
  }
}

export async function refreshToken(
  refreshToken: string
): Promise<AuthResponse> {
  try {
    const response = await api.post("/auth/refresh", { refresh_token: refreshToken });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Token refresh failed"
    );
  }
}

export async function logout() {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Logout failed");
  }
}

// ────────────────────────────────────────────────────────
// 📄 PITCH DECK ENDPOINTS
// ────────────────────────────────────────────────────────

export async function uploadPitchDeck(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post("/pitch/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Upload failed"
    );
  }
}

export async function getPitchStatus(pitchId: string) {
  try {
    const response = await api.get(`/pitch/${pitchId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to get pitch status"
    );
  }
}

export async function listPitches() {
  try {
    const response = await api.get("/pitch/");
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Failed to list pitches"
    );
  }
}

// ────────────────────────────────────────────────────────
// 💰 GRANTS ENDPOINTS
// ────────────────────────────────────────────────────────

export async function searchGrants(pitchId: string) {
  try {
    const response = await api.post("/grants/search", { pitch_id: pitchId });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Grant search failed"
    );
  }
}

// ────────────────────────────────────────────────────────
// 📋 SUBMISSIONS ENDPOINTS
// ────────────���───────────────────────────────────────────

export async function launchSubmission(pitchId: string, grantId: string) {
  try {
    const response = await api.post("/submissions/", {
      pitch_id: pitchId,
      grant_id: grantId,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || "Submission launch failed"
    );
  }
}