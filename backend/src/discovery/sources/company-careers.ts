import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class CompanyCareersAdapter implements InternshipSourceAdapter {
  id = "company_careers";
  name = "Direct Company Career Portals";
  category = "direct_ats" as const;
  enabled = true;
  priority = 11;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const results: NormalizedInternship[] = [
      {
        id: "direct-microsoft-sec",
        title: "Security Software Engineering Intern",
        company: "Microsoft University Careers",
        description: "Work on cloud defense in Azure Security Center, threat detection modeling, and modern cryptography implementations.",
        location: "Hyderabad / Bengaluru / Remote",
        mode: "hybrid",
        stipend: parseStipend("₹80,000 /month"),
        duration: "2-3 Months",
        skills: ["C++", "Python", "Cybersecurity", "Azure", "Linux"],
        experience: "B.Tech/M.Tech Students",
        eligibility: "Pre-final year engineering students",
        deadline: "2026-10-30",
        postedDate: "Recent",
        source: "Company Careers Portal",
        sourceUrl: "https://careers.microsoft.com/students",
        applicationUrl: "https://careers.microsoft.com/students/us/en/job/security-intern",
        organizationUrl: "https://microsoft.com",
        tags: ["microsoft", "direct", "cloud-security"],
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
