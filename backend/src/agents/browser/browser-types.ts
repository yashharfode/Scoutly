export interface FormField {
  id: string;
  type: string;
  tag: string;
  name: string;
  placeholder?: string;
  ariaLabel?: string;
  labelText?: string;
  nearbyText?: string;
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

export interface PageInspectionResult {
  hasCaptcha: boolean;
  isLogin: boolean;
  fields: FormField[];
  pageTitle: string;
  currentUrl: string;
  screenshotPath?: string;
}

export interface BrowserActionResult {
  success: boolean;
  error?: string;
}

export interface SubmissionVerificationResult {
  verified: boolean;
  applicationId?: string;
  confirmationMessage?: string;
  finalUrl?: string;
  error?: string;
}

export interface BrowserAgent {
  open(url: string): Promise<BrowserActionResult>;
  inspectPage(): Promise<PageInspectionResult>;
  detectForms(): Promise<FormField[]>;
  fillField(selector: string, value: string): Promise<BrowserActionResult>;
  uploadFile(selector: string, filePath: string): Promise<BrowserActionResult>;
  click(selector: string): Promise<BrowserActionResult>;
  submitAndVerify(): Promise<SubmissionVerificationResult>;
  takeScreenshot(filename: string): Promise<string>;
  getCurrentUrl(): Promise<string>;
  getPageTitle(): Promise<string>;
  close(): Promise<void>;
}
