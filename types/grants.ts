export type GrantIndustry = "Tech" | "Biotech" | "FinTech" | "CleanTech" | "HealthTech" | "AgriTech" | "General";
export type GrantStage = "Seed" | "Series A" | "Series B" | "Growth" | "Late Stage" | "Scale";

export interface Grant {
  id: string;
  name: string;
  icon: string;
  amount: number;
  currency: string;
  deadline: number; // days remaining
  matchPercentage: number;
  industry: GrantIndustry;
  stage: GrantStage;
  description: string;
  organization: string;
  country: string;
}

export interface GrantFilters {
  industry: GrantIndustry | "All";
  amountRange: {
    min: number;
    max: number;
  };
  deadline: "30" | "60" | "90" | "Any";
  search: string;
}

export interface SelectedGrants {
  [key: string]: boolean;
}
