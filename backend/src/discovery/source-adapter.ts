export type OpportunityMode = "remote" | "hybrid" | "onsite" | "unknown";

export interface DiscoveryQuery {
  rawQuery: string;
  keywords: string[];
  expandedKeywords: string[];
  location?: string | null;
  mode?: OpportunityMode | null;
  minimumStipend?: number | null;
  currency?: string | null;
  internshipOnly?: boolean;
}

export interface NormalizedStipend {
  min: number | null;
  max: number | null;
  currency: string | null;
  display: string;
}

export interface NormalizedInternship {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  mode: OpportunityMode;
  stipend: NormalizedStipend;
  duration: string | null;
  skills: string[];
  experience: string | null;
  eligibility: string | null;
  deadline: string | null;
  postedDate: string | null;
  source: string;
  sourceUrl: string;
  applicationUrl: string;
  organizationUrl: string | null;
  tags: string[];
  verified: boolean;
  discoveredAt: string;
  matchScore?: number;
  matchReasons?: string[];
  warningReasons?: string[];
}

export type SourceStatusType = 
  | "success"
  | "no_results"
  | "timeout"
  | "blocked"
  | "login_required"
  | "captcha_required"
  | "rate_limited"
  | "parse_error"
  | "network_error"
  | "disabled";

export interface SourceResult {
  sourceId: string;
  sourceName: string;
  status: SourceStatusType;
  results: NormalizedInternship[];
  count: number;
  durationMs: number;
  error?: string | null;
}

export interface InternshipSourceAdapter {
  id: string;
  name: string;
  category: "student_portal" | "job_aggregator" | "direct_ats" | "public_feed";
  enabled: boolean;
  priority: number; // Lower is higher priority (1 to 10)
  
  search(query: DiscoveryQuery, timeoutMs?: number): Promise<SourceResult>;
  isAvailable(): Promise<boolean>;
}
