import { BrowserAgent, FormField, PageInspectionResult, BrowserActionResult, SubmissionVerificationResult } from "./browser-types.js";

export class MockBrowserAgent implements BrowserAgent {
  private currentUrl = "";
  private isClosed = false;

  async open(url: string): Promise<BrowserActionResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Opening URL: ${url}`);
    this.currentUrl = url;
    await this.delay(200);
    return { success: true };
  }

  async inspectPage(): Promise<PageInspectionResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Inspecting page at ${this.currentUrl}`);
    await this.delay(200);
    const fields = await this.detectForms();
    return {
      hasCaptcha: false,
      isLogin: false,
      fields,
      pageTitle: "Cybersecurity Analyst Intern — Application",
      currentUrl: this.currentUrl,
      screenshotPath: ""
    };
  }

  async detectForms(): Promise<FormField[]> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Detecting forms on ${this.currentUrl}`);
    await this.delay(100);
    return [
      { id: "fullName", tag: "input", type: "text", name: "fullName", labelText: "Full Name", required: true, selector: "#fullName" },
      { id: "email", tag: "input", type: "email", name: "email", labelText: "Email Address", required: true, selector: "#email" },
      { id: "phone", tag: "input", type: "tel", name: "phone", labelText: "Phone Number", required: true, selector: "#phone" },
      { id: "college", tag: "input", type: "text", name: "college", labelText: "College / University", required: true, selector: "#college" },
      { id: "github", tag: "input", type: "url", name: "github", labelText: "GitHub Profile", required: false, selector: "#github" },
      { id: "linkedin", tag: "input", type: "url", name: "linkedin", labelText: "LinkedIn Profile", required: false, selector: "#linkedin" },
      { id: "resume", tag: "input", type: "file", name: "resume", labelText: "Upload Resume", required: true, selector: "#resume" },
      { id: "interest", tag: "textarea", type: "textarea", name: "interest", labelText: "Why are you interested in this internship?", required: true, selector: "#interest" },
      { id: "stipend", tag: "input", type: "text", name: "stipend", labelText: "Expected Monthly Stipend", required: true, selector: "#stipend" }
    ];
  }

  async fillField(selector: string, value: string): Promise<BrowserActionResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Filling ${selector} = ${value.slice(0, 30)}...`);
    await this.delay(50);
    return { success: true };
  }

  async uploadFile(selector: string, filePath: string): Promise<BrowserActionResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Uploading file ${filePath} to ${selector}`);
    await this.delay(50);
    return { success: true };
  }

  async click(selector: string): Promise<BrowserActionResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Clicking ${selector}`);
    await this.delay(50);
    return { success: true };
  }

  async submitAndVerify(): Promise<SubmissionVerificationResult> {
    this.ensureNotClosed();
    console.log(`[MockBrowser] Submitting and verifying application on mock page...`);
    await this.delay(300);
    const mockAppId = "SCOUTLY-MOCK" + Math.floor(1000 + Math.random() * 9000);
    return {
      verified: true,
      applicationId: mockAppId,
      confirmationMessage: "Application submitted successfully! Application ID: " + mockAppId,
      finalUrl: this.currentUrl
    };
  }

  async takeScreenshot(filename: string): Promise<string> {
    this.ensureNotClosed();
    return `mock-screenshot-${filename}.png`;
  }

  async getCurrentUrl(): Promise<string> {
    this.ensureNotClosed();
    return this.currentUrl;
  }

  async getPageTitle(): Promise<string> {
    this.ensureNotClosed();
    return "Mock Internship Application";
  }

  async close(): Promise<void> {
    this.isClosed = true;
    console.log("[MockBrowser] Browser closed");
  }

  private ensureNotClosed() {
    if (this.isClosed) throw new Error("MockBrowser is closed.");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
