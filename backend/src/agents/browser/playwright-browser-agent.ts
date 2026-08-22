import { chromium, Browser, BrowserContext, Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { BrowserAgent, FormField, PageInspectionResult, BrowserActionResult, SubmissionVerificationResult } from "./browser-types.js";
import { formDetectionScript } from "./form-detector.js";

export class PlaywrightBrowserAgent implements BrowserAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isClosed = false;

  async open(url: string): Promise<BrowserActionResult> {
    if (this.isClosed) throw new Error("Browser session is closed.");

    try {
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: false,
          args: ["--start-maximized", "--disable-blink-features=AutomationControlled"]
        });
        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        });
        this.page = await this.context.newPage();

        this.page.on("dialog", async (dialog) => {
          console.log(`[PlaywrightBrowser] Auto-handling dialog: [${dialog.type()}] ${dialog.message()}`);
          await dialog.accept();
        });
      }

      console.log(`[PlaywrightBrowser] Navigating to: ${url}`);
      await this.page!.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await this.page!.waitForTimeout(1500);

      return { success: true };
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Navigation failed: ${err.message}`);
      return { success: false, error: `Navigation failed: ${err.message}` };
    }
  }

  async inspectPage(): Promise<PageInspectionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Inspecting page DOM...`);
    
    const result = await this.page!.evaluate(formDetectionScript) as {
      hasCaptcha: boolean;
      isLogin: boolean;
      fields: FormField[];
      pageTitle: string;
      currentUrl: string;
    };

    let screenshotPath = "";
    try {
      screenshotPath = await this.takeScreenshot(`inspect-${Date.now()}.png`);
    } catch (e) {
      console.warn("Could not capture inspection screenshot:", e);
    }

    return {
      hasCaptcha: result.hasCaptcha,
      isLogin: result.isLogin,
      fields: result.fields || [],
      pageTitle: result.pageTitle || (await this.page!.title()),
      currentUrl: result.currentUrl || this.page!.url(),
      screenshotPath
    };
  }

  async detectForms(): Promise<FormField[]> {
    const inspection = await this.inspectPage();
    return inspection.fields;
  }

  async fillField(selector: string, value: string): Promise<BrowserActionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Filling field ${selector} with "${value.slice(0, 35)}..."`);
    
    try {
      const el = this.page!.locator(selector).first();
      await el.waitFor({ state: "visible", timeout: 6000 });
      
      const tag = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => "input");
      if (tag === "select") {
        await el.selectOption({ label: value }).catch(async () => {
          await el.selectOption({ value: value });
        });
      } else {
        await el.click();
        await el.fill(value);
        // Ensure standard web/React controlled input state sync
        await el.evaluate((e, val) => {
          (e as HTMLInputElement).value = val;
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
        }, value).catch(() => {});
      }
      return { success: true };
    } catch (err: any) {
      console.warn(`[PlaywrightBrowser] Warning: Failed to fill field ${selector}: ${err.message}`);
      return { success: false, error: `Could not fill ${selector}: ${err.message}` };
    }
  }

    async uploadFile(selector: string, filePath: string): Promise<BrowserActionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Uploading file "${filePath}" to ${selector}`);
    
    try {
      const candidates = [
        path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath),
        path.resolve(process.cwd(), "..", filePath),
        path.resolve(process.cwd(), "Resume", path.basename(filePath)),
        path.resolve(process.cwd(), "..", "Resume", path.basename(filePath)),
        path.resolve(process.cwd(), "data", "resume", path.basename(filePath)),
        path.resolve(process.cwd(), "..", "data", "resume", path.basename(filePath)),
        path.resolve(process.cwd(), "Resume", "Yash_Harfode_Resume.pdf"),
        path.resolve(process.cwd(), "..", "Resume", "Yash_Harfode_Resume.pdf")
      ];

      let resolvedPath = candidates.find(p => fs.existsSync(p));

      if (!resolvedPath) {
        const errorMsg = `Resume file not found at candidates for: ${filePath}`;
        console.warn(`[PlaywrightBrowser] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      console.log(`[PlaywrightBrowser] Attaching resolved resume file: ${resolvedPath}`);
      const inputEl = this.page!.locator(selector).first();
      await inputEl.setInputFiles(resolvedPath, { timeout: 10000 });
      return { success: true };
    } catch (err: any) {
      console.warn(`[PlaywrightBrowser] File upload failed for ${selector}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async click(selector: string): Promise<BrowserActionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Clicking: ${selector}`);
    try {
      const el = this.page!.locator(selector).first();
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click({ timeout: 8000 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async submitAndVerify(): Promise<SubmissionVerificationResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Executing safe submit and verification workflow...`);

    try {
      // Step 1: Detect Submit Button with intelligent precedence
      const submitSelectors = [
        "#submitBtn",
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('Submit Application')",
        "button:has-text('Submit')",
        "button:has-text('Apply Now')",
        "button:has-text('Send Application')"
      ];

      let submitElement = null;
      for (const sel of submitSelectors) {
        const loc = this.page!.locator(sel).first();
        if (await loc.isVisible().catch(() => false)) {
          submitElement = loc;
          console.log(`[PlaywrightBrowser] Identified submit button with selector: ${sel}`);
          break;
        }
      }

      if (!submitElement) {
        return {
          verified: false,
          error: "Could not locate a valid submit button on the application form."
        };
      }

      // Step 2: Trigger submission
      await Promise.all([
        this.page!.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
        submitElement.click()
      ]);

      await this.page!.waitForTimeout(2000);

      // Step 3: Inspect resulting page for verified submission signals
      const pageContent = (await this.page!.content()).toLowerCase();
      const pageTitle = (await this.page!.title()).toLowerCase();
      const currentUrl = this.page!.url();

      const successKeywords = [
        "application submitted",
        "submitted successfully",
        "thank you for applying",
        "application received",
        "we have received your application",
        "submission confirmed"
      ];

      const hasSuccessText = successKeywords.some(kw => pageContent.includes(kw) || pageTitle.includes(kw));

      // Extract Application/Reference ID if present in DOM
      let applicationId = "";
      try {
        applicationId = await this.page!.evaluate(() => {
          const refEl = document.querySelector('#applicationId, .application-id, .ref-box, [data-ref-id]');
          if (refEl) return refEl.textContent?.trim() || "";
          
          const match = document.body.innerText.match(/(?:Application\s*ID|Reference|SCOUTLY-)[^\n\r<]+/i);
          return match ? match[0].trim() : "";
        });
      } catch (e) {}

      // Capture submission verification screenshot
      let screenshotPath = "";
      try {
        screenshotPath = await this.takeScreenshot(`submitted-${Date.now()}.png`);
      } catch (e) {}

      if (hasSuccessText || applicationId) {
        console.log(`[PlaywrightBrowser] Submission VERIFIED! Application ID: ${applicationId || "Confirmed"}`);
        return {
          verified: true,
          applicationId: applicationId || `SCOUTLY-${Date.now().toString().slice(-6)}`,
          confirmationMessage: `Application verified successfully. ${applicationId ? applicationId : ""}`,
          finalUrl: currentUrl
        };
      } else {
        console.warn(`[PlaywrightBrowser] Clicked submit, but confirmation text not detected.`);
        return {
          verified: false,
          finalUrl: currentUrl,
          error: "Submit button was clicked, but confirmation text/ID could not be verified on the resulting page."
        };
      }
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Submission verification error: ${err.message}`);
      return {
        verified: false,
        error: `Submission failed: ${err.message}`
      };
    }
  }

  async takeScreenshot(filename: string): Promise<string> {
    this.ensureReady();
    const dir = path.resolve(process.cwd(), "..", "data", "screenshots");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const screenshotPath = path.join(dir, filename);
    await this.page!.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    return `/data/screenshots/${filename}`;
  }

  async getCurrentUrl(): Promise<string> {
    this.ensureReady();
    return this.page!.url();
  }

  async getPageTitle(): Promise<string> {
    this.ensureReady();
    return await this.page!.title();
  }

  async close(): Promise<void> {
    this.isClosed = true;
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (e) {
      console.warn("Error closing browser:", e);
    }
    console.log("[PlaywrightBrowser] Browser closed");
  }

  private ensureReady() {
    if (this.isClosed || !this.page) {
      throw new Error("Browser is closed or page has not been initialized.");
    }
  }
}
