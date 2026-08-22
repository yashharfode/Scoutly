import { PlaywrightBrowserAgent } from "../agents/browser/playwright-browser-agent.js";
import { mapFields } from "../agents/browser/field-mapper.js";
import { fillForm } from "../agents/browser/form-filler.js";
import { generateAnswersForUnknowns } from "../agents/browser/ai-answer-generator.js";
import { validateApplication } from "../agents/browser/application-validator.js";
import { StudentProfile, Opportunity } from "../models/domain.js";
import { profileStorage } from "../storage/profile.storage.js";
import { applicationsStorage } from "../routes/opportunities.routes.js";
import express from "express";
import { mockApplicationRouter } from "../routes/mock-application.routes.js";
import http from "node:http";

async function runEndToEndVerification() {
  console.log("==================================================");
  console.log("SCOUTLY AUTONOMOUS BROWSER AGENT: VERIFIED E2E TEST");
  console.log("==================================================\n");

  // Step 0: Spin up ephemeral test server for the mock application portal
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(mockApplicationRouter);

  const server = http.createServer(app);
  const TEST_PORT = 3200;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Local Mock Application Portal live at http://localhost:${TEST_PORT}/mock-application/cybersecurity-intern`);

  const agent = new PlaywrightBrowserAgent();
  
  try {
    const targetUrl = `http://localhost:${TEST_PORT}/mock-application/cybersecurity-intern`;
    
    // Checkpoint 1: Launch Browser & Open Page
    console.log("\n[Checkpoint 1] Launching Chromium and opening application page...");
    const openRes = await agent.open(targetUrl);
    if (!openRes.success) throw new Error("Failed to open application URL: " + openRes.error);
    console.log("✓ Browser launched and navigated to target portal.");

    // Checkpoint 2: Inspect DOM & Detect Fields
    console.log("\n[Checkpoint 2] Inspecting page DOM and detecting form fields...");
    const inspection = await agent.inspectPage();
    console.log(`✓ Detected ${inspection.fields.length} form input fields on page.`);
    console.log(`  Page Title: "${inspection.pageTitle}"`);
    console.log(`  Captcha Present: ${inspection.hasCaptcha} | Login Wall: ${inspection.isLogin}`);

    if (inspection.fields.length < 8) {
      throw new Error(`Expected at least 8 fields, but detected ${inspection.fields.length}`);
    }

    // Checkpoint 3: Multi-Signal Semantic Mapping
    console.log("\n[Checkpoint 3] Performing semantic field mapping with student profile...");
    const profile = await profileStorage.get();
    let mappings = mapFields(inspection.fields, profile);
    console.log(`✓ Mapped ${mappings.length} fields against verified profile.`);
    mappings.forEach(m => {
      console.log(`  - Field [${m.fieldId}] -> Status: ${m.status} | Source: ${m.source} | Value: "${m.value.slice(0, 30)}${m.value.length > 30 ? '...' : ''}"`);
    });

    // Checkpoint 4: Synthesize AI Answers
    console.log("\n[Checkpoint 4] Generating personalized, grounded AI answers for subjective questions...");
    const mockOpportunity: Opportunity = {
      id: "cyber-intern-01",
      title: "Cybersecurity Analyst Intern",
      organization: "SecureStack",
      type: "internship",
      skills: ["Python", "Network Traffic Analysis", "Linux"],
      description: "Perform threat analysis and incident response.",
      applicationUrl: targetUrl,
      source: "Scoutly",
      sourceUrl: targetUrl,
      extractedAt: new Date().toISOString(),
      tags: ["security"]
    };

    mappings = await generateAnswersForUnknowns(inspection.fields, mappings, profile, mockOpportunity);
    
    // For sensitive stipend field, supply user-approved amount
    const stipendMapping = mappings.find(m => m.fieldId === "stipend");
    if (stipendMapping) {
      stipendMapping.value = "18000";
      stipendMapping.status = "safe";
      console.log(`✓ User reviewed and approved Expected Stipend: ₹18,000`);
    }

    // Checkpoint 5: Auto-fill Form and Upload Real Resume
    console.log("\n[Checkpoint 5] Filling safe fields and uploading resume in browser...");
    const fillReport = await fillForm(agent, inspection.fields, mappings);
    console.log(`✓ Form filled. Succeeded: ${fillReport.filledCount} fields, Failed: ${fillReport.failedCount} fields.`);
    if (fillReport.failedCount > 0) {
      console.warn("  Errors:", fillReport.errors);
    }

    // Checkpoint 6: Validation & Readiness Score
    console.log("\n[Checkpoint 6] Validating application readiness...");
    const validation = validateApplication(inspection.fields, mappings);
    console.log(`✓ Readiness: ${(validation.completion * 100).toFixed(0)}% | Ready to Submit: ${validation.ready}`);
    console.log(`  Safe Fields: ${validation.safeFields} | Review Fields: ${validation.reviewFields} | Missing Required: ${validation.missingRequired.length}`);

    if (!validation.ready) {
      throw new Error(`Application not ready for submission. Missing: ${validation.missingRequired.join(", ")}`);
    }

    // Checkpoint 7: Human Approval & Explicit Verified Submission
    console.log("\n[Checkpoint 7] Simulating explicit user click 'Approve & Submit Application'...");
    const verification = await agent.submitAndVerify();
    
    if (!verification.verified) {
      throw new Error(`Submission verification failed: ${verification.error}`);
    }

    console.log("\n==================================================");
    console.log("🎉 SUBMISSION CONFIRMED & VERIFIED!");
    console.log(`   Application ID: ${verification.applicationId}`);
    console.log(`   Confirmation Message: ${verification.confirmationMessage}`);
    console.log(`   Final URL: ${verification.finalUrl}`);
    console.log("==================================================");

    // Checkpoint 8: Persist to Application Tracker
    console.log("\n[Checkpoint 8] Recording verified application in local persistent tracker...");
    const existingApps = await applicationsStorage.get();
    existingApps.push({
      id: verification.applicationId!,
      opportunityId: mockOpportunity.id,
      status: "submitted",
      notes: `Verified submission via Playwright. ID: ${verification.applicationId}`,
      appliedAt: new Date().toISOString(),
      answers: mappings.reduce((acc, m) => {
        if (m.value) acc[m.fieldId] = m.value;
        return acc;
      }, {} as Record<string, string>)
    });
    await applicationsStorage.save(existingApps);
    console.log("✓ Application tracker updated.");

    console.log("\n✅ ALL 8 CHECKPOINTS PASSED SUCCESSFULLY!");
  } catch (err: any) {
    console.error("\n❌ E2E TEST FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    await agent.close().catch(() => {});
    server.close();
  }
}

runEndToEndVerification();
