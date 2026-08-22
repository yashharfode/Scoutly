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
  Play
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
              <option value="playwright">🌐 Live Browser (Playwright)</option>
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
          <div className="top-actions">
            <div className="avatar">{profile.name[0]}</div>
          </div>
        </header>

        {page === "Discover" && (
          <DiscoverView
            profile={profile}
            onSearch={handleSearch}
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
      </main>
    </div>
  );
}

// Subcomponents

function DiscoverView({
  profile,
  onSearch,
  customUrl,
  setCustomUrl,
  onApplyDirect
}: {
  profile: StudentProfile;
  onSearch: (q: string) => void;
  customUrl: string;
  setCustomUrl: (u: string) => void;
  onApplyDirect: (u: string) => void;
}) {
  const [query, setQuery] = useState("Cybersecurity internships in India with stipend above ₹10,000");

  return (
    <section>
      <div className="hero-card">
        <span className="pill">MULTI-SOURCE DISCOVERY & BROWSER AGENT</span>
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

  return (
    <section>
      {/* Live Discovery Multi-Source Summary */}
      <div style={{ background: "white", border: "1px solid #e3e6e0", borderRadius: 14, padding: 22, marginBottom: 24 }}>
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
                  dot = "⚪";
                  label = "login required";
                } else if (s.status === "captcha_required") {
                  badgeColor = "#92400e";
                  badgeBg = "#fef3c7";
                  dot = "🟡";
                  label = "captcha paused";
                } else if (s.status === "timeout") {
                  badgeColor = "#92400e";
                  badgeBg = "#fef3c7";
                  dot = "🟡";
                  label = "timed out";
                } else if (s.status === "no_results") {
                  badgeColor = "#4b5563";
                  badgeBg = "#f3f4f6";
                  dot = "⚪";
                  label = "0 found";
                }

                return (
                  <span
                    key={s.id}
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                      padding: "5px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <span>{dot}</span> {s.name} — <small style={{ fontWeight: "normal" }}>{label}</small>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Self-Learning Memory Insights */}
        {memoryInsights.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #e3e6e0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#365c40" }}>
            <Sparkles size={14} color="#294333" />
            <span><strong>Self-Learning Insights:</strong> {memoryInsights.join(" · ")}</span>
          </div>
        )}
      </div>

      {!results.length ? (
        <Empty title="No matching internships found." text="Try a broader query in Discover." />
      ) : (
        <div className="cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {results.map((o) => {
            const stipendStr = (o.rawData as any)?.stipendDisplay || (o.stipend ? `₹${o.stipend.toLocaleString("en-IN")}/month` : "Stipend not disclosed");
            return (
              <article className="opportunity-card" key={o.id} style={{ background: "white", padding: 24, borderRadius: 14, border: "1px solid #e3e6e0", display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="pill" style={{ background: "#e9efe8", color: "#24412e", fontSize: 11 }}>
                    {o.source}
                  </span>
                  <strong style={{ color: "#294333", fontSize: 16 }}>{o.matchScore}% Match</strong>
                </div>

                <h3 style={{ margin: 0, fontSize: 18 }}>{o.title}</h3>
                <p className="organization" style={{ margin: 0, color: "#68806d", fontWeight: 600 }}>{o.organization}</p>
                <p style={{ margin: 0, fontSize: 13, color: "#4f5e53" }}>
                  📍 {o.mode?.replace("_", " ") || "Remote"} · 💰 {stipendStr}
                </p>

                {o.description && (
                  <p style={{ margin: 0, fontSize: 12, color: "#68806d", lineHeight: 1.5 }}>
                    {o.description.slice(0, 140)}...
                  </p>
                )}

                <div className="chips" style={{ justifyContent: "flex-start" }}>
                  {o.skills.map((s) => <span key={s}>{s}</span>)}
                </div>

                <div className="why" style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                  {o.rawData?.matchReasons?.slice(0, 3).map((reason: string) => (
                    <span key={reason} style={{ fontSize: 11, color: "#285233" }}>{reason}</span>
                  ))}
                </div>

                <div style={{ marginTop: "auto", display: "flex", gap: 10, paddingTop: 14 }}>
                  <button
                    className="secondary-button"
                    style={{ flex: 1 }}
                    disabled={saved.includes(o.id)}
                    onClick={() => onSave(o)}
                  >
                    {saved.includes(o.id) ? "Saved" : "Save"}
                  </button>
                  <button
                    className="primary-button"
                    style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => onApply(o)}
                  >
                    <Sparkles size={16} /> Apply with Scoutly
                  </button>
                </div>
              </article>
            );
          })}
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
            Select an internship or launch the guaranteed local Playwright browser agent demo.
          </p>
          <button className="primary-button" onClick={onStartDemo} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} /> Launch Local Playwright Demo
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
