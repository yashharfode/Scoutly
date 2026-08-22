import { InternshipSourceAdapter, DiscoveryQuery, SourceResult } from "../source-adapter.js";

export class LinkedInAdapter implements InternshipSourceAdapter {
  id = "linkedin";
  name = "LinkedIn Public Jobs";
  category = "job_aggregator" as const;
  enabled = true;
  priority = 8;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async search(query: DiscoveryQuery, timeoutMs = 8000): Promise<SourceResult> {
    const startTime = Date.now();
    // LinkedIn guest search frequently hits an auth/login wall for automated queries.
    // As per strict product safety rule: gracefully report login_required without breaking search.
    return {
      sourceId: this.id,
      sourceName: this.name,
      status: "login_required",
      results: [],
      count: 0,
      durationMs: Date.now() - startTime,
      error: "LinkedIn requires user authentication for deeper search filtering."
    };
  }
}
