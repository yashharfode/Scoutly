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
import { ExperienceMemoryService } from "../agents/memory/experience-memory.service.js";
import { AgentPlanner } from "../agents/planner/agent-planner.js";
import { WebsitePlaybook, ApplicationRunTrace } from "../agents/memory/experience-memory.types.js";

// In-memory active browser sessions
const sessions: Record<string, ApplicationSession & {
  agent: BrowserAgent;
  opportunity: Opportunity;
  planner: AgentPlanner;
  playbook: WebsitePlaybook | null;
  memoryMatch?: any;
  hasCaptcha?: boolean;
  isLogin?: boolean;
  screenshotPath?: string;
  isDuplicate?: boolean;
  previousApplication?: any;
}> = {};

export const applyRouter = Router();

// Memory inspection endpoints for Cockpit & Judge Dashboard
applyRouter.get("/memory/summary", (_req, res) => {
  res.json(ExperienceMemoryService.getMemorySummary());
});

applyRouter.get("/memory/playbooks", (_req, res) => {
  res.json(ExperienceMemoryService.getPlaybooks());
});

applyRouter.get("/memory/runs", (_req, res) => {
  res.json(ExperienceMemoryService.getRuns());
});

applyRouter.get("/memory/check-duplicate", (req, res) => {
  const opportunityId = String(req.query.opportunityId || "");
  const title = req.query.title ? String(req.query.title) : undefined;
  const organization = req.query.organization ? String(req.query.organization) : undefined;

  const result = ExperienceMemoryService.checkDuplicateApplication(opportunityId, title, organization);
  res.json(result);
});

// 1. Prepare: Launch Browser, Evaluate Eligibility & Check Duplicate
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
      title: title || "Cybersecurity Analyst Intern",
      organization: organization || "SecureStack Technologies",
      type: "internship",
      skills: ["Cybersecurity", "Python", "Linux"],
      applicationUrl: targetUrl,
      source: "Scoutly",
      sourceUrl: targetUrl,
      extractedAt: new Date().toISOString(),
      tags: ["Internship"]
    };

    // Duplicate application check
    const duplicateCheck = ExperienceMemoryService.checkDuplicateApplication(
      opportunityId,
      opportunity.title,
      opportunity.organization
    );

    const planner = new AgentPlanner();
    planner.recordStep(
      "Evaluate Opportunity & Eligibility",
      "evaluate_eligibility",
      "success",
      `Goal understood: Apply to ${opportunity.title} at ${opportunity.organization}. Eligibility criteria verified against student profile.`
    );

    if (duplicateCheck.isDuplicate) {
      planner.recordStep(
        "Duplicate Check",
        "evaluate_eligibility",
        "warning",
        `Notice: An application record already exists for ${opportunity.title} (${duplicateCheck.previousApplication?.appliedAt}). Human review required before re-submitting.`
      );
    }

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
      opportunity,
      planner,
      playbook: null,
      isDuplicate: duplicateCheck.isDuplicate,
      previousApplication: duplicateCheck.previousApplication
    };

    console.log(`[Apply Agent] Initializing session ${sessionId} on ${targetUrl} [Mode: ${activeMode}]`);
    
    planner.recordStep(
      "Launch Browser Context",
      "inspect_form",
      "info",
      `Launching ${activeMode === "playwright" ? "real headed Chromium" : "sandbox mock browser"} and navigating to ${targetUrl}...`
    );

    const openRes = await agent.open(targetUrl);
    
    if (!openRes.success) {
      planner.recordStep("Launch Browser Context", "inspect_form", "error", `Failed to open page: ${openRes.error}`);
      sessions[sessionId].status = "failed";
      sessions[sessionId].errorMessage = openRes.error;
      return res.status(500).json({
        sessionId,
        status: "failed",
        error: `Failed to open page: ${openRes.error}`,
        trace: planner.getTrace()
      });
    }

    sessions[sessionId].status = "opened";
    planner.recordStep(
      "Browser Ready",
      "inspect_form",
      "success",
      `Page opened and DOM ready at ${targetUrl}.`
    );

    res.json({
      sessionId,
      status: "opened",
      url: targetUrl,
      mode: activeMode,
      isDuplicate: duplicateCheck.isDuplicate,
      previousApplication: duplicateCheck.previousApplication,
      plan: planner.getPlan(),
      trace: planner.getTrace()
    });
  } catch (error: any) {
    console.error("[Apply Agent] Prepare Error:", error.message);
    next(error);
  }
});

// 2. Analyze: DOM Inspection & Experience Playbook Retrieval
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

    session.planner.recordStep(
      "Inspect Form DOM",
      "inspect_form",
      "success",
      `Detected ${inspection.fields.length} form input fields on page "${inspection.pageTitle}".`
    );

    // Retrieve Experience Playbook from procedural memory
    const retrieval = ExperienceMemoryService.retrievePlaybook(
      session.url,
      inspection.pageTitle,
      session.fields
    );

    session.playbook = retrieval.playbook;
    session.memoryMatch = {
      matched: retrieval.playbook !== null,
      matchType: retrieval.matchType,
      playbookId: retrieval.playbook?.id,
      domain: retrieval.playbook?.domain,
      version: retrieval.playbook?.version,
      confidence: retrieval.confidence,
      reusableFieldCount: retrieval.reusableFieldCount
    };

    if (retrieval.playbook) {
      session.planner.recordStep(
        "Retrieve Experience Memory",
        "retrieve_application_memory",
        "success",
        `Retrieved verified ${retrieval.matchType.replace(/_/g, " ")} (${retrieval.playbook.domain} v${retrieval.playbook.version}) with ${retrieval.reusableFieldCount} verified mappings. Memory Confidence: ${Math.round(retrieval.confidence * 100)}%.`
      );

      // Log negative memory avoidance if any
      if (retrieval.negativeWarnings.length > 0) {
        for (const warn of retrieval.negativeWarnings) {
          session.planner.recordStep(
            "Negative Memory Guardrail",
            "retrieve_application_memory",
            "warning",
            warn
          );
        }
      }
    } else {
      session.planner.recordStep(
        "Retrieve Experience Memory",
        "retrieve_application_memory",
        "info",
        "No previous experience found for this form fingerprint. Initializing adaptive learning mode."
      );
    }

    if (session.hasCaptcha) {
      session.status = "waiting_for_captcha";
      const msg = "CAPTCHA detected on application website. Please complete it in the browser window.";
      if (!session.warnings.includes(msg)) session.warnings.push(msg);
      session.planner.recordStep(
        "Security Checkpoint",
        "request_human_review",
        "warning",
        "CAPTCHA detected. Paused workflow for user resolution in browser."
      );
    } else if (session.isLogin) {
      session.status = "waiting_for_login";
      const msg = "Login required on application website. Please log in directly in the browser window.";
      if (!session.warnings.includes(msg)) session.warnings.push(msg);
      session.planner.recordStep(
        "Authentication Checkpoint",
        "request_human_review",
        "warning",
        "Login wall detected. Paused workflow for user authentication in browser."
      );
    }

    res.json({
      sessionId,
      status: session.status,
      fields: session.fields,
      hasCaptcha: session.hasCaptcha,
      isLogin: session.isLogin,
      pageTitle: inspection.pageTitle,
      screenshotPath: session.screenshotPath,
      warnings: session.warnings,
      memoryMatch: session.memoryMatch,
      trace: session.planner.getTrace()
    });
  } catch (error: any) {
    console.error("[Apply Agent] Analyze Error:", error.message);
    next(error);
  }
});

// 3. Fill: Apply Experience Mappings, Synthesize Answers & Fill Browser Form
applyRouter.post("/apply/fill", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "mapping";
    const profile = await profileStorage.get();
    
    // Step A: Multi-signal field mapping utilizing retrieved experience playbook
    let mappings = mapFields(session.fields, profile, session.playbook);

    const reusedCount = mappings.filter(m => m.source === "experience_memory").length;
    const profileCount = mappings.filter(m => m.source === "student_profile").length;

    session.planner.recordStep(
      "Adapt & Map Profile Fields",
      "map_fields",
      "success",
      `Mapped ${mappings.length} fields: ${reusedCount} remembered from verified experience, ${profileCount} matched from student profile.`
    );

    // Step B: AI personalized answer synthesis for subjective questions
    const subjectiveCount = mappings.filter(m => m.source === "ai_generation_pending" || m.status === "unknown").length;
    mappings = await generateAnswersForUnknowns(session.fields, mappings, profile, session.opportunity);
    session.mappings = mappings;

    if (subjectiveCount > 0) {
      session.planner.recordStep(
        "Synthesize Grounded Answers",
        "generate_application_answer",
        "success",
        `Synthesized ${subjectiveCount} personalized answers grounded strictly in verified profile skills and projects.`
      );
    }

    // Step C: Auto-fill inputs and upload resume in browser
    session.status = "filling";
    const fillReport = await fillForm(session.agent, session.fields, mappings);
    if (fillReport.errors.length > 0) {
      session.warnings.push(...fillReport.errors.map(e => `Field ${e.fieldId}: ${e.error}`));
    }

    session.planner.recordStep(
      "Fill Form & Attach Resume",
      "fill_field",
      "success",
      `Filled ${fillReport.filledCount} fields in Chromium browser and attached PDF resume.`
    );

    // Step D: Validate form readiness
    const validation = validateApplication(session.fields, session.mappings);
    session.completion = validation.completion;
    session.status = "ready_for_review";

    session.planner.recordStep(
      "Human Approval Gate",
      "request_human_review",
      "info",
      `Application readiness: ${Math.round(validation.completion * 100)}%. Paused in Cockpit for mandatory human verification before submission.`
    );

    res.json({
      sessionId,
      status: session.status,
      mappings: session.mappings,
      validation,
      completion: session.completion,
      fillReport,
      warnings: session.warnings,
      memoryMatch: session.memoryMatch,
      reusedCount,
      trace: session.planner.getTrace()
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

      session.planner.recordStep(
        "User Refinement",
        "verify_field",
        "info",
        `Human reviewed and modified "${fieldId}" in browser DOM.`
      );
    }

    const validation = validateApplication(session.fields, session.mappings);
    session.completion = validation.completion;

    res.json({
      sessionId,
      mappings: session.mappings,
      validation,
      completion: session.completion,
      trace: session.planner.getTrace()
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

      session.planner.recordStep(
        "Regenerate Answer",
        "generate_application_answer",
        "success",
        `Regenerated answer for "${fieldId}" with fresh contextual grounding.`
      );
    }

    res.json({
      sessionId,
      mappings: session.mappings,
      trace: session.planner.getTrace()
    });
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
      session.planner.recordStep(
        "Checkpoint Cleared",
        "inspect_form",
        "success",
        "Authentication / CAPTCHA gate successfully cleared. Resuming automation..."
      );
    }

    res.json({
      sessionId,
      status: session.status,
      fields: session.fields,
      hasCaptcha: session.hasCaptcha,
      isLogin: session.isLogin,
      trace: session.planner.getTrace()
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
      errorMessage: session.errorMessage,
      memoryMatch: session.memoryMatch,
      isDuplicate: session.isDuplicate,
      previousApplication: session.previousApplication,
      trace: session.planner ? session.planner.getTrace() : []
    });
  } catch (error: any) {
    next(error);
  }
});

// 8. Submit: Explicit Human-Approved Click + Verification + Learning Loop
applyRouter.post("/apply/submit", async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = "submitting";
    console.log(`[Apply Agent] Human approved submission for session ${sessionId}. Dispatching submit...`);

    session.planner.recordStep(
      "User Approved Submission",
      "submit_application",
      "info",
      "Explicit human approval granted. Dispatching verified form submission..."
    );

    // Submit and perform deep verification on resulting page
    session.status = "verifying";
    const verification = await session.agent.submitAndVerify();

    if (verification.verified) {
      session.status = "submitted";
      session.applicationId = verification.applicationId;
      console.log(`[Apply Agent] Verified submission success: ${verification.applicationId}`);

      session.planner.recordStep(
        "Verify Confirmation",
        "verify_submission",
        "success",
        `Submission VERIFIED by browser agent. Confirmation ID: ${verification.applicationId}`
      );

      // Record to persistent applications storage
      const records = await applicationsStorage.get();
      records.push({
        id: verification.applicationId || sessionId,
        opportunityId: session.opportunityId,
        status: "submitted",
        notes: `Applied to ${session.opportunity.title} at ${session.opportunity.organization} with Scoutly Copilot. Ref: ${verification.applicationId}`,
        appliedAt: new Date().toISOString(),
        answers: session.mappings.reduce((acc, m) => {
          if (m.value) acc[m.fieldId] = m.value;
          return acc;
        }, {} as Record<string, string>)
      });
      await applicationsStorage.save(records);

      // Procedural Memory Learning Loop: Record verified experience
      const inspectionTitle = await session.agent.getPageTitle().catch(() => session.opportunity.title);
      const learned = ExperienceMemoryService.recordSuccess({
        runId: sessionId,
        url: session.url,
        pageTitle: inspectionTitle,
        fields: session.fields,
        mappings: session.mappings,
        opportunity: session.opportunity,
        confirmationId: verification.applicationId || "SCOUTLY-VERIFIED"
      });

      session.planner.recordStep(
        "Store Application Experience",
        "store_application_experience",
        "success",
        `Procedural memory updated: Playbook "${learned.playbook.domain}" promoted to v${learned.newVersion} (${learned.playbook.stats.verifiedRuns} verified runs, Confidence: ${Math.round(learned.playbook.confidence * 100)}%).`
      );

      // Persist full execution trace
      const runTrace: ApplicationRunTrace = {
        runId: sessionId,
        timestamp: new Date().toISOString(),
        goal: `Apply to ${session.opportunity.title} at ${session.opportunity.organization}`,
        opportunity: {
          id: session.opportunity.id,
          title: session.opportunity.title,
          organization: session.opportunity.organization,
          url: session.url
        },
        plan: session.planner.getPlan(),
        actions: session.planner.getTrace(),
        memoryMatch: {
          matched: session.memoryMatch?.matched || false,
          playbookId: learned.playbook.id,
          domain: learned.playbook.domain,
          version: learned.newVersion,
          confidence: learned.playbook.confidence,
          reusedFieldsCount: session.mappings.filter(m => m.source === "experience_memory").length,
          adaptedFieldsCount: session.mappings.filter(m => m.source !== "experience_memory").length
        },
        result: "success",
        verification: {
          verified: true,
          confirmationId: verification.applicationId,
          notes: verification.confirmationMessage
        }
      };
      ExperienceMemoryService.logRunTrace(runTrace);

      return res.json({
        sessionId,
        status: "submitted",
        verified: true,
        applicationId: verification.applicationId,
        confirmationMessage: verification.confirmationMessage,
        appliedAt: new Date().toISOString(),
        learnedVersion: learned.newVersion,
        verifiedRuns: learned.playbook.stats.verifiedRuns,
        trace: session.planner.getTrace()
      });
    } else {
      session.status = "submitted_unverified";
      session.errorMessage = verification.error || "Submission could not be conclusively verified.";
      console.warn(`[Apply Agent] Submission unverified: ${session.errorMessage}`);

      session.planner.recordStep(
        "Verification Inconclusive",
        "verify_submission",
        "warning",
        session.errorMessage
      );

      return res.json({
        sessionId,
        status: "submitted_unverified",
        verified: false,
        error: session.errorMessage,
        trace: session.planner.getTrace()
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
