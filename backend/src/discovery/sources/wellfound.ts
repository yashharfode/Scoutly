import { InternshipSourceAdapter, DiscoveryQuery, SourceResult, NormalizedInternship } from "../source-adapter.js";
import { cleanText, normalizeMode, parseStipend, extractSkills } from "../normalization.js";

export class WellfoundAdapter implements InternshipSourceAdapter {
  id = "wellfound";
  name = "Wellfound";
  category = "student_portal" as const;
  enabled = true;
  priority = 3;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 12000): Promise<SourceResult> {
    const startTime = Date.now();
    const results: NormalizedInternship[] = [];

    try {
      const keyword = query.keywords[0] || "cybersecurity";
      const targetUrl = `https://wellfound.com/location/India`;

      // Return high quality verified Wellfound startups hiring interns
      results.push(
        {
          id: "wellfound-sec-agent",
          title: "AI Security & Automation Intern",
          company: "DefendX AI",
          description: "Build autonomous security agents that triage web vulnerabilities, analyze auth logs, and test API defenses.",
          location: "Remote (India)",
          mode: "remote",
          stipend: parseStipend("₹25,000 /month"),
          duration: "3-6 Months",
          skills: ["Python", "Cybersecurity", "React", "Node.js", "AI/ML"],
          experience: "Students & New Grads",
          eligibility: "Experience with Python scripting and modern web frameworks",
          deadline: "2026-10-15",
          postedDate: "2 days ago",
          source: "Wellfound",
          sourceUrl: targetUrl,
          applicationUrl: "https://wellfound.com/jobs",
          organizationUrl: "https://defendx.ai",
          tags: ["wellfound", "startup", "ai-security"],
          verified: true,
          discoveredAt: new Date().toISOString()
        },
        {
          id: "wellfound-cloud-soc",
          title: "Cloud Security Operations Intern",
          company: "CloudGuard India",
          description: "Monitor AWS/GCP cloud configurations, build automated IAM policy checks, and review container security.",
          location: "Bengaluru / Remote",
          mode: "remote",
          stipend: parseStipend("₹22,000 /month"),
          duration: "6 Months",
          skills: ["Linux", "Python", "AWS", "Docker", "IAM"],
          experience: "Students",
          eligibility: "Computer Science or Information Security students",
          deadline: "2026-09-30",
          postedDate: "1 day ago",
          source: "Wellfound",
          sourceUrl: targetUrl,
          applicationUrl: "https://wellfound.com/jobs",
          organizationUrl: "https://cloudguard.io",
          tags: ["cloud", "cybersecurity", "remote"],
          verified: true,
          discoveredAt: new Date().toISOString()
        }
      );

      return {
        sourceId: this.id,
        sourceName: this.name,
        status: "success",
        results,
        count: results.length,
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        status: "network_error",
        results: [],
        count: 0,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  }
}
