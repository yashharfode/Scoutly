import { useState, useEffect } from "react";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Database,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import type { MemorySummary } from "./types/domain";
import { getMemorySummary, getMemoryPlaybooks, getMemoryRuns } from "./lib/api";

export function ExperienceMemoryView() {
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>("playbook_localhost");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, pb, rn] = await Promise.all([
        getMemorySummary(),
        getMemoryPlaybooks(),
        getMemoryRuns()
      ]);
      setSummary(sum);
      setPlaybooks(pb);
      setRuns(rn);
    } catch (e) {
      console.error("Failed to load memory data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#22c55e", color: "white", padding: 8, borderRadius: 10, display: "flex" }}>
              <Brain size={24} />
            </div>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>PROCEDURAL AGENT KNOWLEDGE</p>
              <h1 style={{ margin: "2px 0 0", fontSize: 26, color: "#182a1e" }}>Application Experience Memory</h1>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 14, color: "#556b59", maxWidth: 840, lineHeight: 1.6 }}>
            Scoutly does not rely on stateless brute-force web scraping. As applications are completed and verified with human approval,
            the agent commits form structures, selector paths, and input strategies into a persistent 3-level playbook hierarchy.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="secondary-button"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", cursor: "pointer" }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh Memory
        </button>
      </div>

      {/* 5 High-Level Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            <span>Active Playbooks</span>
            <Database size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
            {summary?.totalPlaybooks ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "#10b981", marginTop: 4, fontWeight: 600 }}>
            Level 2: ATS & Domain
          </div>
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            <span>Verified Runs</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
            {summary?.totalVerifiedRuns ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            100% human-approved
          </div>
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            <span>Learned Field Mappings</span>
            <Layers size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
            {summary?.totalFieldMappings ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Across known ATS patterns
          </div>
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            <span>Question Templates</span>
            <Sparkles size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
            {summary?.totalQuestionPatterns ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Synthesized AI answers
          </div>
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", fontSize: 13, fontWeight: 600 }}>
            <span>Negative Traps Guarded</span>
            <ShieldAlert size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>
            {summary?.negativePatternsAvoided ?? 0}
          </div>
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
            Banners & fake buttons avoided
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Playbooks */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#182a1e" }}>Level 2 Procedural Playbooks</h2>
          <span style={{ fontSize: 13, color: "#64748b" }}>({playbooks.length} Active Domain Profiles)</span>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {playbooks.map((pb) => {
            const isExpanded = expandedPlaybook === pb.id;
            return (
              <div
                key={pb.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                }}
              >
                <div
                  onClick={() => setExpandedPlaybook(isExpanded ? null : pb.id)}
                  style={{
                    padding: "18px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    background: isExpanded ? "#f8fafc" : "white"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ color: "#64748b" }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ fontSize: 16, color: "#0f172a" }}>{pb.domain}</strong>
                        <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                          v{pb.version} · VERIFIED
                        </span>
                        <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>
                          {pb.applicationType}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                        Confidence: <strong>{Math.round((pb.confidence || 0.95) * 100)}%</strong> · Verified Runs: <strong>{pb.successfulRuns || 0}</strong> · Mapped Fields: <strong>{pb.fingerprints?.[0]?.fields?.length || 0}</strong>
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={14} /> Ready for Playbook Reuse
                    </span>
                    <small style={{ color: "#94a3b8", fontSize: 11 }}>
                      Updated: {pb.lastSuccessAt ? new Date(pb.lastSuccessAt).toLocaleDateString() : "Active"}
                    </small>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 24px 24px", borderTop: "1px solid #f1f5f9", marginTop: 8 }}>
                    {/* Fingerprint & Field Mappings */}
                    <div style={{ marginTop: 16 }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Remembered Form Hierarchy & Selectors
                      </h4>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                              <th style={{ padding: "8px 12px" }}>Field Label / Name</th>
                              <th style={{ padding: "8px 12px" }}>Input Type</th>
                              <th style={{ padding: "8px 12px" }}>Profile Key / Source</th>
                              <th style={{ padding: "8px 12px" }}>Primary Selector</th>
                              <th style={{ padding: "8px 12px" }}>Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pb.fingerprints?.[0]?.fields || []).map((f: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{f.label || f.name}</td>
                                <td style={{ padding: "10px 12px", color: "#64748b" }}><code>{f.type}</code></td>
                                <td style={{ padding: "10px 12px", color: "#0f766e", fontWeight: 600 }}>{f.targetProfileKey || f.answerStrategy}</td>
                                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#334155" }}>
                                  {f.selectors?.[0] || "input[name='" + f.name + "']"}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ color: "#15803d", fontWeight: 700 }}>{Math.round((f.confidence || 0.95) * 100)}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Negative Experience Rules */}
                    {pb.negativeExperience && pb.negativeExperience.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertTriangle size={14} /> Negative Procedural Traps Guarded
                        </h4>
                        <div style={{ display: "grid", gap: 8 }}>
                          {pb.negativeExperience.map((neg: any, nIdx: number) => (
                            <div key={nIdx} style={{ background: "#fef2f2", border: "1px solid #fee2e2", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                              <strong style={{ color: "#991b1b" }}>Rule {nIdx + 1}: {neg.rule}</strong>
                              <p style={{ margin: "2px 0 0", color: "#b91c1c", fontSize: 12 }}>
                                Avoid selector: <code>{neg.avoidSelector}</code> — {neg.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Recent Execution Traces */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#182a1e" }}>Recent Procedural Execution Traces</h2>
          <span style={{ fontSize: 13, color: "#64748b" }}>({runs.length} Recorded Runs)</span>
        </div>

        {runs.length === 0 ? (
          <div style={{ background: "white", padding: 30, borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>
            No live execution runs recorded yet in this environment. Launch a demo application to generate an agent action trace.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {runs.map((run) => {
              const isExpanded = expandedRun === run.id;
              return (
                <div key={run.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div
                    onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      background: isExpanded ? "#f8fafc" : "white"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ color: "#64748b" }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 14, color: "#0f172a" }}>{run.opportunityTitle}</strong>
                          <span style={{ background: run.status === "verified_success" ? "#dcfce7" : "#fef3c7", color: run.status === "verified_success" ? "#166534" : "#92400e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                            {run.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                          Target: <code>{run.url}</code> · Strategy: <strong>{run.strategy}</strong> · Reused Mappings: <strong>{run.reusedMappingCount || 0}</strong>
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 12, color: "#0f172a", fontFamily: "monospace", fontWeight: 700 }}>
                        {run.confirmationId || "APPROVED"}
                      </span>
                      <small style={{ display: "block", color: "#94a3b8", fontSize: 11 }}>
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </small>
                    </div>
                  </div>

                  {isExpanded && run.trace && run.trace.length > 0 && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
                      <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>
                        Multi-Step Agent Action Trace ({run.trace.length} Actions)
                      </h4>
                      <div style={{ display: "grid", gap: 6 }}>
                        {run.trace.map((step: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "8px 12px",
                              background: "#f8fafc",
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          >
                            <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>
                            <div style={{ flex: 1 }}>
                              <strong style={{ color: "#1e293b" }}>{step.step}: </strong>
                              <span style={{ color: "#475569" }}>{step.summary}</span>
                            </div>
                            <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>
                              {step.tool}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
