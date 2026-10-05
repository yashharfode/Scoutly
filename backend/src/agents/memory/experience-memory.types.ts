export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";

export interface FormFingerprint {
  domain: string;
  pathPattern: string;
  titlePattern: string;
  fieldSignature: string; // Compact signature of sorted field tags/types/names
  buttonSignature: string;
}

export interface WorkflowStep {
  step: string;
  action: string;
  confidence: number;
}

export interface FieldExperience {
  semanticType: string;
  observedLabel: string;
  observedName: string;
  observedPlaceholder: string;
  inputType: string;
  mapping: string; // e.g., "profile.email", "profile.resumePath"
  strategy: "direct_fill" | "file_upload" | "ai_synthesis" | "checkbox_agree" | "select_option" | "user_prompt";
  confidence: number;
  verified: boolean;
  successCount: number;
  failureCount: number;
  lastVerifiedAt?: string;
}

export interface QuestionExperience {
  pattern: string;
  category: "motivation" | "experience" | "technical" | "challenge" | "availability";
  answeringStrategy: string;
  profileFactsUsed: string[];
  tone: string;
  confidence: number;
  verified: boolean;
  successCount: number;
}

export interface NegativeExperience {
  pattern: string; // e.g. "button#nav-apply", "input#search-box"
  domain: string;
  context: string;
  failureReason: string;
  replacementStrategy: string;
  failureCount: number;
  confidence: number;
}

export interface PlaybookStats {
  successfulRuns: number;
  failedRuns: number;
  verifiedRuns: number;
  successRate: number;
  lastVerifiedAt: string | null;
}

export interface WebsitePlaybook {
  id: string;
  scope: "website" | "ats" | "global";
  domain: string;
  applicationType: "internship";
  version: number;
  fingerprint: FormFingerprint;
  workflow: WorkflowStep[];
  fieldMappings: FieldExperience[];
  questionPatterns: QuestionExperience[];
  negativeMemory: NegativeExperience[];
  successSignals: string[];
  stats: PlaybookStats;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  lastUpdated: string;
}

export interface ActionTraceStep {
  step: string;
  tool: string;
  status: "success" | "warning" | "error" | "info";
  summary: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ApplicationRunTrace {
  runId: string;
  timestamp: string;
  goal: string;
  opportunity: {
    id: string;
    title: string;
    organization: string;
    url: string;
  };
  plan: string[];
  actions: ActionTraceStep[];
  memoryMatch: {
    matched: boolean;
    playbookId?: string;
    domain?: string;
    version?: number;
    confidence: number;
    reusedFieldsCount: number;
    adaptedFieldsCount: number;
  };
  result: "success" | "partial" | "failed";
  verification: {
    verified: boolean;
    confirmationId?: string;
    notes?: string;
  };
}

export interface MemorySummary {
  totalPlaybooks: number;
  totalVerifiedRuns: number;
  totalFieldMappings: number;
  totalQuestionPatterns: number;
  negativePatternsAvoided: number;
  averageConfidence: number;
  playbooks: {
    id: string;
    domain: string;
    version: number;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    verifiedRuns: number;
    fieldCount: number;
    lastVerifiedAt: string | null;
  }[];
}
