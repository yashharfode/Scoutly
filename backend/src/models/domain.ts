export const opportunityTypes = ["internship", "hackathon", "workshop", "event", "competition", "fellowship", "scholarship"] as const;
export type OpportunityType = (typeof opportunityTypes)[number];
export type OpportunityMode = "remote" | "hybrid" | "in_person";

export interface Opportunity {
  id: string; title: string; organization: string; type: OpportunityType;
  description?: string; location?: string; mode?: OpportunityMode; stipend?: number;
  currency?: string; skills: string[]; eligibility?: string; deadline?: string;
  applicationUrl: string; source: string; sourceUrl: string; extractedAt: string;
  tags: string[]; rawData?: Record<string, unknown>; matchScore?: number;
}

export interface StudentProfile {
  name: string; college: string; degree: string; branch: string; year: string;
  location: string; skills: string[]; projects: Array<{ name: string; description: string; technologies: string[] }>;
  experience: Array<{ organization: string; title: string; description: string; period: string }>;
  preferredDomains: string[]; preferredLocations: string[]; preferredMode: OpportunityMode[];
  minimumStipend: number; resumePath: string; github: string; linkedin: string;
  portfolio: string; email: string; phone: string;
}

export interface Application { id: string; opportunityId: string; status: "discovered" | "saved" | "preparing" | "ready_for_review" | "submitted" | "rejected" | "interview" | "selected"; appliedAt?: string; notes: string; answers: Record<string, string>; }
export interface SearchIntent { opportunityType: OpportunityType; keywords: string[]; skills: string[]; location: string | null; mode: OpportunityMode | null; minimumStipend: number | null; currency: string | null; deadline: string | null; organization: string | null; experienceLevel: string | null; }

export type ApplicationSessionState = 
  | "preparing"
  | "opened"
  | "analyzing"
  | "waiting_for_login"
  | "waiting_for_captcha"
  | "mapping"
  | "filling"
  | "ready_for_review"
  | "submitting"
  | "verifying"
  | "submitted"
  | "submitted_unverified"
  | "failed"
  | "cancelled";

export interface ApplicationSession {
  sessionId: string;
  opportunityId: string;
  status: ApplicationSessionState;
  url: string;
  fields: any[];
  mappings: any[];
  answers: any[];
  warnings: string[];
  completion: number;
  applicationId?: string;
  errorMessage?: string;
}
