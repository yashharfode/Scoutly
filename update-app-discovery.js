const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.tsx', 'utf8');

// Update imports
code = code.replace(
  'import type { Page, StudentProfile, Opportunity, ApplicationSession, ApplicationRecord } from "./types/domain";',
  'import type { Page, StudentProfile, Opportunity, ApplicationSession, ApplicationRecord, DiscoverySearchResponse, SourceSummary } from "./types/domain";'
);

// Add discoveryResponse state in App component
code = code.replace(
  'const [results, setResults] = useState<Opportunity[]>([]);',
  'const [results, setResults] = useState<Opportunity[]>([]);\n  const [discoverySummary, setDiscoverySummary] = useState<DiscoverySearchResponse | null>(null);'
);

// Update search handler
code = code.replace(
  'searchOpportunities("Cybersecurity and AI internships").then(res => setResults(res.results));',
  'searchOpportunities("Cybersecurity and AI internships").then(res => { setResults(res.results); setDiscoverySummary(res); });'
);

code = code.replace(
  `  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const res = await searchOpportunities(query);
      setResults(res.results);
      setPage("Matches");
    } finally {
      setLoading(false);
    }
  };`,
  `  const handleSearch = async (query: string, forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await searchOpportunities(query, forceRefresh);
      setResults(res.results);
      setDiscoverySummary(res);
      setPage("Matches");
    } finally {
      setLoading(false);
    }
  };`
);

// Update MatchesView call in main JSX
code = code.replace(
  `<MatchesView
            results={results}
            saved={saved.map(s => s.id)}
            onSave={async (o) => {
              await saveOpportunity(o);
              setSaved(await getSavedOpportunities());
            }}
            onApply={handleApply}
          />`,
  `<MatchesView
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
          />`
);

// Replace MatchesView component implementation
const newMatchesView = `function MatchesView({
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
            <p className="eyebrow" style={{ color: "#2d5a39" }}>MULTI-SOURCE AI DISCOVERY</p>
            <h3 style={{ margin: "2px 0 0", fontSize: 19 }}>
              {discoverySummary?.message || \`\${results.length} Ranked Opportunities Discovered\`}
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
                let label = \`\${s.count} found\`;

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
            const stipendStr = (o.rawData as any)?.stipendDisplay || (o.stipend ? \`₹\${o.stipend.toLocaleString("en-IN")}/month\` : "Stipend not disclosed");
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
}`;

code = code.replace(/function MatchesView\(\{[\s\S]*?\n\}/, newMatchesView);
fs.writeFileSync('frontend/src/App.tsx', code);
console.log('App.tsx updated with multi-source status display');
