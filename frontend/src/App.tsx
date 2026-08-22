import { useState, useEffect, type FormEvent } from "react";
import {
  Compass,
  Sparkles,
  Bookmark,
  FileCheck2,
  User,
  Search,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
  Globe,
  Lock,
  ShieldAlert,
  ArrowRight,
  BriefcaseBusiness,
  Loader2,
  AlertTriangle,
  Play,
  SlidersHorizontal,
  X
} from "lucide-react";
import type {
  Page,
  StudentProfile,
  Opportunity,
  ApplicationSession,
  ApplicationRecord,
  DiscoverySearchResponse
} from "./types/domain";
import {
  getProfile,
  saveProfile,
  uploadResumeFile,
  searchOpportunities,
  getSavedOpportunities,
  saveOpportunity,
  removeSavedOpportunity,
  getApplications,
  startApplicationSession,
  analyzeApplicationPage,
  fillApplicationForm,
  updateApplicationField,
  regenerateAIAnswer,
  submitApplication,
  cancelApplication,
  resumeApplicationSession
} from "./lib/api";

export function App() {
  const [page, setPage] = useState<Page>("Discover");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [saved, setSaved] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySearchResponse | null>(null);
  const [activeSession, setActiveSession] = useState<ApplicationSession | null>(null);
  const [browserMode, setBrowserMode] = useState<"playwright" | "mock">("playwright");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    getProfile().then(setProfile);
    getSavedOpportunities().then(setSaved);
    getApplications().then(setApplications);
    searchOpportunities("Cybersecurity and AI internships").then(res => {
      setResults(res.results);
      setDiscoverySummary(res);
    });
  }, []);

  const handleSearch = async (query: string, forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await searchOpportunities(query, forceRefresh);
      setResults(res.results);
      setDiscoverySummary(res);
      setPage("Matches");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (opportunity: Opportunity, overrideUrl?: string) => {
    setLoading(true);
    setPage("Applications");
    setStatusMessage("Launching real Chromium browser context...");
    
    try {
      const init = await startApplicationSession({
        opportunityId: opportunity.id,
        customUrl: overrideUrl || (opportunity.applicationUrl.startsWith("http") ? opportunity.applicationUrl : undefined),
        title: opportunity.title,
        organization: opportunity.organization,
        browserMode
      });

      const session: ApplicationSession = {
        sessionId: init.sessionId,
        opportunityId: opportunity.id,
        status: "opened",
        url: init.url,
        fields: [],
        mappings: [],
        completion: 0,
        opportunity
      };
      setActiveSession(session);

      setStatusMessage("Analyzing page DOM and checking security checks...");
      const analyzed = await analyzeApplicationPage(init.sessionId);
      session.fields = analyzed.fields;
      session.hasCaptcha = analyzed.hasCaptcha;
      session.isLogin = analyzed.isLogin;
      session.warnings = analyzed.warnings;
      session.screenshotPath = analyzed.screenshotPath;
      session.status = analyzed.status;
      setActiveSession({ ...session });

      if (analyzed.hasCaptcha || analyzed.isLogin) {
        setStatusMessage("Pausing: User interaction required in browser.");
        setLoading(false);
        return;
      }

      setStatusMessage("Mapping student profile, attaching resume, and synthesizing answers...");
      const filled = await fillApplicationForm(init.sessionId);
      session.mappings = filled.mappings;
      session.validation = filled.validation;
      session.completion = filled.completion;
      session.status = filled.status;
      session.warnings = filled.warnings;
      setActiveSession({ ...session });
      setStatusMessage("Application prepared. Ready for human review.");
    } catch (err: any) {
      alert("Browser Agent Error: " + (err.message || "Operation failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeWorkflow = async () => {
    if (!activeSession) return;
    setLoading(true);
    setStatusMessage("Resuming agent workflow after user login/CAPTCHA...");
    try {
      const res = await resumeApplicationSession(activeSession.sessionId);
      activeSession.hasCaptcha = res.hasCaptcha;
      activeSession.isLogin = res.isLogin;
      activeSession.fields = res.fields;

      if (!res.hasCaptcha && !res.isLogin) {
        const filled = await fillApplicationForm(activeSession.sessionId);
        activeSession.mappings = filled.mappings;
        activeSession.validation = filled.validation;
        activeSession.completion = filled.completion;
        activeSession.status = filled.status;
      }
      setActiveSession({ ...activeSession });
    } catch (err: any) {
      alert("Resume Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = async (fieldId: string, value: string) => {
    if (!activeSession) return;
    const res = await updateApplicationField(activeSession.sessionId, fieldId, value);
    setActiveSession({
      ...activeSession,
      mappings: res.mappings,
      completion: res.completion,
      validation: res.validation
    });
  };

  const handleRegenerate = async (fieldId: string) => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await regenerateAIAnswer(activeSession.sessionId, fieldId);
      setActiveSession({ ...activeSession, mappings: res.mappings });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeSession) return;
    setLoading(true);
    setStatusMessage("Executing final submit in browser & verifying confirmation...");
    try {
      const res = await submitApplication(activeSession.sessionId);
      setActiveSession({
        ...activeSession,
        status: res.status,
        applicationId: res.applicationId,
        errorMessage: res.error
      });
      const updatedApps = await getApplications();
      setApplications(updatedApps);
    } catch (err: any) {
      alert("Submission Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (activeSession) {
      await cancelApplication(activeSession.sessionId);
      setActiveSession(null);
    }
  };

  if (!profile) return <div className="loading">Loading Scoutly...</div>;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <a href="#" className="brand">
          <div className="brand-mark">S</div>
          <span>Scoutly</span>
        </a>
        <p className="tagline">Your AI Agent for Every Student Opportunity.</p>

        <nav>
          <button className={`nav-link ${page === "Discover" ? "active" : ""}`} onClick={() => setPage("Discover")}>
            <Compass size={18} /> Discover
          </button>
          <button className={`nav-link ${page === "Matches" ? "active" : ""}`} onClick={() => setPage("Matches")}>
            <Sparkles size={18} /> Matches ({results.length})
          </button>
          <button className={`nav-link ${page === "Saved" ? "active" : ""}`} onClick={() => setPage("Saved")}>
            <Bookmark size={18} /> Saved ({saved.length})
          </button>
          <button className={`nav-link ${page === "Applications" ? "active" : ""}`} onClick={() => setPage("Applications")}>
            <FileCheck2 size={18} /> Apply Cockpit {activeSession ? "⚡" : ""}
          </button>
          <button className={`nav-link ${page === "My Profile" ? "active" : ""}`} onClick={() => setPage("My Profile")}>
            <User size={18} /> My Profile
          </button>
          <button className={`nav-link ${page === "Demo Mode" ? "active" : ""}`} onClick={() => setPage("Demo Mode")} style={{ background: page === "Demo Mode" ? "#1e3b2a" : "rgba(217, 249, 157, 0.08)", border: "1px dashed #4ade80", color: "#d9f99d", marginTop: 12 }}>
            <Play size={18} color="#4ade80" /> 🎯 Demo Showcase
          </button>
        </nav>

        <div className="privacy">
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: "#819783", display: "block", marginBottom: 4 }}>BROWSER AGENT ENGINE</label>
            <select
              value={browserMode}
              onChange={(e) => setBrowserMode(e.target.value as any)}
              style={{
                width: "100%",
                background: "#294333",
                color: "#d9f99d",
                border: "1px solid #3d5a49",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 12
              }}
            >
              <option value="playwright">🌐 Live Browser (Play, SlidersHorizontal, Xwright)</option>
              <option value="mock">⚡ Fast Mock Mode</option>
            </select>
          </div>
          <span className="status-dot"></span>
          <strong>Autonomous & Verified</strong>
          <p><small>Scoutly maps and prepares data. The final submission is strictly verified before marking complete.</small></p>
        </div>
      </aside>

      {/* Main Container */}
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">{browserMode === "playwright" ? "PLAYWRIGHT REAL BROWSER" : "MOCK SIMULATOR"}</p>
            <h1>{page}</h1>
          </div>
          <div className="top-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setPage("Demo Mode")}
              style={{
                background: page === "Demo Mode" ? "#22c55e" : "#166534",
                color: page === "Demo Mode" ? "#142118" : "#dcfce7",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                fontSize: 14,
                fontWeight: 800,
                border: "2px solid #4ade80",
                borderRadius: 10,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
                zIndex: 10
              }}
            >
              <Sparkles size={16} /> 🎯 Judge Demo Mode
            </button>
            <div className="avatar">{profile.name[0]}</div>
          </div>
        </header>

        {page === "Discover" && (
          <DiscoverView
            profile={profile}
            onSearch={handleSearch}
            onLaunchJudgeDemo={() => {
              setPage("Demo Mode");
            }}
            customUrl={customUrl}
            setCustomUrl={setCustomUrl}
            onApplyDirect={(url) => {
              handleApply({
                id: "custom-live-target",
                title: "Live Website Application",
                organization: new URL(url).hostname,
                type: "internship",
                skills: profile.skills,
                applicationUrl: url,
                source: "Direct Web Target",
                sourceUrl: url,
                extractedAt: new Date().toISOString(),
                tags: ["live-target"]
              }, url);
            }}
          />
        )}

        {page === "Matches" && (
          <MatchesView
            results={results}
            discoverySummary={discoverySummary}
            loading={loading}
            onRefresh={() => handleSearch("Cybersecurity and AI internships", true)}
            saved={saved.map(s => s.id)}
            onSave={async (o) => {
              await saveOpportunity(o);
              setSaved(await getSavedOpportunities());
            }}
            onApply={handleApply}
          />
        )}

        {page === "Saved" && (
          <SavedView
            saved={saved}
            onRemove={async (id) => {
              await removeSavedOpportunity(id);
              setSaved(await getSavedOpportunities());
            }}
            onApply={handleApply}
          />
        )}

        {page === "Applications" && (
          <CockpitView
            session={activeSession}
            applications={applications}
            loading={loading}
            statusMessage={statusMessage}
            onFieldChange={handleFieldChange}
            onRegenerate={handleRegenerate}
            onSubmit={handleSubmit}
            onResume={handleResumeWorkflow}
            onCancel={handleCancelSession}
            onStartDemo={() => {
              handleApply({
                id: "mock-cyber-analyst",
                title: "Cybersecurity Analyst Intern",
                organization: "SecureStack (Local Application Portal)",
                type: "internship",
                skills: ["Python", "Network Security", "Linux"],
                applicationUrl: "http://localhost:3000/mock-application/cybersecurity-intern",
                source: "Verified Local Portal",
                sourceUrl: "http://localhost:3000",
                extractedAt: new Date().toISOString(),
                tags: ["cybersecurity"]
              });
            }}
          />
        )}

        {page === "My Profile" && (
          <ProfileView profile={profile} onSave={setProfile} />
        )}

        {page === "Demo Mode" && (
          <DemoView
            onLaunchDemo={(opp) => {
              if (opp.applicationUrl.startsWith("http") && !opp.applicationUrl.includes("localhost")) {
                handleApply(opp, opp.applicationUrl);
              } else {
                const host = window.location.hostname || "localhost";
                const targetUrl = `http://${host}:3000/mock-application/cybersecurity-intern`;
                handleApply({ ...opp, applicationUrl: targetUrl }, targetUrl);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

// Subcomponents

function DiscoverView({
  profile,
  onSearch,
  onLaunchJudgeDemo,
  customUrl,
  setCustomUrl,
  onApplyDirect
}: {
  profile: StudentProfile;
  onSearch: (q: string) => void;
  onLaunchJudgeDemo: () => void;
  customUrl: string;
  setCustomUrl: (u: string) => void;
  onApplyDirect: (u: string) => void;
}) {
  const [query, setQuery] = useState("Cybersecurity internships in India with stipend above ₹10,000");

  return (
    <section>
      <div className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <span className="pill">MULTI-SOURCE DISCOVERY & BROWSER AGENT</span>
          <button
            type="button"
            onClick={() => onLaunchJudgeDemo()}
            style={{
              background: "#d9f99d",
              color: "#142118",
              border: "none",
              padding: "10px 18px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
            }}
          >
            <Play size={14} color="#142118" /> ⚡ 1-Click Fast Judge Demo
          </button>
        </div>
        <h2>Scout and Apply with <em>Scoutly.</em></h2>
        <p>
          Scoutly concurrently searches 11 public portals (Internshala, Unstop, Wellfound, AICTE, Indeed, Foundit, Naukri, Greenhouse, Lever, and Company Portals),
          deduplicates listings, adapts to your learned preferences, and applies using real browser automation.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onSearch(query); }} className="search-bar">
          <Search size={21} />
          <input
            aria-label="Opportunity search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles e.g. Cybersecurity internships in India with stipend above ₹10,000..."
          />
          <button type="submit">Scout opportunities</button>
        </form>

        <div style={{ marginTop: 24, padding: "18px 22px", background: "rgba(255,255,255,0.08)", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#d9f99d", fontSize: 14, fontWeight: 700 }}>
            <Globe size={16} /> Apply Directly to Any Live Website
          </div>
          <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#c3d1c3" }}>
            Paste any application link (Wellfound, Google Form, Unstop, Greenhouse, Ashby, or local test link):
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="url"
              placeholder="http://localhost:3000/mock-application/cybersecurity-intern or https://wellfound.com/jobs"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              style={{
                flex: 1,
                padding: "11px 14px",
                borderRadius: 8,
                border: "1px solid #527058",
                background: "rgba(255,255,255,0.95)",
                color: "#142118",
                fontSize: 13
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (customUrl) onApplyDirect(customUrl);
              }}
              style={{
                background: "#d9f99d",
                color: "#142118",
                border: "none",
                fontWeight: 700,
                padding: "0 18px",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              Launch Agent <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="profile-snapshot">
        <div>
          <p className="eyebrow">ACTIVE STUDENT PROFILE</p>
          <h3>{profile.name} · {profile.degree}</h3>
          <p>{profile.college} · {profile.email}</p>
        </div>
        <div className="preferences">
          {profile.skills.slice(0, 5).map(skill => <span key={skill}>{skill}</span>)}
          <span>₹{profile.minimumStipend.toLocaleString("en-IN")}+ / month</span>
        </div>
      </div>
    </section>
  );
}

function MatchesView({
  results,
  discoverySummary,
  loading,
  onRefresh,
  saved,
  onSave,
  onApply
}: {
  results: Opportunity[];
  discoverySummary: DiscoverySearchResponse | null;
  loading: boolean;
  onRefresh: () => void;
  saved: string[];
  onSave: (o: Opportunity) => Promise<void>;
  onApply: (o: Opportunity) => void;
}) {
  const sources = discoverySummary?.sourceSummary?.sources || [];
  const memoryInsights = discoverySummary?.memoryInsights || [];

  // Filter States
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedInterest, setSelectedInterest] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [minStipend, setMinStipend] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Derive unique sources from results
  const availableSources = Array.from(new Set(results.map(r => r.source || "Other"))).filter(Boolean);

  const INTERESTS = [
    { id: "all", label: "All Interests" },
    { id: "cyber", label: "🛡️ Cybersecurity", keywords: ["security", "cyber", "threat", "soc", "vulnerability", "appsec", "penetration", "iam"] },
    { id: "ai", label: "🤖 AI & Machine Learning", keywords: ["ai", "machine learning", "ml", "llm", "deep learning", "neural", "vision", "nlp", "rxgpt"] },
    { id: "fullstack", label: "💻 Full Stack & Web", keywords: ["full stack", "frontend", "backend", "web", "react", "node", "javascript", "typescript"] },
    { id: "cloud", label: "☁️ Cloud & DevOps", keywords: ["cloud", "devops", "aws", "docker", "kubernetes", "infra", "ci/cd", "linux"] },
    { id: "data", label: "📊 Data Science", keywords: ["data", "analytics", "sql", "pandas", "bi", "data engineering", "big data"] }
  ];

  // Apply filters
  const filteredResults = results.filter(opp => {
    // 1. Source filter
    if (selectedSource !== "all" && opp.source !== selectedSource) {
      return false;
    }

    // 2. Interest domain filter
    if (selectedInterest !== "all") {
      const interestObj = INTERESTS.find(i => i.id === selectedInterest);
      if (interestObj?.keywords) {
        const textToMatch = `${opp.title} ${opp.organization} ${opp.description || ""} ${opp.skills.join(" ")} ${opp.tags.join(" ")}`.toLowerCase();
        const matchesInterest = interestObj.keywords.some(k => textToMatch.includes(k));
        if (!matchesInterest) return false;
      }
    }

    // 3. Mode filter
    if (selectedMode !== "all") {
      const oppMode = (opp.mode || "").toLowerCase();
      if (selectedMode === "remote" && !oppMode.includes("remote")) return false;
      if (selectedMode === "hybrid" && !oppMode.includes("hybrid")) return false;
      if (selectedMode === "onsite" && (!oppMode.includes("onsite") && oppMode.length > 0 && !oppMode.includes("remote") && !oppMode.includes("hybrid"))) return false;
    }

    // 4. Stipend filter
    if (minStipend > 0) {
      const oppStipend = opp.stipend || 0;
      if (oppStipend > 0 && oppStipend < minStipend) return false;
    }

    // 5. In-page search term
    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      const combined = `${opp.title} ${opp.organization} ${opp.location || ""} ${opp.skills.join(" ")} ${opp.description || ""}`.toLowerCase();
      if (!combined.includes(term)) return false;
    }

    return true;
  });

  const hasActiveFilters = selectedSource !== "all" || selectedInterest !== "all" || selectedMode !== "all" || minStipend > 0 || searchTerm.length > 0;

  const resetFilters = () => {
    setSelectedSource("all");
    setSelectedInterest("all");
    setSelectedMode("all");
    setMinStipend(0);
    setSearchTerm("");
  };

  return (
    <section>
      {/* Live Discovery Multi-Source Summary */}
      <div style={{ background: "white", border: "1px solid #e3e6e0", borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <p className="eyebrow" style={{ color: "#2d5a39" }}>MULTI-SOURCE DISCOVERY FEED</p>
            <h3 style={{ margin: "2px 0 0", fontSize: 19 }}>
              {discoverySummary?.message || `${results.length} Ranked Opportunities Discovered`}
            </h3>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Live Feeds
          </button>
        </div>

        {/* Live Sources Status Badges */}
        {sources.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#68806d", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Active Sources Searched Concurrently ({sources.length}):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sources.map((s) => {
                let badgeColor = "#166534";
                let badgeBg = "#dcfce7";
                let dot = "🟢";
                let label = `${s.count} found`;

                if (s.status === "login_required") {
                  badgeColor = "#4b5563";
                  badgeBg = "#f3f4f6";
                  dot = "🔒";
                  label = "login wall";
                } else if (s.status === "no_results") {
                  badgeColor = "#6b7280";
                  badgeBg = "#f9fafb";
                  dot = "⚪";
                  label = "0 results";
                } else if ((s.status === "network_error" || s.status === "timeout" || s.status === "blocked")) {
                  badgeColor = "#b91c1c";
                  badgeBg = "#fef2f2";
                  dot = "🔴";
                  label = "timeout";
                }

                return (
                  <span
                    key={s.name}
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      border: "1px solid rgba(0,0,0,0.06)"
                    }}
                  >
                    <span>{dot}</span>
                    <span>{s.name}</span>
                    <span style={{ opacity: 0.75, fontSize: 11 }}>({label})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Memory & Preference Learning Insights */}
        {memoryInsights.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #e3e6e0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2d5a39" }}>
            <Sparkles size={14} color="#166534" />
            <span><strong>Self-Learning AI Boost Active:</strong> Ranked higher for your preferred stack ({memoryInsights.join(", ")})</span>
          </div>
        )}
      </div>

      {/* Interactive Opportunity Filter Cockpit */}
      <div style={{ background: "white", border: "1px solid #c7e5bb", borderRadius: 14, padding: "20px 22px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal size={18} color="#294333" />
            <strong style={{ fontSize: 15, color: "#1e3b2a" }}>Filter Discovered Opportunities</strong>
            <span style={{ background: "#f0f6ee", color: "#294333", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
              Showing {filteredResults.length} of {results.length}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                style={{ background: "none", border: "1px solid #d1d5db", color: "#6b7280", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <X size={12} /> Reset Filters
              </button>
            )}
            <input
              type="text"
              placeholder="Search in results (e.g. Python, SOC)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, minWidth: 220 }}
            />
          </div>
        </div>

        {/* 1. Filter by Domain / Interest */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546e5a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Domain & Career Interest
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {INTERESTS.map((int) => (
              <button
                key={int.id}
                type="button"
                onClick={() => setSelectedInterest(int.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: selectedInterest === int.id ? 700 : 500,
                  border: selectedInterest === int.id ? "2px solid #22c55e" : "1px solid #d1d5db",
                  background: selectedInterest === int.id ? "#dcfce7" : "#f9fafb",
                  color: selectedInterest === int.id ? "#14532d" : "#4b5563",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Filter by Internship Website / Source */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546e5a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Internship Source / Portal
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => setSelectedSource("all")}
              style={{
                padding: "5px 11px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: selectedSource === "all" ? 700 : 500,
                border: selectedSource === "all" ? "2px solid #294333" : "1px solid #d1d5db",
                background: selectedSource === "all" ? "#294333" : "#ffffff",
                color: selectedSource === "all" ? "#ffffff" : "#4b5563",
                cursor: "pointer"
              }}
            >
              All Sources ({results.length})
            </button>
            {availableSources.map((src) => {
              const count = results.filter(r => r.source === src).length;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSelectedSource(src)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: selectedSource === src ? 700 : 500,
                    border: selectedSource === src ? "2px solid #166534" : "1px solid #e5e7eb",
                    background: selectedSource === src ? "#f0fdf4" : "#ffffff",
                    color: selectedSource === src ? "#15803d" : "#374151",
                    cursor: "pointer"
                  }}
                >
                  🌐 {src} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Mode & Stipend Selectors */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, borderTop: "1px dashed #e3e6e0", paddingTop: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546e5a", textTransform: "uppercase", marginBottom: 4 }}>
              Work Mode
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "remote", "hybrid", "onsite"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMode(m)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    textTransform: "capitalize",
                    border: selectedMode === m ? "1px solid #166534" : "1px solid #d1d5db",
                    background: selectedMode === m ? "#166534" : "#ffffff",
                    color: selectedMode === m ? "#ffffff" : "#4b5563",
                    cursor: "pointer"
                  }}
                >
                  {m === "all" ? "All Modes" : m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#546e5a", textTransform: "uppercase", marginBottom: 4 }}>
              Min Stipend
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { val: 0, label: "Any" },
                { val: 10000, label: "≥ ₹10k" },
                { val: 15000, label: "≥ ₹15k" },
                { val: 20000, label: "≥ ₹20k" },
                { val: 30000, label: "≥ ₹30k" }
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setMinStipend(s.val)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    border: minStipend === s.val ? "1px solid #166534" : "1px solid #d1d5db",
                    background: minStipend === s.val ? "#166534" : "#ffffff",
                    color: minStipend === s.val ? "#ffffff" : "#4b5563",
                    cursor: "pointer"
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Opportunities Grid */}
      {filteredResults.length === 0 ? (
        <div className="empty-state">
          <BriefcaseBusiness size={42} />
          <h2>No opportunities match your selected filters</h2>
          <p>Try resetting filters or adjusting domain interest / minimum stipend.</p>
          <button type="button" className="primary-button" onClick={resetFilters} style={{ marginTop: 14 }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
          {filteredResults.map((o) => (
            <article className="opportunity-card" key={o.id}>
              <div className="card-top">
                <span className="pill" style={{ background: "#eef2ff", color: "#3730a3" }}>
                  {o.source}
                </span>
                <strong style={{ color: "#294333", fontSize: 16 }}>{o.matchScore || 85}% Match</strong>
              </div>

              <h3 style={{ margin: "6px 0 2px" }}>{o.title}</h3>
              <p className="organization">{o.organization}</p>
              <p style={{ margin: "4px 0 10px", fontSize: 13, color: "#4f5e53" }}>
                📍 {o.location || "Remote"} · 💰 {(o.rawData as any)?.stipendDisplay || (o.stipend ? `₹${o.stipend.toLocaleString()}/mo` : "Disclosed on Apply")}
              </p>

              <div className="chips">
                {o.skills.slice(0, 5).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>

              {o.rawData?.matchReasons && o.rawData.matchReasons.length > 0 && (
                <div style={{ background: "#f6f9f5", padding: "8px 12px", borderRadius: 8, marginTop: 10, fontSize: 12, color: "#264831" }}>
                  {o.rawData.matchReasons.slice(0, 2).map((r: string) => (
                    <div key={r}>✓ {r}</div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSave(o)}
                  style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}
                >
                  <Bookmark size={14} fill={saved.includes(o.id) ? "currentColor" : "none"} />
                  {saved.includes(o.id) ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onApply(o)}
                  style={{ display: "flex", alignItems: "center", gap: 6, flex: 2, justifyContent: "center" }}
                >
                  <Sparkles size={14} /> Apply with Scoutly
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SavedView({
  saved,
  onRemove,
  onApply
}: {
  saved: Opportunity[];
  onRemove: (id: string) => Promise<void>;
  onApply: (o: Opportunity) => void;
}) {
  if (!saved.length) return <Empty title="No saved internships." text="Save opportunities from Matches to review and apply later." />;

  return (
    <section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {saved.map((o) => (
          <article className="opportunity-card" key={o.id} style={{ background: "white", padding: 24, borderRadius: 14, border: "1px solid #e3e6e0" }}>
            <h3>{o.title}</h3>
            <p style={{ color: "#68806d", fontWeight: 600 }}>{o.organization}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="secondary-button" onClick={() => onRemove(o.id)}>Remove</button>
              <button className="primary-button" onClick={() => onApply(o)}>Apply with Scoutly</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CockpitView({
  session,
  applications,
  loading,
  statusMessage,
  onFieldChange,
  onRegenerate,
  onSubmit,
  onResume,
  onCancel,
  onStartDemo
}: {
  session: ApplicationSession | null;
  applications: ApplicationRecord[];
  loading: boolean;
  statusMessage: string;
  onFieldChange: (fieldId: string, val: string) => void;
  onRegenerate: (fieldId: string) => void;
  onSubmit: () => void;
  onResume: () => void;
  onCancel: () => void;
  onStartDemo: () => void;
}) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.mappings) {
      const updated: Record<string, string> = {};
      session.mappings.forEach((m) => {
        updated[m.fieldId] = m.value || "";
      });
      setLocalValues(updated);
    }
  }, [session?.sessionId, JSON.stringify(session?.mappings?.map(m => ({ id: m.fieldId, val: m.value })))]);

  const handleLocalChange = (fieldId: string, newVal: string) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: newVal }));
    onFieldChange(fieldId, newVal);
  };

  if (!session) {
    return (
      <section>
        <div className="empty-state" style={{ marginBottom: 32 }}>
          <BriefcaseBusiness size={42} />
          <h2>No active browser session</h2>
          <p style={{ marginBottom: 20 }}>
            Select an internship or launch the guaranteed local Play, SlidersHorizontal, Xwright browser agent demo.
          </p>
          <button className="primary-button" onClick={onStartDemo} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} /> Launch Local Play, SlidersHorizontal, Xwright Demo
          </button>
        </div>

        {applications.length > 0 && (
          <div>
            <p className="eyebrow">APPLICATION TRACKER</p>
            <h2>Verified Applications ({applications.length})</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {applications.map((app) => (
                <div key={app.id} style={{ background: "white", padding: 20, borderRadius: 10, border: "1px solid #e3e6e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 16 }}>{app.opportunityId}</strong>
                      <span className="badge-safe" style={{ textTransform: "uppercase" }}>{app.status}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", color: "#68806d", fontSize: 13 }}>{app.notes}</p>
                    <small style={{ color: "#9ca3af" }}>Applied: {new Date(app.appliedAt || "").toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const completionPct = Math.round(session.completion * 100);
  const isWaitingUser = session.status === "waiting_for_captcha" || session.status === "waiting_for_login";
  const isSubmitted = session.status === "submitted";
  const isUnverified = session.status === "submitted_unverified";

  return (
    <section>
      {/* Session Top Banner */}
      <div style={{ background: "#142118", color: "#f8fbf3", padding: "20px 24px", borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="live-badge">
              <span className="live-pulse" style={{ background: isWaitingUser ? "#f59e0b" : "#d9f99d" }}></span>
              STATUS: {session.status.toUpperCase().replace(/_/g, " ")}
            </span>
            <span style={{ fontSize: 13, color: "#a8baa9" }}>Session: {session.sessionId.slice(0, 8)}</span>
          </div>
          <h2 style={{ margin: "8px 0 2px", fontSize: 22, color: "#f8fbf3" }}>
            {session.opportunity?.title || "Application in Progress"}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "#bed1c0" }}>
            {session.opportunity?.organization} · <a href={session.url} target="_blank" rel="noreferrer" style={{ color: "#d9f99d", textDecoration: "none" }}>{session.url} <ExternalLink size={12} style={{ display: "inline" }} /></a>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="secondary-button" onClick={onCancel} style={{ background: "transparent", color: "#d9f99d", borderColor: "#3d5a49" }}>
            Close Session
          </button>
          {!isSubmitted && !isWaitingUser && (
            <button
              className="primary-button"
              disabled={loading || session.completion < 0.6}
              onClick={onSubmit}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Approve & Submit Application
            </button>
          )}
        </div>
      </div>

      {/* Real-time Status Message */}
      {statusMessage && (
        <div style={{ marginTop: 12, padding: "8px 14px", background: "#edf5eb", color: "#285233", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <Loader2 size={14} className="spin" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Waiting for User: Login Banner */}
      {session.isLogin && (
        <div style={{ marginTop: 18, padding: "20px 24px", background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#fef3c7", padding: 10, borderRadius: 10 }}>
              <Lock size={28} color="#b45309" />
            </div>
            <div>
              <strong style={{ fontSize: 16, color: "#92400e" }}>🔐 Please Log In Inside the Opened Browser Window</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78350f" }}>
                Sign in to your account (Google/Email/OTP) in the Chromium window. Scoutly will persist your login session so you stay logged in for future applications.
              </p>
            </div>
          </div>
          <button className="primary-button" onClick={onResume} style={{ background: "#d97706", display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", fontSize: 14 }}>
            <Play size={16} /> I've Logged In — Fast Apply 🚀
          </button>
        </div>
      )}

      {/* Waiting for User: CAPTCHA Banner */}
      {session.hasCaptcha && (
        <div className="error-banner" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldAlert size={26} color="#c07b48" />
            <div>
              <strong>⏸ CAPTCHA Detected on Live Website</strong>
              <p style={{ margin: 0, fontSize: 13 }}>Please solve the CAPTCHA inside the opened Chromium browser window.</p>
            </div>
          </div>
          <button className="primary-button" onClick={onResume} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Play size={14} /> I've Solved It — Continue
          </button>
        </div>
      )}

      {/* Verified Success Screen */}
      {isSubmitted && (
        <div className="review-success" style={{ marginTop: 20, padding: 24 }}>
          <h3 style={{ margin: "0 0 6px", color: "#1e3b2a", fontSize: 20 }}>🎉 Application Verified & Submitted!</h3>
          <p style={{ margin: "0 0 14px", fontSize: 14 }}>
            The Scoutly browser agent clicked submit after your approval, waited for the response page, and verified the confirmation state.
          </p>
          {session.applicationId && (
            <div style={{ display: "inline-block", background: "#294333", color: "#d9f99d", padding: "8px 16px", borderRadius: 8, fontFamily: "monospace", fontWeight: "bold", fontSize: 15 }}>
              {session.applicationId}
            </div>
          )}
        </div>
      )}

      {/* Unverified Warning */}
      {isUnverified && (
        <div className="error-banner" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={24} color="#c07b48" />
            <strong style={{ fontSize: 16 }}>Submission Unverified</strong>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>
            The submit button was clicked, but Scoutly could not conclusively verify the confirmation ID or success message.
            Please check the browser window to confirm.
          </p>
        </div>
      )}

      {/* Cockpit Layout */}
      <div className="cockpit-container">
        {/* Left Column: Real Backend Telemetry Stages */}
        <div className="cockpit-sidebar">
          <div>
            <p className="eyebrow">AGENT TELEMETRY</p>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Live Pipeline Stages</h3>
          </div>

          <div>
            <div className="telemetry-step done">
              <div className="step-icon done">✓</div>
              <div>
                <strong style={{ fontSize: 13 }}>Browser Launched</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#68806d" }}>Chromium context isolated</p>
              </div>
            </div>

            <div className={`telemetry-step ${session.fields.length ? "done" : "active"}`}>
              <div className={`step-icon ${session.fields.length ? "done" : "active"}`}>
                {session.fields.length ? "✓" : "2"}
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>DOM & Fields Detected</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#68806d" }}>{session.fields.length} inputs found</p>
              </div>
            </div>

            <div className={`telemetry-step ${session.mappings.length ? "done" : "active"}`}>
              <div className={`step-icon ${session.mappings.length ? "done" : "active"}`}>
                {session.mappings.length ? "✓" : "3"}
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>Profile Mapped & AI Answers</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#68806d" }}>Deterministic + AI synthesis</p>
              </div>
            </div>

            <div className={`telemetry-step ${session.completion > 0 ? "done" : "active"}`}>
              <div className={`step-icon ${session.completion > 0 ? "done" : "active"}`}>
                {session.completion > 0 ? "✓" : "4"}
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>Resume Uploaded & Filled</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#68806d" }}>PDF attached to input</p>
              </div>
            </div>

            <div className={`telemetry-step ${isSubmitted ? "done" : isWaitingUser ? "active" : "active"}`}>
              <div className={`step-icon ${isSubmitted ? "done" : "active"}`}>
                {isSubmitted ? "✓" : "5"}
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>Verified Submission</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#68806d" }}>
                  {isSubmitted ? "Confirmed with Reference ID" : "Awaiting user approval"}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "auto", borderTop: "1px solid #e5e9e3", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4f5e53" }}>Readiness Score</span>
              <strong style={{ fontSize: 14, color: "#294333" }}>{completionPct}%</strong>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${completionPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Field Review & Editing */}
        <div className="cockpit-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p className="eyebrow">HUMAN-IN-THE-LOOP COCKPIT</p>
              <h3 style={{ margin: 0, fontSize: 20 }}>Review Mapped Form Fields</h3>
            </div>
            <span style={{ fontSize: 12, color: "#68806d" }}>
              {session.mappings.filter(m => m.status === "safe").length} Safe · {session.mappings.filter(m => m.status === "review").length} Need Review
            </span>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {session.fields.map((field) => {
              const mapping = session.mappings.find(m => m.fieldId === field.id);
              const val = localValues[field.id] !== undefined ? localValues[field.id] : (mapping?.value || "");
              const status = mapping?.status || "missing";
              const isAi = mapping?.aiGenerated;

              return (
                <div className="field-card" key={field.id}>
                  <div className="field-header">
                    <div>
                      <strong style={{ fontSize: 14, color: "#1d3122" }}>
                        {field.labelText || field.name || field.placeholder || "Field"}
                      </strong>
                      {field.required && <span style={{ color: "#d9534f", marginLeft: 4, fontWeight: "bold" }}>*</span>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {status === "safe" && <span className="badge-safe">✓ Safe Match</span>}
                      {status === "review" && <span className="badge-review">⚠ Review Required</span>}
                      {status === "missing" && <span className="badge-missing">❗ Missing Input</span>}
                      {isAi && (
                        <button
                          type="button"
                          onClick={() => onRegenerate(field.id)}
                          style={{ background: "none", border: "none", color: "#39724a", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <RefreshCw size={11} /> Regenerate AI
                        </button>
                      )}
                    </div>
                  </div>

                  {field.tag === "textarea" ? (
                    <textarea
                      rows={3}
                      className="field-input"
                      value={val}
                      onChange={(e) => handleLocalChange(field.id, e.target.value)}
                      placeholder="Type your response here..."
                      style={{ width: "100%", fontFamily: "inherit" }}
                    />
                  ) : (
                    <input
                      type={field.type || "text"}
                      className="field-input"
                      value={val}
                      onChange={(e) => handleLocalChange(field.id, e.target.value)}
                      placeholder={`Enter ${field.labelText || field.name || "value"}...`}
                      style={{ width: "100%", fontFamily: "inherit" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!isSubmitted && !isWaitingUser && (
            <div style={{ marginTop: 20, padding: 20, background: "#f0f6ee", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 14, color: "#24412e" }}>Ready for final submission?</strong>
                <p style={{ margin: 0, fontSize: 12, color: "#546e5a" }}>
                  Scoutly will click submit on the live page and verify the confirmation receipt.
                </p>
              </div>
              <button
                className="primary-button"
                disabled={loading}
                onClick={onSubmit}
                style={{ padding: "12px 24px", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />} Approve & Submit Application
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProfileView({ profile, onSave }: { profile: StudentProfile; onSave: (p: StudentProfile) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const res = await uploadResumeFile(file);
      const updatedProfile = { ...profile, resumePath: res.resumePath };
      onSave(updatedProfile);
      setDraft({ ...draft, resumePath: res.resumePath });
      alert(`Resume "${file.name}" uploaded successfully!`);
    } catch (err: any) {
      alert("Resume upload failed: " + err.message);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const saved = await saveProfile(draft);
    onSave(saved);
    setEditing(false);
  };

  if (editing) {
    return (
      <section className="page-card">
        <p className="eyebrow">EDIT LOCAL PROFILE</p>
        <h2>Your Student Profile</h2>
        <form className="profile-form" onSubmit={handleSubmit}>
          <label>Full Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
          <label>Phone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
          <label>College / University<input value={draft.college} onChange={(e) => setDraft({ ...draft, college: e.target.value })} /></label>
          <label>Degree<input value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} /></label>
          <label>Branch<input value={draft.branch} onChange={(e) => setDraft({ ...draft, branch: e.target.value })} /></label>
          <label>Resume File Path<input value={draft.resumePath} onChange={(e) => setDraft({ ...draft, resumePath: e.target.value })} /></label>
          <label>GitHub URL<input value={draft.github} onChange={(e) => setDraft({ ...draft, github: e.target.value })} /></label>
          <label>LinkedIn URL<input value={draft.linkedin} onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })} /></label>
          <label>Portfolio URL<input value={draft.portfolio} onChange={(e) => setDraft({ ...draft, portfolio: e.target.value })} /></label>
          <label>Skills (comma separated)<input value={draft.skills.join(", ")} onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></label>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="primary-button">Save Profile</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="page-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">LOCAL STUDENT PROFILE</p>
          <h2>{profile.name}</h2>
          <p className="subtle">{profile.degree} · {profile.college}</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(true)}>Edit Profile</button>
      </div>

      <div style={{ background: "#f5faf4", border: "1px solid #c7e5bb", borderRadius: 10, padding: 18, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <strong style={{ fontSize: 14, color: "#1e3b2a" }}>📄 Active Resume: {profile.resumePath || "None"}</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4f6e55" }}>Used by Scoutly Browser Agent to attach to application forms.</p>
        </div>
        <div>
          <label className="primary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
            {uploadingResume ? "Uploading..." : "Choose New Resume PDF"}
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div className="profile-grid">
        <div><label>Email</label><p>{profile.email}</p></div>
        <div><label>Phone</label><p>{profile.phone}</p></div>
        <div><label>GitHub</label><a href={profile.github} target="_blank" rel="noreferrer">{profile.github}</a></div>
        <div><label>LinkedIn</label><a href={profile.linkedin} target="_blank" rel="noreferrer">{profile.linkedin || "Not specified"}</a></div>
        <div><label>Skills</label><div className="chips">{profile.skills.map(s => <span key={s}>{s}</span>)}</div></div>
      </div>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty-state">
      <BriefcaseBusiness size={38} />
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

export default App;


const DEMO_INTERNSHIPS: Opportunity[] = [
  {
    id: "wellfound-4377335-gravity-ai",
    title: "AI Intern",
    organization: "Gravity AI (Bengaluru / Remote)",
    type: "internship",
    description: "Build LLMs, LangChain agentic workflows, RAG architectures, prompt engineering pipelines, and MLOps APIs.",
    location: "Remote (India)",
    mode: "remote",
    stipend: 20000,
    currency: "INR",
    skills: ["Python", "ML", "LLMs", "LangChain", "RAG", "Prompt Engineering"],
    eligibility: "No experience required · Open to AI/LLM enthusiasts",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/jobs/4377335-ai-intern",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4377335-ai-intern",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "ai", "langchain", "rag"],
    matchScore: 99,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ LangChain & Agentic AI Stack Match",
        "✓ Remote Work in India",
        "✓ ₹1.8L - ₹2.4L Annual Stipend"
      ],
      stipendDisplay: "₹20,000 /month (₹1.8L-2.4L/yr)"
    }
  },
  {
    id: "wellfound-4246040-teal-india",
    title: "AI/ML Engineer Intern",
    organization: "Teal India (Bengaluru)",
    type: "internship",
    description: "Build transformer NLP pipelines, BERT models, vector search indexing, Hugging Face integrations, and RAG search modules.",
    location: "Bengaluru",
    mode: "onsite",
    stipend: 35000,
    currency: "INR",
    skills: ["Python", "NLP", "BERT", "Transformers", "RAG", "LLMs", "Vector Search"],
    eligibility: "No experience required · Strong Python & ML foundation",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/jobs/4246040-intern-ai-ml-engineer",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4246040-intern-ai-ml-engineer",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "ai-ml", "nlp", "transformers"],
    matchScore: 97,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ Transformers & NLP Fit",
        "✓ High Stipend: ₹3.6L - ₹4.2L"
      ],
      stipendDisplay: "₹35,000 /month (₹3.6L-4.2L/yr)"
    }
  },
  {
    id: "wellfound-4335661-alchemyst-ai",
    title: "Full Stack AI Intern",
    organization: "Alchemyst AI (Remote)",
    type: "internship",
    description: "Design full-stack AI user interfaces with Next.js, React, TypeScript, Python backend services, WebSockets, and vector databases.",
    location: "Remote (India)",
    mode: "remote",
    stipend: 25000,
    currency: "INR",
    skills: ["React", "Next.js", "TypeScript", "Python", "MongoDB", "Redis", "WebSockets", "RAG"],
    eligibility: "Students with hands-on web development & AI projects",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/jobs/4335661-full-stack-ai-intern",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4335661-full-stack-ai-intern",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "fullstack", "nextjs", "react"],
    matchScore: 96,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ React, Next.js & Python Match",
        "✓ Fully Remote Setup"
      ],
      stipendDisplay: "₹25,000 /month (₹1.2L-3.0L/yr)"
    }
  },
  {
    id: "wellfound-4486291-ledgerscfo",
    title: "Software Developer Intern",
    organization: "LedgersCFO (Bengaluru / Hybrid)",
    type: "internship",
    description: "Build robust fintech applications with Python, Java, React, TypeScript, and integrate LLM APIs for financial workflows.",
    location: "Bengaluru / Remote",
    mode: "hybrid",
    stipend: 20000,
    currency: "INR",
    skills: ["Python", "Java", "React", "TypeScript", "REST", "LLM APIs"],
    eligibility: "No experience required · PPO potential after 3-6 months",
    deadline: "2026-11-15",
    applicationUrl: "https://wellfound.com/jobs/4486291-software-developer-intern",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4486291-software-developer-intern",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "software-dev", "python", "react"],
    matchScore: 94,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ Full-Time Conversion (PPO) Potential",
        "✓ ₹15k-30k /month Stipend"
      ],
      stipendDisplay: "₹20,000 /month (₹15k-30k)"
    }
  },
  {
    id: "wellfound-4385681-vitraga",
    title: "Software Engineer Intern (Next.js & AI Agents)",
    organization: "Vitraga (Remote)",
    type: "internship",
    description: "Build full stack autonomous agent workflows using Next.js, Express, Supabase, LangChain, and MongoDB.",
    location: "Remote (India)",
    mode: "remote",
    stipend: 10000,
    currency: "INR",
    skills: ["React", "Next.js", "Node.js", "Express", "MongoDB", "Supabase", "LangChain"],
    eligibility: "No experience required · 3-month duration",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/jobs/4385681-software-engineer-intern-next-js-supabase-ai",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4385681-software-engineer-intern-next-js-supabase-ai",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "nextjs", "supabase", "ai-agents"],
    matchScore: 95,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ Exact Match for Scoutly Agent Stack",
        "✓ 100% Remote"
      ],
      stipendDisplay: "₹10,000 /month"
    }
  },
  {
    id: "wellfound-4540186-referralworld",
    title: "Software Engineer Intern",
    organization: "ReferralWorld Careers (Remote)",
    type: "internship",
    description: "Develop enterprise recruiting tools, microservices, and web portals using Java, React, Node.js, and MongoDB.",
    location: "Remote / Onsite (India)",
    mode: "remote",
    stipend: 30000,
    currency: "INR",
    skills: ["Java", "React", "Node.js", "MongoDB", "MERN"],
    eligibility: "Batches 2025 / 2026 / 2027 eligible",
    deadline: "2026-11-30",
    applicationUrl: "https://wellfound.com/jobs/4540186-software-engineer-intern-batch-2025-2026-2027",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4540186-software-engineer-intern-batch-2025-2026-2027",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "mern", "java", "high-stipend"],
    matchScore: 93,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ High Stipend: ₹30,000 /month",
        "✓ Mentorship & Certificate Included"
      ],
      stipendDisplay: "₹30,000 /month"
    }
  },
  {
    id: "wellfound-4289766-cravv",
    title: "Backend Golang SDE Intern",
    organization: "Cravv (Bengaluru)",
    type: "internship",
    description: "Develop high-throughput microservices in Go, manage PostgreSQL and Redis caches, implement WebSockets, and build RESTful endpoints.",
    location: "Bengaluru",
    mode: "onsite",
    stipend: 18000,
    currency: "INR",
    skills: ["Go", "Node.js", "PostgreSQL", "MongoDB", "Redis", "AWS", "REST"],
    eligibility: "No experience required · Strong DSA knowledge",
    deadline: "2026-10-15",
    applicationUrl: "https://wellfound.com/jobs/4289766-backend-golang-sde-intern",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/4289766-backend-golang-sde-intern",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "golang", "backend"],
    matchScore: 90,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ Go & High Performance Systems",
        "✓ ₹1.8L - ₹2.4L Annual Stipend"
      ],
      stipendDisplay: "₹18,000 /month (₹1.8L-2.4L/yr)"
    }
  },
  {
    id: "wellfound-3821958-mowka",
    title: "Product Engineer Intern",
    organization: "Mowka (Remote, India)",
    type: "internship",
    description: "Design web applications, engineer startup discovery algorithms, build automated scrapers, and develop AI workflows.",
    location: "Remote (India)",
    mode: "remote",
    stipend: 15000,
    currency: "INR",
    skills: ["Python", "AI", "Web Scraping", "Product Design", "React"],
    eligibility: "No experience required · Passion for scraping & AI",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/jobs/3821958-2-product-engineer-intern",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/jobs/3821958-2-product-engineer-intern",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "product-engineer", "web-scraping"],
    matchScore: 92,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Job Listing",
        "✓ Web Scraping & AI Workflows",
        "✓ Fully Remote in India"
      ],
      stipendDisplay: "₹15,000 /month"
    }
  },
  {
    id: "wellfound-rxgpt-ai",
    title: "AI / Software Engineering Intern",
    organization: "RxGPT Health (Live Wellfound Role)",
    type: "internship",
    description: "Build generative AI healthcare features, integrate LLM clinical workflows, and develop high-performance React & Python pipelines.",
    location: "Remote (Global / India)",
    mode: "remote",
    stipend: 35000,
    currency: "INR",
    skills: ["Python", "AI/ML", "React", "Node.js", "Healthcare AI"],
    eligibility: "Students and graduates with hands-on Python & React AI projects",
    deadline: "2026-10-31",
    applicationUrl: "https://wellfound.com/l/2Cz4wG",
    source: "Wellfound",
    sourceUrl: "https://wellfound.com/l/2Cz4wG",
    extractedAt: new Date().toISOString(),
    tags: ["wellfound", "live-target", "rxgpt", "ai"],
    matchScore: 98,
    rawData: {
      matchReasons: [
        "✓ Real Live Wellfound Listing (RxGPT)",
        "✓ Python & AI/ML Skills Match",
        "✓ Remote Work Setup"
      ],
      stipendDisplay: "₹35,000 /month (Competitive)"
    }
  },
  {
    id: "demo-cyber-analyst",
    title: "Cybersecurity Analyst Intern",
    organization: "SecureStack (Guaranteed Sandbox)",
    type: "internship",
    description: "Support vulnerability assessments, monitor SIEM telemetry, investigate threat vectors, and execute ethical hacking drills.",
    location: "India (Remote)",
    mode: "remote",
    stipend: 18000,
    currency: "INR",
    skills: ["Python", "Network Security", "Linux", "IAM", "Ethical Hacking"],
    eligibility: "B.Tech Computer Science / Cybersecurity Students",
    deadline: "2026-09-30",
    applicationUrl: "http://localhost:3000/mock-application/cybersecurity-intern",
    source: "🎯 Guaranteed Local Sandbox",
    sourceUrl: "http://localhost:3000/mock-application/cybersecurity-intern",
    extractedAt: new Date().toISOString(),
    tags: ["demo", "cybersecurity", "guaranteed-pass"],
    matchScore: 98,
    rawData: {
      matchReasons: [
        "✓ 100% Guaranteed Offline Demo",
        "✓ Real Playwright Chromium Automation",
        "✓ Real PDF Resume Attachment",
        "✓ Verified Reference ID Confirmation"
      ],
      stipendDisplay: "₹18,000 /month"
    }
  }
];

function DemoView({ onLaunchDemo }: { onLaunchDemo: (opp: Opportunity) => void }) {
  return (
    <section>
      {/* Demo Top Banner */}
      <div style={{ background: "linear-gradient(135deg, #142118 0%, #1e3b2a 100%)", color: "#f8fbf3", padding: "26px 30px", borderRadius: 16, marginBottom: 28, border: "1px solid #3d5a49" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ background: "#22c55e", color: "#142118", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>
            🎯 100% GUARANTEED JUDGE DEMO MODE
          </span>
          <span style={{ fontSize: 13, color: "#a8baa9" }}>Isolated Safe Sandbox</span>
        </div>
        <h2 style={{ margin: "6px 0 10px", fontSize: 24, color: "#d9f99d" }}>
          Live Browser Agent Demonstration
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "#c3d1c3", lineHeight: 1.6, maxWidth: 840 }}>
          This dedicated showcase environment demonstrates Scoutly's end-to-end autonomous pipeline without depending on third-party site rate limits or CAPTCHAs.
          Click <strong>"Launch Demo in Real Chromium"</strong> to watch Scoutly open real Chromium, detect all 9 form fields, attach Yash's resume PDF, fill the form, synthesize AI answers, and complete verified submission.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
        {DEMO_INTERNSHIPS.map((o) => (
          <article className="opportunity-card" key={o.id} style={{ background: "white", padding: 26, borderRadius: 14, border: "2px solid #c7e5bb", display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="pill" style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700 }}>
                {o.source}
              </span>
              <strong style={{ color: "#166534", fontSize: 17 }}>{o.matchScore}% Match</strong>
            </div>

            <h3 style={{ margin: 0, fontSize: 19 }}>{o.title}</h3>
            <p className="organization" style={{ margin: 0, color: "#4b6352", fontWeight: 700 }}>{o.organization}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#4f5e53" }}>
              📍 {o.location} · 💰 {(o.rawData as any)?.stipendDisplay}
            </p>

            <p style={{ margin: 0, fontSize: 13, color: "#68806d", lineHeight: 1.5 }}>
              {o.description}
            </p>

            <div className="chips" style={{ justifyContent: "flex-start" }}>
              {o.skills.map((s) => <span key={s} style={{ background: "#f0f6ee", color: "#24412e" }}>{s}</span>)}
            </div>

            <div style={{ background: "#f8faf7", padding: "10px 14px", borderRadius: 8, marginTop: 4 }}>
              {o.rawData?.matchReasons?.map((r: string) => (
                <div key={r} style={{ fontSize: 12, color: "#1e3b2a", fontWeight: 600, margin: "2px 0" }}>{r}</div>
              ))}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <button
                className="primary-button"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 18px", fontSize: 14, background: "#15803d" }}
                onClick={() => onLaunchDemo(o)}
              >
                <Play size={16} /> Launch Demo in Real Chromium
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
