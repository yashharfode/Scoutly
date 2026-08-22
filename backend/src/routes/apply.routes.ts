import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ApplicationSession, Opportunity } from "../models/domain.js";
import { MockBrowserAgent } from "../agents/browser/mock-browser-agent.js";
import { PlaywrightBrowserAgent } from "../agents/browser/playwright-browser-agent.js";
import { env } from "../config/env.js";
import { BrowserAgent } from "../agents/browser/browser-types.js";
import { mapFields } from "../agents/browser/field-mapper.js";
import { fillForm } from "../agents/browser/form-filler.js";
import { generateAnswersForUnknowns } from "../agents/browser/ai-answer-generator.js";
import { validateApplication } from "../agents/browser/application-validator.js";
import { profileStorage } from "../storage/profile.storage.js";
import { applicationsStorage } from "./opportunities.routes.js";

// In-memory active browser sessions
const sessions: Record<string, ApplicationSession & {
  agent: BrowserAgent;
  opportunity: Opportunity;
  hasCaptcha?: boolean;
  isLogin?: boolean;
  screenshotPath?: string;
}> = {};

export const applyRouter = Router();

// 1. Prepare: Launch Browser & Navigate
applyRouter.post("/apply/prepare", async (req, res, next) => {
  try {
    const { opportunityId, customUrl, title, organization, browserMode } = z.object({
      opportunityId: z.string(),
      customUrl: z.string().optional(),
      title: z.string().optional(),
      organization: z.string().optional(),
      browserMode: z.enum(["mock", "playwright"]).optional()
    }).parse(req.body);

    const sessionId = randomUUID();
    const activeMode = browserMode || env.BROWSER_MODE || "playwright";
    
    let targetUrl = customUrl;
    if (!targetUrl) {
      if (opportunityId === "mock-cyber-analyst" || opportunityId.startsWith("mock-")) {
        targetUrl = `http://localhost:${env.PORT}/mock-application/cybersecurity-intern`;
      } else {
        targetUrl = "https://wellfound.com/jobs";
      }
    }

    const opportunity: Opportunity = {
      id: opportunityId,
      title: title || "Internship Opportunity",
      organization: organization || "Partner Organization",
      type: "internship",
      skills: ["Cybersecurity", "Python", "Linux"],
      applicationUrl: targetUrl,
      source: "Scoutly",
      sourceUrl: targetUrl,
      extractedAt: new Date().toISOString(),
      tags: ["Internship"]
    };

    const agent: BrowserAgent = activeMode === "playwright" 
      ? new PlaywrightBrowserAgent() 
      : new MockBrowserAgent();

    sessions[sessionId] = {
      sessionId,
      opportunityId,
      status: "preparing",
      url: targetUrl,
      fields: [],
      mappings: [],
      answers: [],
      warnings: [],
      completion: 0,
      agent,
      opportunity
    };

    console.log(`[Apply Agent] Initializing session ${sessionId} on ${targetUrl} [Mode: ${activeMode}]`);
    const openRes = await agent.open(targetUrl);
    
    if (!openRes.success) {
      sessions[sessionId].status = "failed";
      sessions[sessionId].errorMessage = openRes.error;
      return res.status(500).json({
        sessionId,
        status: "failed",
        error: `Failed to open page: ${openRes.error}`
      });
    }

    sessions[sessionId].status = "opened";

    res.json({
      sessionId,
      status: "opened",
      url: targetUrl,
      mode: activeMode
    });
  } catch (error: any) {
    console.error("[Apply Agent] Prepare Error:", error.message);
    next(error);
  }
});

// 2. Analyze: Check Login/Captcha & Extract Form Fields
applyRouter.post("/apply/analyze", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "analyzing";
    const inspection = await session.agent.inspectPage();
    session.fields = inspection.fields;
    session.hasCaptcha = inspection.hasCaptcha;
    session.isLogin = inspection.isLogin;
    session.screenshotPath = inspection.screenshotPath;

    if (session.hasCaptcha) {
      session.status = "waiting_for_captcha";
      const msg = "CAPTCHA detected on application website. Please complete it in the browser window.";
      if (!session.warnings.includes(msg)) session.warnings.push(msg);
    } else if (session.isLogin) {
      session.status = "waiting_for_login";
      const msg = "Login required on application website. Please log in directly in the browser window.";
      if (!session.warnings.includes(msg)) session.warnings.push(msg);
    } else {
      session.status = "analyzing";
    }

    res.json({
      sessionId,
      status: session.status,
      fields: session.fields,
      hasCaptcha: session.hasCaptcha,
      isLogin: session.isLogin,
      pageTitle: inspection.pageTitle,
      screenshotPath: session.screenshotPath,
      warnings: session.warnings
    });
  } catch (error: any) {
    console.error("[Apply Agent] Analyze Error:", error.message);
    next(error);
  }
});

// 3. Fill: Semantic Mapping, Resume Upload, AI Answers, Form Filling
applyRouter.post("/apply/fill", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "mapping";
    const profile = await profileStorage.get();
    
    // Step A: Multi-signal semantic field mapping
    let mappings = mapFields(session.fields, profile);

    // Step B: AI personalized answer synthesis for long-form questions
    mappings = await generateAnswersForUnknowns(session.fields, mappings, profile, session.opportunity);
    session.mappings = mappings;

    // Step C: Auto-fill inputs and upload resume in browser
    session.status = "filling";
    const fillReport = await fillForm(session.agent, session.fields, mappings);
    if (fillReport.errors.length > 0) {
      session.warnings.push(...fillReport.errors.map(e => `Field ${e.fieldId}: ${e.error}`));
    }

    // Step D: Validate form readiness
    const validation = validateApplication(session.fields, session.mappings);
    session.completion = validation.completion;
    session.status = "ready_for_review";

    res.json({
      sessionId,
      status: session.status,
      mappings: session.mappings,
      validation,
      completion: session.completion,
      fillReport,
      warnings: session.warnings
    });
  } catch (error: any) {
    console.error("[Apply Agent] Fill Error:", error.message);
    next(error);
  }
});

// 4. Update Field: Manual user edit pushed directly to browser DOM
applyRouter.post("/apply/update-field", async (req, res, next) => {
  try {
    const { sessionId, fieldId, value } = z.object({
      sessionId: z.string(),
      fieldId: z.string(),
      value: z.string()
    }).parse(req.body);

    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    const mapping = session.mappings.find(m => m.fieldId === fieldId);
    if (mapping) {
      mapping.value = value;
      mapping.status = "safe"; // Verified by human
      
      const field = session.fields.find(f => f.id === fieldId);
      if (field && field.selector) {
        if (field.type === "file") {
          await session.agent.uploadFile(field.selector, value);
        } else {
          await session.agent.fillField(field.selector, value);
        }
      }
    }

    const validation = validateApplication(session.fields, session.mappings);
    session.completion = validation.completion;

    res.json({
      sessionId,
      mappings: session.mappings,
      validation,
      completion: session.completion
    });
  } catch (error: any) {
    next(error);
  }
});

// 5. Regenerate AI Answer
applyRouter.post("/apply/regenerate-answer", async (req, res, next) => {
  try {
    const { sessionId, fieldId } = z.object({
      sessionId: z.string(),
      fieldId: z.string()
    }).parse(req.body);

    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    const profile = await profileStorage.get();
    const mapping = session.mappings.find(m => m.fieldId === fieldId);
    if (mapping) {
      mapping.source = "ai_generation_pending";
      const updated = await generateAnswersForUnknowns(session.fields, [mapping], profile, session.opportunity);
      const newMapping = updated[0];
      mapping.value = newMapping.value;
      mapping.status = newMapping.status;
      mapping.aiGenerated = true;

      const field = session.fields.find(f => f.id === fieldId);
      if (field && field.selector && mapping.value) {
        await session.agent.fillField(field.selector, mapping.value);
      }
    }

    res.json({ sessionId, mappings: session.mappings });
  } catch (error: any) {
    next(error);
  }
});

// 6. Resume: User finished manual Captcha/Login
applyRouter.post("/apply/resume", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Re-inspect page after user interaction
    const inspection = await session.agent.inspectPage();
    session.fields = inspection.fields;
    session.hasCaptcha = inspection.hasCaptcha;
    session.isLogin = inspection.isLogin;

    if (!session.hasCaptcha && !session.isLogin) {
      session.warnings = session.warnings.filter(w => !w.includes("CAPTCHA") && !w.includes("Login"));
      session.status = "analyzing";
    }

    res.json({
      sessionId,
      status: session.status,
      fields: session.fields,
      hasCaptcha: session.hasCaptcha,
      isLogin: session.isLogin
    });
  } catch (error: any) {
    next(error);
  }
});

// 7. Get Session Status
applyRouter.get("/apply/session/:sessionId", async (req, res, next) => {
  try {
    const session = sessions[req.params.sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    const validation = validateApplication(session.fields, session.mappings);

    res.json({
      sessionId: session.sessionId,
      opportunityId: session.opportunityId,
      opportunity: session.opportunity,
      status: session.status,
      fields: session.fields,
      mappings: session.mappings,
      completion: session.completion,
      validation,
      warnings: session.warnings,
      hasCaptcha: session.hasCaptcha,
      isLogin: session.isLogin,
      screenshotPath: session.screenshotPath,
      applicationId: session.applicationId,
      errorMessage: session.errorMessage
    });
  } catch (error: any) {
    next(error);
  }
});

// 8. Submit: Explicit Human-Approved Click + Verification
applyRouter.post("/apply/submit", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "submitting";
    console.log(`[Apply Agent] Human approved submission for session ${sessionId}. Dispatching submit...`);

    // Submit and perform deep verification on resulting page
    session.status = "verifying";
    const verification = await session.agent.submitAndVerify();

    if (verification.verified) {
      session.status = "submitted";
      session.applicationId = verification.applicationId;
      console.log(`[Apply Agent] Verified submission success: ${verification.applicationId}`);

      // Record to persistent storage
      const records = await applicationsStorage.get();
      records.push({
        id: verification.applicationId || sessionId,
        opportunityId: session.opportunityId,
        status: "submitted",
        notes: `Applied to ${session.opportunity.title} at ${session.opportunity.organization} with Scoutly Browser Agent. Ref: ${verification.applicationId}`,
        appliedAt: new Date().toISOString(),
        answers: session.mappings.reduce((acc, m) => {
          if (m.value) acc[m.fieldId] = m.value;
          return acc;
        }, {} as Record<string, string>)
      });
      await applicationsStorage.save(records);

      return res.json({
        sessionId,
        status: "submitted",
        verified: true,
        applicationId: verification.applicationId,
        confirmationMessage: verification.confirmationMessage,
        appliedAt: new Date().toISOString()
      });
    } else {
      session.status = "submitted_unverified";
      session.errorMessage = verification.error || "Submission could not be conclusively verified.";
      console.warn(`[Apply Agent] Submission unverified: ${session.errorMessage}`);

      return res.json({
        sessionId,
        status: "submitted_unverified",
        verified: false,
        error: session.errorMessage
      });
    }
  } catch (error: any) {
    console.error("[Apply Agent] Submit Error:", error.message);
    if (sessions[req.body?.sessionId]) {
      sessions[req.body.sessionId].status = "failed";
      sessions[req.body.sessionId].errorMessage = error.message;
    }
    next(error);
  }
});

// 9. Cancel & Close
applyRouter.post("/apply/cancel", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (session) {
      session.status = "cancelled";
      await session.agent.close().catch(() => {});
      delete sessions[sessionId];
    }
    res.json({ success: true, status: "cancelled" });
  } catch (error: any) {
    next(error);
  }
});
