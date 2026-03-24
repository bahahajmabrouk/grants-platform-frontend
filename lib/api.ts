import axios from "axios";
import process from "node:process";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// ── Pitch Deck ────────────────────────────────────────────────────────────────

export async function uploadPitchDeck(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/pitch/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getPitchStatus(pitchId: string) {
  const res = await api.get(`/pitch/${pitchId}`);
  return res.data;
}

export async function listPitches() {
  const res = await api.get("/pitch/");
  return res.data;
}

// ── Grants ────────────────────────────────────────────────────────────────────

export async function searchGrants(pitchId: string) {
  const res = await api.post("/grants/search", { pitch_id: pitchId });
  return res.data;
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function launchSubmission(pitchId: string, grantId: string) {
  const res = await api.post("/submissions/", {
    pitch_id: pitchId,
    grant_id: grantId,
  });
  return res.data;
}
