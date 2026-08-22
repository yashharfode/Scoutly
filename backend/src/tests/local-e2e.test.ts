import { PlaywrightBrowserAgent } from "../agents/browser/playwright-browser-agent.js";
import { mapFields } from "../agents/browser/field-mapper.js";
import { fillForm } from "../agents/browser/form-filler.js";
import { validateApplication } from "../agents/browser/application-validator.js";
import { StudentProfile } from "../models/domain.js";

async function runTest() {
  const agent = new PlaywrightBrowserAgent();
  try {
    console.log("Starting Local Playwright E2E Test...");
    await agent.open("http://localhost:3000/mock-application/cybersecurity-intern");
    
    console.log("Detecting forms...");
    const fields = await agent.detectForms();
    console.log("Detected fields:", fields.length);
    
    const mockProfile: StudentProfile = {
      name: "Yash",
      email: "test@example.com",
      phone: "1234567890",
      college: "Test University",
      degree: "B.Tech",
      branch: "Computer Science",
      year: "3rd",
      location: "India",
      skills: ["Cybersecurity", "Python", "Linux"],
      projects: [],
      experience: [],
      preferredDomains: [],
      preferredLocations: [],
      preferredMode: [],
      minimumStipend: 10000,
      resumePath: "package.json", // using an existing file as a mock resume
      github: "https://github.com/yashharfode",
      linkedin: "",
      portfolio: ""
    };
    
    console.log("Mapping fields...");
    const mappings = mapFields(fields, mockProfile);
    
    console.log("Filling form...");
    await fillForm(agent, fields, mappings);
    
    console.log("Validating...");
    const validation = validateApplication(fields, mappings);
    console.log("Validation Result:", validation);
    
    console.log("Submitting...");
    await agent.click("button[type='submit']");
    
    await new Promise(r => setTimeout(r, 2000)); // Wait for page load
    const title = await agent.getPageTitle();
    console.log("Page title after submit:", title);
    
    if (title.includes("Success")) {
      console.log("TEST PASSED!");
    } else {
      console.log("TEST FAILED: Did not reach success page.");
    }
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    await agent.close();
  }
}

runTest();
