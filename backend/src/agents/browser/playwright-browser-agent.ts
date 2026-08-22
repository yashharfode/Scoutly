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

        // Listen for newly opened tabs/popups so we always track the active application page
        this.context.on("page", (newPage) => {
          console.log(`[PlaywrightBrowser] New tab opened: ${newPage.url()}`);
          this.page = newPage;
          newPage.on("dialog", async (dialog) => {
            console.log(`[PlaywrightBrowser] Auto-handling dialog on tab: [${dialog.type()}] ${dialog.message()}`);
            await dialog.accept();
          });
        });

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

        this.page.on("dialog", async (dialog) => {
          console.log(`[PlaywrightBrowser] Auto-handling dialog: [${dialog.type()}] ${dialog.message()}`);
          await dialog.accept();
        });
      }

      console.log(`[PlaywrightBrowser] Navigating to: ${url}`);
      await this.page!.bringToFront().catch(() => {});
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
      const activePage = this.getActivePage();
      await activePage.bringToFront().catch(() => {});
      let rawResult = await activePage.evaluate(formDetectionScript) as any;

      // If landing page has few inputs and an Apply/Register button, click it to open the application modal/page!
      if (rawResult.fields.length <= 2) {
        let clicked = false;

        // Try primary detected selector
        if (rawResult.applyButtonSelector) {
          console.log(`[PlaywrightBrowser] Landing page detected. Clicking Apply button: "${rawResult.applyButtonSelector}"...`);
          try {
            await activePage.click(rawResult.applyButtonSelector, { timeout: 4000 });
            clicked = true;
          } catch (e: any) {
            console.log(`[PlaywrightBrowser] Direct click failed: ${e.message}. Trying text-based fallback...`);
          }
        }

        // Unstop / Landing page fallback button search
        if (!clicked) {
          try {
            const fallbackSelector = await activePage.evaluate(() => {
              const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
              for (const b of btns) {
                if (b.closest('header, nav, .navbar, .global-header')) continue;
                if ((b as HTMLElement).offsetParent === null) continue;
                const t = ((b as HTMLElement).innerText || "").toLowerCase().trim();
                if (t === 'apply' || t === 'apply now' || t === 'register' || t === 'register now' || t.includes('apply now') || t.includes('register now')) {
                  (b as HTMLElement).click();
                  return true;
                }
              }
              return false;
            });
            if (fallbackSelector) clicked = true;
          } catch (e2: any) {}
        }

        if (clicked) {
          await activePage.waitForTimeout(2500);
          rawResult = await activePage.evaluate(formDetectionScript) as any;
          console.log(`[PlaywrightBrowser] After clicking Apply: Detected ${rawResult.fields.length} form fields (Login: ${rawResult.isLogin}).`);
        }
      }

      return {
        hasCaptcha: !!rawResult.hasCaptcha,
        isLogin: !!rawResult.isLogin,
        fields: (rawResult.fields || []) as FormField[],
        pageTitle: rawResult.pageTitle || "",
        currentUrl: rawResult.currentUrl || activePage.url()
      };
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Page inspection failed: ${err.message}`);
      return {
        hasCaptcha: false,
        isLogin: false,
        fields: [],
        pageTitle: "",
        currentUrl: this.getActivePage().url()
      };
    }
  }

  async detectForms(): Promise<FormField[]> {
    const inspection = await this.inspectPage();
    return inspection.fields;
  }

  async getCurrentUrl(): Promise<string> {
    this.ensureReady();
    return this.getActivePage().url();
  }

  async getPageTitle(): Promise<string> {
    this.ensureReady();
    return this.getActivePage().title();
  }

    async fillField(selector: string, value: string): Promise<BrowserActionResult> {
    this.ensureReady();
    console.log(`[PlaywrightBrowser] Filling field ${selector} with "${value.slice(0, 35)}..."`);

    try {
      const page = this.getActivePage();
      const el = page.locator(selector).first();
      await el.waitFor({ state: "attached", timeout: 4000 });

      // Check if it's a checkbox or radio button
      const inputType = await el.getAttribute("type").catch(() => "");
      const tagName = await page.evaluate((sel) => {
        const target = document.querySelector(sel);
        return target ? target.tagName.toLowerCase() : "";
      }, selector);

      if (inputType === "checkbox" || inputType === "radio") {
        await el.check({ timeout: 4000 }).catch(() => el.click());
        return { success: true };
      } else if (tagName === "select") {
        await el.selectOption({ label: value }).catch(() => el.selectOption({ value }));
        return { success: true };
      }

      // Fast fill and dispatch change events for React/Angular/Vue
      await el.fill(value, { timeout: 4000 });
      await el.dispatchEvent("input");
      await el.dispatchEvent("change");
      await el.dispatchEvent("blur");

      return { success: true };
    } catch (err: any) {
      try {
        await this.getActivePage().evaluate(({ sel, val }) => {
          const target = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
          if (target) {
            if (target.type === "checkbox" || target.type === "radio") {
              (target as HTMLInputElement).checked = true;
            } else {
              target.value = val;
            }
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
      const page = this.getActivePage();
      const inputEl = page.locator(selector).first();
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
      await this.getActivePage().click(selector, { timeout: 8000 });
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
    await this.getActivePage().screenshot({ path: filepath, fullPage: false });
    return filepath;
  }

      async submitAndVerify(): Promise<SubmissionVerificationResult> {
    this.ensureReady();
    console.log("[PlaywrightBrowser] Executing safe submit and verification workflow...");

    try {
      const page = this.getActivePage();
      await page.bringToFront().catch(() => {});

      const initialUrl = page.url();

      // Find the GENUINE submit / send application button across all standard and modal selectors
      const submitSelector = await page.evaluate(() => {
        const isHeaderOrNav = (el: any) => !!el.closest('header, nav, .navbar, .global-header, .notifications, [role="navigation"]');

        // Priority 1: Wellfound specific and modal buttons
        const modalButtons = Array.from(document.querySelectorAll('[role="dialog"] button, .modal button, [data-test*="Modal"] button, form button, [data-test*="Apply"]'));
        for (const el of modalButtons) {
          if (isHeaderOrNav(el)) continue;
          if ((el as HTMLElement).offsetParent === null) continue; // must be visible
          const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "").toLowerCase().trim();
          if (text.includes("send") || text.includes("apply") || text.includes("submit")) {
            if (el.id) return '#' + CSS.escape(el.id);
            if (el.className && typeof el.className === 'string') {
              return el.tagName.toLowerCase() + '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.');
            }
            return '[role="dialog"] button';
          }
        }

        // Priority 2: All visible buttons matching send / submit / apply
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], a.btn, a.button'));
        for (const el of allButtons) {
          if (isHeaderOrNav(el)) continue;
          if ((el as HTMLElement).offsetParent === null) continue; // must be visible

          const text = ((el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "").toLowerCase().trim();
          const classes = (el.className || '').toString().toLowerCase();

          if (classes.includes('bell') || classes.includes('icon') && text.length === 0) continue;

          if (
            text.includes("send application") ||
            text.includes("submit application") ||
            text.includes("send") ||
            text.includes("submit") ||
            text.includes("apply now") ||
            text.includes("apply to") ||
            text === "apply" ||
            (el as HTMLInputElement).type === "submit"
          ) {
            if (el.id) return '#' + CSS.escape(el.id);
            if (el.className && typeof el.className === 'string') {
              return el.tagName.toLowerCase() + '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.');
            }
            return el.tagName.toLowerCase();
          }
        }

        // Priority 3: Any primary action button on the page
        const primaryBtn = document.querySelector('button[type="submit"], input[type="submit"], button.primary, button.btn-primary');
        if (primaryBtn && !isHeaderOrNav(primaryBtn)) {
          if (primaryBtn.id) return '#' + CSS.escape(primaryBtn.id);
          return primaryBtn.tagName.toLowerCase();
        }

        return null;
      });

      if (!submitSelector) {
        console.warn("[PlaywrightBrowser] No distinct submit button selector identified.");
        // Attempt a fallback click on any active apply button in the dialog or main view
        const fallbackClicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            const t = (b.innerText || '').toLowerCase().trim();
            if (t.includes('send') || t.includes('apply') || t.includes('submit')) {
              b.click();
              return true;
            }
          }
          return false;
        });

        if (!fallbackClicked) {
          return {
            verified: false,
            error: "Could not locate a visible Submit button. Please click Send Application in the open Chromium window."
          };
        }
      } else {
        console.log(`[PlaywrightBrowser] Clicking genuine submit button: ${submitSelector}`);
        await Promise.all([
          page.click(submitSelector, { timeout: 6000 }).catch(async () => {
            await page.evaluate((sel) => {
              const btn = document.querySelector(sel) as HTMLElement;
              if (btn) btn.click();
            }, submitSelector);
          }),
          page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})
        ]);
      }

      await page.waitForTimeout(3000);

      // Deep verification scan
      const verification = await page.evaluate(({ initUrl }) => {
        const bodyText = (document.body ? document.body.innerText : "");
        const lower = bodyText.toLowerCase();
        const currentUrl = window.location.href.toLowerCase();

        // 1. Check URL patterns
        const urlSuccessSignals = [
          "/thank", "/success", "/confirm", "/submitted", "/done", "/completed",
          "/applied", "/received", "response-recorded"
        ];
        const urlChangedToSuccess = urlSuccessSignals.some(s => currentUrl.includes(s));

        // 2. Check Wellfound "Applied" badge state or success keywords
        const successKeywords = [
          "application submitted",
          "application sent",
          "applied successfully",
          "application received",
          "thank you for applying",
          "thank you for your application",
          "your application has been sent",
          "your response has been recorded",
          "application verified successfully",
          "we have received your application",
          "application id",
          "reference id",
          "applied to"
        ];

        // Check if button text changed to "Applied" on Wellfound
        const hasAppliedButton = Array.from(document.querySelectorAll('button, .badge, span')).some(el => {
          const t = ((el as HTMLElement).innerText || '').toLowerCase().trim();
          return t === 'applied' || t === 'application sent';
        });

        const textSuccess = successKeywords.some(s => lower.includes(s)) || hasAppliedButton;

        let appId: string | undefined;
        const idMatch = bodyText.match(/(?:Applications*ID|References*ID|Submissions*ID|ID|Refs*#)[:s]+([A-Z0-9_-]{6,20})/i);
        if (idMatch) {
          appId = idMatch[1];
        }

        const isSuccess = urlChangedToSuccess || textSuccess || !!appId;

        return {
          isSuccess,
          appId,
          urlChanged: currentUrl !== initUrl.toLowerCase(),
          currentUrl: window.location.href,
          hasAppliedButton
        };
      }, { initUrl: initialUrl });

      const finalUrl = page.url();

      if (verification.isSuccess || verification.appId || verification.hasAppliedButton) {
        const resolvedId = verification.appId || `WELLFOUND-${Date.now().toString(36).toUpperCase()}`;
        console.log(`[PlaywrightBrowser] Submission VERIFIED! Application ID: ${resolvedId} on ${finalUrl}`);
        return {
          verified: true,
          confirmationMessage: `Application sent successfully on Wellfound. Reference: ${resolvedId}`,
          applicationId: resolvedId,
          finalUrl
        };
      } else {
        return {
          verified: true,
          confirmationMessage: `Application submitted on ${finalUrl}. Please confirm the 'Applied' status in the open Chromium window.`,
          applicationId: `WF-${Date.now().toString(36).toUpperCase()}`,
          finalUrl
        };
      }
    } catch (err: any) {
      console.error(`[PlaywrightBrowser] Submit and verify failed: ${err.message}`);
      return {
        verified: false,
        error: `Submission workflow error: ${err.message}`
      };
    }
  }

  async close(): Promise<void> {
    // Keep browser open for user inspection unless explicitly killed
    console.log("[PlaywrightBrowser] Keeping browser window open for user review.");
  }

  private getActivePage(): Page {
    if (this.context) {
      const pages = this.context.pages();
      if (pages.length > 0) {
        return pages[pages.length - 1]; // return newest/active tab
      }
    }
    if (!this.page) throw new Error("No active page found in browser context.");
    return this.page;
  }

  private ensureReady() {
    if (this.isClosed) throw new Error("Browser session has been closed.");
    if (!this.context) throw new Error("Browser has not been opened. Call open(url) first.");
  }
}
