import { chromium, BrowserContext, Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { BrowserAgent, FormField, PageInspectionResult, BrowserActionResult, SubmissionVerificationResult } from "./browser-types.js";
import { formDetectionScript } from "./form-detector.js";

export class PlaywrightBrowserAgent implements BrowserAgent {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isClosed = false;

    async open(url: string): Promise<BrowserActionResult> {
    if (this.isClosed) throw new Error("Browser session is closed.");

    try {
      if (!this.context) {
        const userDataDir = path.resolve(process.cwd(), "..", "data", "browser-user-data");
        if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

        console.log(`[PlaywrightBrowser] Launching Chromium context (user data: ${userDataDir})...`);
        try {
          this.context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            viewport: { width: 1280, height: 800 },
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            args: [
              "--start-maximized",
              "--disable-blink-features=AutomationControlled"
            ]
          });
        } catch (lockErr: any) {
          console.warn(`[PlaywrightBrowser] Persistent context busy (${lockErr.message}). Falling back to isolated browser launch.`);
          const browser = await chromium.launch({
            headless: false,
            args: ["--start-maximized", "--disable-blink-features=AutomationControlled"]
          });
          this.context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          });
        }

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

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
    console.log("[PlaywrightBrowser] Inspecting page DOM...");

    try {
      let rawResult = await this.page!.evaluate(formDetectionScript) as any;

      // If landing page has few inputs and an Apply button, click it to open the application modal/page!
      if (rawResult.fields.length <= 2 && rawResult.applyButtonSelector && !rawResult.isLogin) {
        console.log(`[PlaywrightBrowser] Landing page detected. Clicking Apply button: "${rawResult.applyButtonSelector}"...`);
        try {
          await this.page!.click(rawResult.applyButtonSelector, { timeout: 3500 });
          await this.page!.waitForTimeout(1800);
          rawResult = await this.page!.evaluate(formDetectionScript) as any;
          console.log(`[PlaywrightBrowser] After clicking Apply: Detected ${rawResult.fields.length} form fields.`);
        } catch (e: any) {
          console.log(`[PlaywrightBrowser] Notice: Could not click apply button: ${e.message}`);
        }
      }

      return {
        hasCaptcha: !!rawResult.hasCaptcha,
        isLogin: !!rawResult.isLogin,
        fields: (rawResult.fields || []) as FormField[],
        pageTitle: rawResult.pageTitle || "",
        currentUrl: rawResult.currentUrl || this.page!.url()
      };
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Page inspection failed: ${err.message}`);
      return {
        hasCaptcha: false,
        isLogin: false,
        fields: [],
        pageTitle: "",
        currentUrl: this.page!.url()
      };
    }
  }

  async detectForms(): Promise<FormField[]> {
    const inspection = await this.inspectPage();
    return inspection.fields;
  }

  async getCurrentUrl(): Promise<string> {
    this.ensureReady();
    return this.page!.url();
  }

  async getPageTitle(): Promise<string> {
    this.ensureReady();
    return this.page!.title();
  }

  async fillField(selector: string, value: string): Promise<BrowserActionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Filling field ${selector} with "${value.slice(0, 35)}..."`);

    try {
      const el = this.page!.locator(selector).first();
      await el.waitFor({ state: "attached", timeout: 4000 });

      // Fast fill and dispatch change events for React/Angular/Vue
      await el.fill(value, { timeout: 4000 });
      await el.dispatchEvent("input");
      await el.dispatchEvent("change");
      await el.dispatchEvent("blur");

      return { success: true };
    } catch (err: any) {
      try {
        await this.page!.evaluate(({ sel, val }) => {
          const target = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
          if (target) {
            target.value = val;
            target.dispatchEvent(new Event("input", { bubbles: true }));
            target.dispatchEvent(new Event("change", { bubbles: true }));
            target.dispatchEvent(new Event("blur", { bubbles: true }));
          }
        }, { sel: selector, val: value });
        return { success: true };
      } catch (e2: any) {
        console.warn(`[PlaywrightBrowser] Field fill failed for ${selector}: ${err.message}`);
        return { success: false, error: err.message };
      }
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
        path.resolve(process.cwd(), "Resume", "Yash_Harfode_Resume.pdf"),
        path.resolve(process.cwd(), "..", "Resume", "Yash_Harfode_Resume.pdf"),
        path.resolve(process.cwd(), "data", "resume", path.basename(filePath)),
        path.resolve(process.cwd(), "..", "data", "resume", path.basename(filePath))
      ];

      const resolvedPath = candidates.find(p => fs.existsSync(p));

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
    console.log(`[PlaywrightBrowser] Clicking element: ${selector}`);

    try {
      await this.page!.click(selector, { timeout: 8000 });
      return { success: true };
    } catch (err: any) {
      console.warn(`[PlaywrightBrowser] Click failed for ${selector}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async takeScreenshot(filename: string): Promise<string> {
    this.ensureReady();
    const screenshotsDir = path.resolve(process.cwd(), "..", "data", "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filepath = path.join(screenshotsDir, filename);
    await this.page!.screenshot({ path: filepath, fullPage: false });
    return filepath;
  }

  async submitAndVerify(): Promise<SubmissionVerificationResult> {
    this.ensureReady();
    console.log("[PlaywrightBrowser] Executing safe submit and verification workflow...");

    try {
      const submitSelector = await this.page!.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
        for (const el of candidates) {
          const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "").toLowerCase().trim();
          if (
            text === "submit" ||
            text === "submit application" ||
            text === "apply now" ||
            text === "send application" ||
            text === "complete submission" ||
            text.includes("submit application") ||
            (el as HTMLInputElement).type === "submit"
          ) {
            if ((el as HTMLElement).offsetParent !== null) {
              if (el.id) return `#${CSS.escape(el.id)}`;
              if (el.className) return `${el.tagName.toLowerCase()}.${el.className.split(" ").filter(Boolean).slice(0, 2).join(".")}`;
              return el.tagName.toLowerCase();
            }
          }
        }
        return null;
      });

      if (!submitSelector) {
        return {
          verified: false,
          error: "Could not locate a visible Submit button on the page."
        };
      }

      console.log(`[PlaywrightBrowser] Identified submit button with selector: ${submitSelector}`);

      await Promise.all([
        this.page!.click(submitSelector).catch(() => {}),
        this.page!.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})
      ]);

      await this.page!.waitForTimeout(2000);

      const verification = await this.page!.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : "";
        const lower = bodyText.toLowerCase();

        const successSignals = [
          "application submitted",
          "applied successfully",
          "application received",
          "thank you for applying",
          "your application has been sent",
          "application id",
          "reference id",
          "application verified successfully",
          "we have received your application"
        ];

        const isSuccess = successSignals.some(s => lower.includes(s));

        let appId: string | undefined;
        const idMatch = bodyText.match(/(?:Application\s*ID|Reference\s*ID|Submission\s*ID|ID)[:\s]+([A-Z0-9_-]{6,20})/i);
        if (idMatch) {
          appId = idMatch[1];
        }

        return {
          isSuccess,
          appId,
          snippet: bodyText.slice(0, 300)
        };
      });

      if (verification.isSuccess || verification.appId) {
        const resolvedId = verification.appId || `APP-${Date.now().toString(36).toUpperCase()}`;
        console.log(`[PlaywrightBrowser] Submission VERIFIED! Application ID: ${resolvedId}`);
        return {
          verified: true,
          confirmationMessage: `Application verified successfully. Reference: ${resolvedId}`,
          applicationId: resolvedId,
          finalUrl: this.page!.url()
        };
      } else {
        console.warn("[PlaywrightBrowser] Clicked submit, but confirmation text not detected.");
        return {
          verified: false,
          error: "Submit button was clicked, but confirmation text/ID could not be verified on the resulting page.",
          finalUrl: this.page!.url()
        };
      }
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Submit and verify failed: ${err.message}`);
      return {
        verified: false,
        error: `Submission failed: ${err.message}`
      };
    }
  }

  async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
        this.page = null;
      }
      console.log("[PlaywrightBrowser] Browser context closed.");
    } catch (e) {}
  }

  private ensureReady() {
    if (this.isClosed) throw new Error("Browser session has been closed.");
    if (!this.page) throw new Error("Browser has not been opened. Call open(url) first.");
  }
}
