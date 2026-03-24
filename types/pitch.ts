export interface PitchExtractedData {
  startup_name: string;
  industry: string;
  stage: string;
  country: string;
  problem: string;
  solution: string;
  market_size: string;
  business_model: string;
  team: string;
  traction?: string;
  funding_needed?: string;
  keywords: string[];
}

export interface PitchUploadResponse {
  pitch_id: string;
  filename: string;
  status: "processing" | "completed" | "failed";
  extracted_data?: PitchExtractedData;
  message: string;
}
