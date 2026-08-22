import { Router } from "express";
import { randomBytes } from "node:crypto";

export const mockApplicationRouter = Router();

mockApplicationRouter.get("/mock-application/cybersecurity-intern", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cybersecurity Analyst Intern — SecureStack Technologies Careers</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          min-height: 100vh;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .container {
          width: 100%;
          max-width: 760px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }
        .header {
          padding: 32px 36px 24px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-bottom: 1px solid #334155;
        }
        .logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .logo-box {
          width: 42px;
          height: 42px;
          background: #3b82f6;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 20px;
          color: white;
        }
        .company-name {
          font-size: 15px;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        h1 {
          font-size: 26px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
        }
        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .badge {
          background: #334155;
          color: #cbd5e1;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge.highlight {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .desc-box {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 16px;
          font-size: 13px;
          line-height: 1.6;
          color: #94a3b8;
        }
        form {
          padding: 36px;
          display: grid;
          gap: 22px;
        }
        .form-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #334155;
          padding-bottom: 8px;
          margin-top: 8px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .form-row { grid-template-columns: 1fr; }
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
        }
        label span.req {
          color: #ef4444;
          margin-left: 2px;
        }
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="url"],
        textarea {
          width: 100%;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #475569;
          border-radius: 8px;
          color: #f8fafc;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
          background: #1e293b;
        }
        .file-upload-box {
          border: 2px dashed #475569;
          border-radius: 8px;
          padding: 16px;
          background: #0f172a;
          text-align: center;
          cursor: pointer;
        }
        input[type="file"] {
          color: #94a3b8;
          font-size: 13px;
          width: 100%;
        }
        button[type="submit"] {
          background: #2563eb;
          color: white;
          border: none;
          padding: 15px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
        }
        button[type="submit"]:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-row">
            <div class="logo-box">S</div>
            <div class="company-name">SecureStack Technologies</div>
          </div>
          <h1>Cybersecurity Analyst Intern</h1>
          <div class="badges">
            <span class="badge highlight">📍 Remote (India)</span>
            <span class="badge highlight">💰 ₹18,000 / month</span>
            <span class="badge">⏱ 3-6 Months</span>
            <span class="badge">🛡 Threat Intelligence & SOC</span>
          </div>
          <div class="desc-box">
            <strong>About the Role:</strong> SecureStack is hiring a passionate student intern to assist with vulnerability triage, SIEM log monitoring, IAM policy auditing, and automated incident simulations with Python.
          </div>
        </div>

        <form action="/mock-application/submit" method="POST" enctype="multipart/form-data" id="jobAppForm">
          <div class="form-section-title">Personal Information</div>

          <div class="field">
            <label for="fullName">Full Name <span class="req">*</span></label>
            <input type="text" id="fullName" name="fullName" placeholder="e.g. Yash Harfode" required>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="email">Email Address <span class="req">*</span></label>
              <input type="email" id="email" name="email" placeholder="yashharfode123@gmail.com" required>
            </div>
            <div class="field">
              <label for="phone">Phone Number <span class="req">*</span></label>
              <input type="tel" id="phone" name="phone" placeholder="+91 9244161034" required>
            </div>
          </div>

          <div class="field">
            <label for="college">College / University <span class="req">*</span></label>
            <input type="text" id="college" name="college" placeholder="e.g. Samrat Ashok Technological Institute" required>
          </div>

          <div class="form-section-title">Online Profiles & Resume</div>

          <div class="form-row">
            <div class="field">
              <label for="github">GitHub Profile URL <span class="req">*</span></label>
              <input type="url" id="github" name="github" placeholder="https://github.com/yashharfode" required>
            </div>
            <div class="field">
              <label for="linkedin">LinkedIn Profile URL</label>
              <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/yashharfode">
            </div>
          </div>

          <div class="field">
            <label for="resume">Attach Resume (PDF) <span class="req">*</span></label>
            <div class="file-upload-box">
              <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" required>
            </div>
          </div>

          <div class="form-section-title">Role-Specific Questions</div>

          <div class="field">
            <label for="interest">Why are you interested in this internship and SecureStack? <span class="req">*</span></label>
            <textarea id="interest" name="interest" rows="4" placeholder="Explain your relevant skills and motivation..." required></textarea>
          </div>

          <div class="field">
            <label for="stipend">Expected Monthly Stipend (INR) <span class="req">*</span></label>
            <input type="text" id="stipend" name="stipend" placeholder="e.g. 18000" required>
          </div>

          <button type="submit" id="submitBtn">
            <span>Submit Application</span>
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

mockApplicationRouter.post("/mock-application/submit", (_req, res) => {
  const appId = "SCOUTLY-" + randomBytes(3).toString("hex").toUpperCase();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Application Verified & Confirmed — SecureStack</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 44px 36px;
          max-width: 540px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .icon-circle {
          width: 64px;
          height: 64px;
          background: rgba(34, 197, 94, 0.15);
          border: 2px solid #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #4ade80;
          font-size: 28px;
        }
        .badge {
          display: inline-block;
          background: #14532d;
          color: #86efac;
          padding: 5px 14px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.05em;
          margin-bottom: 14px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
        }
        p {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .ref-box {
          background: #0f172a;
          border: 1px solid #3b82f6;
          border-radius: 10px;
          padding: 16px;
          font-family: monospace;
          font-size: 17px;
          color: #60a5fa;
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: 0.05em;
        }
        .footer-note {
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">✓</div>
        <span class="badge">APPLICATION RECEIVED</span>
        <h1 id="confirmationTitle">Application verified successfully!</h1>
        <p>Your application for <strong>Cybersecurity Analyst Intern</strong> at SecureStack Technologies has been received and verified.</p>
        <div class="ref-box" id="applicationId">Application ID: ${appId}</div>
        <div class="footer-note">Verified & Tracked by Scoutly Autonomous Browser Agent</div>
      </div>
    </body>
    </html>
  `);
});
