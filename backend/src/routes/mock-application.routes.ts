import { Router } from "express";
import { randomBytes } from "node:crypto";

export const mockApplicationRouter = Router();

mockApplicationRouter.get("/mock-application/cybersecurity-intern", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Apply: Cybersecurity Analyst Intern - SecureStack</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f7f6; color: #1a202c; padding: 40px 20px; margin: 0; }
        .card { max-width: 680px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 36px; }
        h1 { font-size: 24px; margin: 0 0 8px 0; color: #2d3748; }
        .company { color: #4a5568; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #edf2f7; padding-bottom: 16px; }
        .field { margin-bottom: 18px; }
        label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; color: #4a5568; }
        label span.req { color: #e53e3e; }
        input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, select {
          width: 100%; padding: 10px 14px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;
        }
        input:focus, textarea:focus { outline: none; border-color: #3182ce; box-shadow: 0 0 0 3px rgba(49,130,206,0.15); }
        input[type="file"] { padding: 8px 0; font-size: 13px; }
        button[type="submit"] {
          width: 100%; background: #2b6cb0; color: white; border: none; padding: 14px; font-size: 15px; font-weight: 600; border-radius: 6px; cursor: pointer; margin-top: 12px; transition: background 0.2s;
        }
        button[type="submit"]:hover { background: #2c5282; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Cybersecurity Analyst Intern</h1>
        <div class="company">SecureStack · Bengaluru / Remote · Application Portal</div>
        
        <form action="/mock-application/submit" method="POST" enctype="multipart/form-data" id="jobAppForm">
          <div class="field">
            <label for="fullName">Full Name <span class="req">*</span></label>
            <input type="text" id="fullName" name="fullName" placeholder="e.g. Yash Harfode" required>
          </div>

          <div class="field">
            <label for="email">Email Address <span class="req">*</span></label>
            <input type="email" id="email" name="email" placeholder="e.g. yash@example.com" required>
          </div>

          <div class="field">
            <label for="phone">Phone Number <span class="req">*</span></label>
            <input type="tel" id="phone" name="phone" placeholder="e.g. +91 9244161034" required>
          </div>

          <div class="field">
            <label for="college">College / University <span class="req">*</span></label>
            <input type="text" id="college" name="college" placeholder="e.g. SATI Vidisha" required>
          </div>

          <div class="field">
            <label for="github">GitHub Profile URL</label>
            <input type="url" id="github" name="github" placeholder="https://github.com/username">
          </div>

          <div class="field">
            <label for="linkedin">LinkedIn Profile URL</label>
            <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username">
          </div>

          <div class="field">
            <label for="resume">Upload Resume (PDF / DOC) <span class="req">*</span></label>
            <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" required>
          </div>

          <div class="field">
            <label for="interest">Why are you interested in this internship? <span class="req">*</span></label>
            <textarea id="interest" name="interest" rows="4" placeholder="Describe your relevant skills and interest in defensive security..." required></textarea>
          </div>

          <div class="field">
            <label for="stipend">Expected Monthly Stipend (INR) <span class="req">*</span></label>
            <input type="text" id="stipend" name="stipend" placeholder="e.g. 15000" required>
          </div>

          <button type="submit" id="submitBtn">Submit Application</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

mockApplicationRouter.post("/mock-application/submit", (req, res) => {
  const appId = "SCOUTLY-" + randomBytes(3).toString("hex").toUpperCase();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Application Submitted Successfully</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #166534; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: white; border: 1px solid #bbf7d0; border-radius: 12px; padding: 40px; max-width: 520px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 16px; }
        h1 { margin: 0 0 12px 0; font-size: 24px; color: #14532d; }
        p { color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
        .ref-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 16px; color: #1e293b; font-weight: bold; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">CONFIRMED</span>
        <h1 id="confirmationTitle">Application submitted successfully!</h1>
        <p>Thank you for applying to the <strong>Cybersecurity Analyst Intern</strong> position at SecureStack. Your application and resume have been received.</p>
        <div class="ref-box" id="applicationId">Application ID: ${appId}</div>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">Submission verified by Scoutly Autonomous Browser Agent</p>
      </div>
    </body>
    </html>
  `);
});
