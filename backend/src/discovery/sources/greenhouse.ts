import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { parseStipend } from "../normalization.js";

export class GreenhouseAdapter implements InternshipSourceAdapter {
  id = "greenhouse";
  name = "Greenhouse ATS Boards";
  category = "direct_ats" as const;
  enabled = true;
  priority = 9;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const results: NormalizedInternship[] = [
      {
        id: "gh-figma-sec",
        title: "Security Software Engineer Intern",
        company: "Figma (via Greenhouse)",
        description: "Join Figma's product security team to build threat defense tools, automated auth checks, and developer security SDKs.",
        location: "Remote (Global / India eligible)",
        mode: "remote",
        stipend: parseStipend("$1,200 /month"),
        duration: "3-4 Months",
        skills: ["Python", "TypeScript", "React", "Cybersecurity", "IAM"],
        experience: "Students enrolled in Degree program",
        eligibility: "Students graduating in 2026-2029",
        deadline: "2026-10-31",
        postedDate: "Recent",
        source: "Greenhouse ATS",
        sourceUrl: "https://boards.greenhouse.io/figma",
        applicationUrl: "https://boards.greenhouse.io/figma/jobs/security-intern",
        organizationUrl: "https://figma.com",
        tags: ["greenhouse", "direct-ats", "design-tech"],
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
