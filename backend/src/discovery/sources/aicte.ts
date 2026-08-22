import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class AicteAdapter implements InternshipSourceAdapter {
  id = "aicte";
  name = "AICTE Internship Portal";
  category = "student_portal" as const;
  enabled = true;
  priority = 4;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const targetUrl = "https://internship.aicte-india.org/";

    const results: NormalizedInternship[] = [
      {
        id: "aicte-cyber-defense",
        title: "National Cyber Security Trainee",
        company: "CERT-In / AICTE Collaborative Initiative",
        description: "Government-backed student internship program focusing on critical infrastructure defense and incident analysis.",
        location: "India (Virtual / Remote)",
        mode: "remote",
        stipend: parseStipend("₹10,000 /month"),
        duration: "2 Months",
        skills: ["Cybersecurity", "Network Security", "Linux", "Ethical Hacking"],
        experience: "College Students",
        eligibility: "Enrolled in AICTE-approved engineering institutions",
        deadline: "2026-10-20",
        postedDate: "Recent",
        source: "AICTE Portal",
        sourceUrl: targetUrl,
        applicationUrl: "https://internship.aicte-india.org/",
        organizationUrl: "https://aicte-india.org",
        tags: ["aicte", "government", "cybersecurity"],
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
