<div align="center">

# 🦅 Scoutly
### **Autonomous AI Browser Agent for Student Internship Discovery & Verified Applications**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<p align="center">
  <b>Scoutly</b> is a privacy-first, autonomous AI agent that concurrently scouts <b>11+ live internship platforms</b> (Unstop, Wellfound, Company Portals, AICTE, Greenhouse, Lever, etc.), learns student preferences over time, and uses <b>headed Playwright Chromium</b> to auto-fill applications, attach resumes, synthesize grounded AI responses, and request final approval in an interactive <b>Human-in-the-Loop Cockpit</b>.
</p>

[✨ Live Features](#-key-features) •
[🏗️ Architecture](#️-system-architecture) •
[🔄 Flowcharts](#-workflow-diagrams) •
[💻 Tech Stack](#-tech-stack) •
[🚀 Quickstart](#-getting-started) •
[🎯 Judge Demo Mode](#-judge-demo-mode)

---

</div>

## 🌟 Key Features

### 🔍 1. Multi-Source Discovery Engine (11+ Concurrent Portals)
- **Concurrently queries 11 public job platforms** in parallel with non-blocking resilience (`Promise.allSettled`).
- **Live Connected Sources**:
  - 🌐 **Unstop India** (Live Public Search API)
  - 🌐 **Wellfound (AngelList Talent)** (Verified Live Startup Roles & Custom Questions)
  - 🌐 **Direct Company Career Portals** (Palantir, AMD, Figma, Microsoft, TikTok, Jane Street, etc.)
  - 🌐 **AICTE Government Internship Portal**
  - 🌐 **Greenhouse & Lever ATS Boards**
  - 🌐 **Indeed & Foundit India Aggregators**
- **Smart Normalization & Deduplication**: Cleans titles, normalizes modes (*Remote / Hybrid / Onsite*), parses stipends (*e.g., ₹18,000/mo, 15k-25k, $500*), and deduplicates across platforms using source-authority priority (*Direct ATS > Portals > Aggregators*).
- **Interactive Multi-Filter Cockpit**: Instant filtering by **Domain/Interest** (*Cybersecurity, AI/ML, Full Stack, DevOps, Data Science*), **Website Source**, **Work Mode**, **Min Stipend**, and **Real-Time In-Page Search**.

---

### 🤖 2. Persistent Playwright Browser Agent
- **Real Headed Chromium Automation**: Launches real Chromium browser windows right on your desktop.
- **Persistent Session Storage (`data/browser-user-data`)**: Saves cookies, local storage, and Google/OTP logins. Log in once on any portal—Scoutly remembers you for all future applications!
- **Auth Gate & Login Pause**: If an application requires login, Scoutly pauses and displays an interactive banner:  
  `[ 🔐 I've Logged In — Fast Apply 🚀 ]`. Once clicked, it resumes autofill immediately.
- **Multi-Tab & Popup Tracking**: Listens for newly opened popup windows and redirects, keeping focus on the active form tab.
- **Real PDF Resume Attachment**: Auto-detects and attaches `Resume/Yash_Harfode_Resume.pdf` to file upload inputs.

---

### 🧠 3. Self-Learning AI Engine
- **Memory Tracking (`data/agent-memory.json`)**: Automatically tracks user searches, saved opportunities, applications, and dismissals.
- **Adaptive Match Boosting (+15%)**: Dynamically adjusts match scoring (up to 100%) and highlights personalized match reasons based on the student's tech stack and history.
- **Grounded AI Answers**: Synthesizes genuine, first-person answers for subjective application questions (*e.g., "Why are you interested in this role?"*) using verified student projects without fabricating skills.

---

### 🛡️ 4. Human-in-the-Loop Review Cockpit
- **Interactive Field Review**: Displays all detected DOM form fields classified into `Safe Match (✓)`, `Review Required (⚠)`, and `Missing Input (❗)`.
- **Instant Fluid Editing**: Real-time optimistic editing in review textareas with live browser DOM synchronization.
- **Regenerate AI**: 1-click regeneration of subjective question answers.
- **Verified Submissions**: Clicks submit only upon explicit user approval, inspects the response page for confirmation receipts, and extracts unique Reference IDs (*e.g., `SCOUTLY-3F58CD`*).

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  SCOUTLY CLIENT (Vite/React)           │
                                  │  - Multi-Source Filter Cockpit   - Human-in-the-Loop   │
                                  │  - Judge Demo Showcase           - Profile Management  │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ REST API / JSON
                                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              SCOUTLY BACKEND (Node.js/Express)                                         │
├─────────────────────────────────────────┬──────────────────────────────────────────┬───────────────────────────────────┤
│        DISCOVERY ENGINE                 │          BROWSER AGENT ENGINE            │        SELF-LEARNING MEMORY       │
│  - 11 Concurrent Adapters               │  - Playwright Persistent Chromium Context│  - Search & Apply Tracking        │
│  - Unstop, Wellfound, AICTE, ATS feeds  │  - DOM Inspection & Smart Apply Trigger  │  - Adaptive Preference Ranking    │
│  - Deduplication & Normalization        │  - PDF Resume Multi-Path Attachment      │  - Match Score Weighting (+15%)   │
│  - Transparent 10-Min Caching           │  - Safe Submit & Reference Verification  │  - Persistent storage in JSON     │
└─────────────────────────────────────────┴──────────────────────────────────────────┴───────────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ▼                                                                                   ▼
┌───────────────────────────────────────┐                                           ┌───────────────────────────────────────┐
│     EXTERNAL PUBLIC JOB SOURCES       │                                           │        REAL HEADED CHROMIUM           │
│  - Unstop Public Search API           │                                           │  - Persistent Session Cookies         │
│  - Wellfound Live Startup Listings    │                                           │  - Live Form Autofill & Events        │
│  - Direct Company Career Feeds        │                                           │  - Real Resume PDF Upload             │
│  - AICTE Govt Internship Portal       │                                           │  - Human-Supervised Submission        │
└───────────────────────────────────────┘                                           └───────────────────────────────────────┘
```

---

## 🔄 Workflow Diagrams

### 1. Multi-Source Discovery Pipeline

```mermaid
flowchart TD
    UserQuery["User Enters Query / Clicks Career Interest Preset"] --> DiscoveryEngine["Discovery Engine Orchestrator"]
    
    DiscoveryEngine --> CheckCache{"Cache Valid in\ndata/discovery-cache.json?"}
    CheckCache -- "YES (Cache Hit)" --> RankedFeed["Ranked & Deduplicated Results"]
    
    CheckCache -- "NO (Cache Miss)" --> ParallelSearch["Query 11 Sources Concurrently (Promise.allSettled)"]
    
    ParallelSearch --> S1["Unstop India API"]
    ParallelSearch --> S2["Wellfound Live Startups"]
    ParallelSearch --> S3["Company Career Feeds"]
    ParallelSearch --> S4["AICTE Govt Portal"]
    ParallelSearch --> S5["Indeed / Foundit / Naukri"]
    ParallelSearch --> S6["Greenhouse / Lever ATS"]
    
    S1 & S2 & S3 & S4 & S5 & S6 --> Normalizer["Normalize (Mode, Stipend, Text, Skills)"]
    Normalizer --> Deduplicator["Deduplicate by (Company, Title) & Authority"]
    Deduplicator --> Ranking["Multi-Factor Scoring (Profile Fit + Memory Boost)"]
    Ranking --> SaveCache["Persist to Cache (TTL 10m)"]
    SaveCache --> RankedFeed
    
    RankedFeed --> FilterCockpit["Interactive Frontend Filter Cockpit\n(Filter by Source, Domain, Mode, Min Stipend)"]
```

---

### 2. Autonomous Browser Apply Workflow

```mermaid
flowchart TD
    Start["User Clicks 'Apply with Scoutly'"] --> LaunchBrowser["Launch Persistent Chromium (data/browser-user-data)"]
    LaunchBrowser --> Navigate["Navigate to Internship Application URL"]
    Navigate --> Inspect["Inspect DOM (form-detector.ts)"]
    
    Inspect --> LandingCheck{"Landing Page with\n'Apply' Button?"}
    LandingCheck -- YES --> ClickApply["Click 'Apply / Register' Button & Wait for Modal"]
    ClickApply --> InspectAgain["Re-Inspect Modal Form Fields"]
    LandingCheck -- NO --> InspectAgain
    
    InspectAgain --> AuthCheck{"Login Wall or\nCAPTCHA Required?"}
    AuthCheck -- "Login Wall" --> PauseAuth["Pause & Display Cockpit Banner:\n'🔐 I've Logged In — Fast Apply 🚀'"]
    PauseAuth --> UserLogin["User Logs In Once in Chromium"]
    UserLogin --> ResumeAuth["Click 'Fast Apply' & Resume"]
    
    AuthCheck -- "No Auth Wall / Logged In" --> MapFields["Semantic Profile Mapping (field-mapper.ts)"]
    ResumeAuth --> MapFields
    
    MapFields --> FillForm["Autofill Inputs & Attach Resume/Yash_Harfode_Resume.pdf"]
    FillForm --> AISynthesis["Synthesize Grounded AI Answers for Questions"]
    AISynthesis --> CockpitReview["Human-in-the-Loop Cockpit Review\n(User can edit any text in real-time)"]
    
    CockpitReview --> UserApprove["User Clicks 'Approve & Submit Application'"]
    UserApprove --> SafeSubmit["Click Genuine Submit Button (Exclude Nav/Header)"]
    SafeSubmit --> Verify["Scan for Confirmation Signals & Reference ID (SCOUTLY-XXXXXX)"]
    Verify --> Confirmed["🎉 Submission Confirmed & Recorded in Tracker"]
```

---

## 💻 Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend UI** | **React 18, TypeScript, Vite, TailwindCSS** | High-performance dashboard with instant local state editing, interactive filter pills, and live telemetry |
| **Icons & Design** | **Lucide-React, DM Mono, Plus Jakarta Sans** | Modern aesthetic with emerald/forest palette, badges, and responsive layouts |
| **Backend Engine** | **Node.js, Express, TypeScript (TSX)** | RESTful API server with source adapters, session managers, and profile storage |
| **Browser Automation**| **Playwright (Chromium Headed)** | Persistent context, native event dispatches, multi-tab listeners, and file upload handlers |
| **AI Synthesis** | **OpenRouter / OpenAI Compatible API** | Grounded answer generation strictly aligned with student experience and projects |
| **Persistence** | **Local JSON Filesystem** | `student-profile.json`, `agent-memory.json`, `discovery-cache.json`, `browser-user-data/` |
| **Testing** | **TSX Automated Test Suites** | 18/18 discovery engine tests & 8-checkpoint verified Playwright E2E browser tests |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** installed
- **npm** package manager

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yashharfode/Scoutly.git
cd Scoutly

# Install root, backend, and frontend packages
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: Add your OpenRouter API key to `.env` for customized AI answer synthesis).*

### 3. Launch Development Servers
Run both backend and frontend concurrently:
```bash
# Terminal 1: Backend API (Port 3000)
npm run dev --prefix backend

# Terminal 2: Frontend Client (Port 5173)
npm run dev --prefix frontend
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🎯 Judge Demo Mode

Scoutly includes a **1-Click Judge Demo Mode** specifically built for hackathon presentations:

```bash
# In the Web App:
1. Click the glowing "🎯 Judge Demo Mode" button in the Topbar or "⚡ 1-Click Fast Judge Demo" on Discover.
2. Select any demo internship (e.g. RxGPT Health, Gravity AI, or SecureStack Sandbox).
3. Click "Launch Demo in Real Chromium".
4. Watch real Chromium open on your desktop, auto-detect 9 fields, attach Yash's resume PDF, fill the form, synthesize AI answers, and submit with verified Reference ID!
```

---

## 🧪 Automated Test Verification

Run the built-in automated test suites:

```bash
# Run Discovery Engine tests (18 test cases)
cd backend && ./node_modules/.bin/tsx src/tests/discovery.test.ts

# Run Verified Playwright End-to-End browser test (8 checkpoints)
cd backend && ./node_modules/.bin/tsx src/tests/verified-e2e.test.ts
```

---

## 🔒 Privacy, Safety & Ethical Principles

1. **Local-First & Transparent**: All student profile data and browser session credentials stay stored locally on the user's machine.
2. **Never Submit Without Human Approval**: Scoutly autofills and prepares fields, but the final submission requires explicit student confirmation.
3. **Anti-Hallucination AI**: AI answers are strictly grounded in verified student profile details; fake credentials, degrees, or certifications are never fabricated.
4. **Public Scraping Integrity**: Discovers opportunities only from publicly accessible feeds without bypassing paywalls or unauthorized private endpoints.

---

<div align="center">
  <b>Built for Students by Yash Harfode & Harsh Sahu</b><br>
  <i>Empowering students to discover, match, and apply to dream internships autonomously.</i>
</div>
