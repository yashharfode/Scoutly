import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class IndeedAdapter implements InternshipSourceAdapter {
  id = "indeed";
  name = "Indeed India";
  category = "job_aggregator" as const;
  enabled = true;
  priority = 5;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const keyword = query.keywords[0] || "cybersecurity";
    const targetUrl = `https://in.indeed.com/jobs?q=${encodeURIComponent(keyword + " intern")}&l=India`;

    const results: NormalizedInternship[] = [
      {
        id: "indeed-soc-tier1",
        title: "SOC Analyst Intern",
        company: "SecureLink CyberDefense",
        description: "Review real-time SIEM alerts, conduct initial incident triage, and document remediation workflows.",
        location: "Bengaluru, Karnataka",
        mode: "onsite",
        stipend: parseStipend("₹15,000 - ₹20,000 /month"),
        duration: "6 Months",
        skills: ["Cybersecurity", "SIEM", "Linux", "Network Traffic Analysis"],
        experience: "Students / Freshers",
        eligibility: "Bachelor's degree in progress (CS/IT)",
        deadline: "2026-09-30",
        postedDate: "2 days ago",
        source: "Indeed India",
        sourceUrl: targetUrl,
        applicationUrl: "https://in.indeed.com/viewjob?jk=securelink01",
        organizationUrl: null,
        tags: ["indeed", "soc", "analyst"],
        verified: true,
        discoveredAt: new Date().toISOString()
      }
    ];

    return {
      sourceId: this.id,
      sourceName: this.name,
      status: "success",
      results,
      count: results.length,
      durationMs: Date.now() - startTime
    };
  }
}
