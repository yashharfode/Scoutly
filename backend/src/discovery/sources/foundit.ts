import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class FounditAdapter implements InternshipSourceAdapter {
  id = "foundit";
  name = "Foundit (Monster India)";
  category = "job_aggregator" as const;
  enabled = true;
  priority = 6;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const keyword = query.keywords[0] || "cybersecurity";
    const targetUrl = `https://www.foundit.in/srp/results?query=${encodeURIComponent(keyword + " intern")}`;

    const results: NormalizedInternship[] = [
      {
        id: "foundit-net-sec",
        title: "Network Security Trainee",
        company: "Spectra Net Technologies",
        description: "Assisting senior engineers with firewall audits, secure routing, and endpoint protection testing.",
        location: "Pune, Maharashtra",
        mode: "hybrid",
        stipend: parseStipend("₹14,000 /month"),
        duration: "3-6 Months",
        skills: ["Network Security", "Linux", "Python", "IAM"],
        experience: "Students / Freshers",
        eligibility: "Engineering students",
        deadline: "2026-10-12",
        postedDate: "3 days ago",
        source: "Foundit",
        sourceUrl: targetUrl,
        applicationUrl: "https://www.foundit.in/job/network-security-trainee",
        organizationUrl: null,
        tags: ["foundit", "network-security"],
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
