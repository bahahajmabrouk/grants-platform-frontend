export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface EvaluationCriteria {
  name: string;
  score: number;
  feedback: string;
}

export interface EvaluationResponse {
  pitch_id: string;
  conversation_id: string;
  overall_score: number;
  criteria_scores: {
    [key: string]: EvaluationCriteria;
  };
  summary: string;
  recommendations: string[];
}

export interface ChatResponse {
  conversation_id: string;
  pitch_id: string;
  user_message: string;
  assistant_response: string;
  message_count: number;
  timestamp: string;
}

export interface ConversationHistory {
  conversation_id: string;
  pitch_id: string;
  user_id: number;
  messages: ChatMessage[];
  message_count: number;
  evaluation_data?: EvaluationResponse;
  feedback?: object;
  created_at: string;
  updated_at: string;
}
