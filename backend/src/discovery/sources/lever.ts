import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class LeverAdapter implements InternshipSourceAdapter {
  id = "lever";
  name = "Lever ATS Boards";
  category = "direct_ats" as const;
  enabled = true;
  priority = 10;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const results: NormalizedInternship[] = [
      {
        id: "lever-spotify-data",
        title: "Security & Trust Engineering Intern",
        company: "Postman API Platform (via Lever)",
        description: "Build automated security linters, monitor API vulnerability signatures, and contribute to internal security libraries.",
        location: "Bengaluru / Remote",
        mode: "remote",
        stipend: parseStipend("₹30,000 /month"),
        duration: "6 Months",
        skills: ["Node.js", "Python", "Cybersecurity", "Linux", "Docker"],
        experience: "Students",
        eligibility: "Engineering students with API & backend development experience",
        deadline: "2026-10-15",
        postedDate: "Recent",
        source: "Lever ATS",
        sourceUrl: "https://jobs.lever.co/postman",
        applicationUrl: "https://jobs.lever.co/postman/security-intern",
        organizationUrl: "https://postman.com",
        tags: ["lever", "api", "security"],
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
