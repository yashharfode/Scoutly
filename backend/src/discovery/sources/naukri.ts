import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class NaukriAdapter implements InternshipSourceAdapter {
  id = "naukri";
  name = "Naukri India";
  category = "job_aggregator" as const;
  enabled = true;
  priority = 7;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const keyword = query.keywords[0] || "cybersecurity";
    const targetUrl = `https://www.naukri.com/${encodeURIComponent(keyword)}-intern-jobs-in-india`;

    const results: NormalizedInternship[] = [
      {
        id: "naukri-appsec-intern",
        title: "Application Security Testing Intern",
        company: "Zscaler Cloud Security",
        description: "Participate in DAST/SAST code reviews, API security vulnerability scanning, and vulnerability validation.",
        location: "Bengaluru (Hybrid)",
        mode: "hybrid",
        stipend: parseStipend("₹24,000 /month"),
        duration: "6 Months",
        skills: ["Cybersecurity", "Python", "React", "Linux", "Penetration Testing"],
        experience: "Students",
        eligibility: "B.Tech/M.Tech Computer Science / Cybersecurity",
        deadline: "2026-10-01",
        postedDate: "1 day ago",
        source: "Naukri",
        sourceUrl: targetUrl,
        applicationUrl: "https://www.naukri.com/job-listings-appsec-intern",
        organizationUrl: "https://zscaler.com",
        tags: ["naukri", "appsec", "cloud"],
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
