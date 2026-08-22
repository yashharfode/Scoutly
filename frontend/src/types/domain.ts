export type Page = "Discover" | "Matches" | "Saved" | "Applications" | "My Profile" | "Settings";
export interface StudentProfile { name: string; college: string; degree: string; branch: string; year: string; location: string; skills: string[]; projects: { name: string; description: string; technologies: string[] }[]; experience: { organization: string; title: string; description: string; period: string }[]; preferredDomains: string[]; preferredLocations: string[]; preferredMode: string[]; minimumStipend: number; resumePath: string; github: string; linkedin: string; portfolio: string; email: string; phone: string; }
export interface Opportunity { id: string; title: string; organization: string; type: "internship"; description?: string; location?: string; mode?: string; stipend?: number; currency?: string; skills: string[]; deadline?: string; applicationUrl: string; source: string; sourceUrl: string; extractedAt: string; tags: string[]; matchScore?: number; rawData?: { matchReasons?: string[] }; }
export interface SearchResponse { status: string; aiStatus: string; stats: { raw: number; duplicatesRemoved: number; matched: number }; results: Opportunity[]; }

export interface FormField {
  id: string;
  type: string;
  tag: string;
  name: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  required: boolean;
  options?: string[];
  currentValue?: string;
  selector?: string;
}

export interface FieldMapping {
  fieldId: string;
  value: string;
  source: string;
  confidence: number;
  status: "safe" | "review" | "unknown" | "blocked";
  aiGenerated?: boolean;
}

export interface ValidationResult {
  ready: boolean;
  completion: number;
  safeFields: number;
  reviewFields: number;
  missingFields: number;
  missingRequired: string[];
}

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
  fields: FormField[];
  mappings: FieldMapping[];
  completion: number;
  validation?: ValidationResult;
  warnings?: string[];
  hasCaptcha?: boolean;
  isLogin?: boolean;
  screenshotPath?: string;
  opportunity?: Opportunity;
  applicationId?: string;
  errorMessage?: string;
}

export interface ApplicationRecord {
  id: string;
  opportunityId: string;
  status: string;
  notes: string;
  appliedAt?: string;
  answers: Record<string, string>;
}
