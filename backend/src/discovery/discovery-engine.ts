import path from "node:path";
import fs from "node:fs";
import { 
  DiscoveryQuery, 
  NormalizedInternship, 
  SourceResult, 
  OpportunityMode 
} from "./source-adapter.js";
import { SourceRegistry } from "./source-registry.js";
import { SourceHealthTracker } from "./source-status.js";
import { filterValidInternships } from "./validation.js";
import { deduplicateInternships } from "./deduplication.js";
import { rankInternship } from "./ranking.js";
import { StudentProfile } from "../models/domain.js";

const cacheFilePath = path.resolve(process.cwd(), "..", "data", "discovery-cache.json");

interface CacheEntry {
  timestamp: number;
  results: NormalizedInternship[];
  sourcesQueried: { id: string; name: string; status: string; count: number; durationMs: number }[];
}

export interface DiscoveryResponse {
  status: "success" | "partial_success" | "no_results";
  query: DiscoveryQuery;
  sourceSummary: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    sources: { id: string; name: string; status: string; count: number; durationMs: number; error?: string | null }[];
  };
  stats: {
    totalRaw: number;
    validCount: number;
    duplicatesRemoved: number;
    finalCount: number;
  };
  cached: boolean;
  message: string;
  results: NormalizedInternship[];
  telemetry: string[];
}

export class DiscoveryEngine {
  private static parseQuery(rawQuery: string): DiscoveryQuery {
    const rawLower = rawQuery.toLowerCase();
    
    // 1. Extract Mode
    let mode: OpportunityMode | null = null;
    if (rawLower.includes("remote") || rawLower.includes("wfh") || rawLower.includes("work from home")) {
      mode = "remote";
    } else if (rawLower.includes("hybrid")) {
      mode = "hybrid";
    } else if (rawLower.includes("onsite") || rawLower.includes("in office")) {
      mode = "onsite";
    }

    // 2. Extract Location
    let location: string | null = null;
    if (rawLower.includes("india")) location = "India";
    else if (rawLower.includes("bengaluru") || rawLower.includes("bangalore")) location = "Bengaluru";
    else if (rawLower.includes("delhi") || rawLower.includes("noida") || rawLower.includes("gurgaon")) location = "Delhi NCR";
    else if (rawLower.includes("pune")) location = "Pune";
    else if (rawLower.includes("hyderabad")) location = "Hyderabad";

    // 3. Extract Minimum Stipend
    let minimumStipend: number | null = null;
    const stipendMatch = rawLower.match(/(?:stipend|paying|above|min|minimum|₹|rs\.?|inr)?\s*(?:above|over|>=|>)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)\s*(k)?/i);
    if (stipendMatch) {
      let val = parseFloat(stipendMatch[1].replace(/,/g, ""));
      if (stipendMatch[2] === "k") val *= 1000;
      if (val >= 1000) minimumStipend = val;
    }

    // 4. Extract Keywords & Expand
    const cleanedTerms = rawLower
      .replace(/\b(internship|internships|intern|jobs|roles|in|for|with|paying|stipend|above|india|remote|hybrid|onsite|find|search|give|me)\b/g, " ")
      .replace(/[^a-z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const baseKeyword = cleanedTerms.join(" ") || "cybersecurity";
    const expandedKeywords = this.expandKeywords(baseKeyword);

    return {
      rawQuery,
      keywords: [baseKeyword],
      expandedKeywords,
      location,
      mode,
      minimumStipend,
      currency: "INR",
      internshipOnly: true
    };
  }

  private static expandKeywords(keyword: string): string[] {
    const kw = keyword.toLowerCase();
    const expansions = new Set<string>([keyword]);

    if (kw.includes("cyber") || kw.includes("security") || kw.includes("soc") || kw.includes("iam")) {
      [
        "cybersecurity", "cyber security", "information security", "SOC analyst",
        "security analyst", "penetration testing", "ethical hacking", "network security",
        "incident response", "IAM", "threat intelligence"
      ].forEach(s => expansions.add(s));
    } else if (kw.includes("ai") || kw.includes("ml") || kw.includes("machine learning") || kw.includes("data")) {
      [
        "artificial intelligence", "machine learning", "deep learning", "generative AI",
        "LLM security", "data science", "NLP", "Python AI"
      ].forEach(s => expansions.add(s));
    } else if (kw.includes("web") || kw.includes("react") || kw.includes("frontend") || kw.includes("fullstack") || kw.includes("node")) {
      [
        "full stack developer", "frontend developer", "React developer", "Node.js developer",
        "web development", "MERN stack", "TypeScript"
      ].forEach(s => expansions.add(s));
    }

    return Array.from(expansions);
  }

  public static async discover(
    rawQuery: string, 
    profile: StudentProfile, 
    forceRefresh = false
  ): Promise<DiscoveryResponse> {
    const telemetry: string[] = [];
    telemetry.push(`discovery_started: "${rawQuery}"`);

    const query = this.parseQuery(rawQuery);
    telemetry.push(`query_parsed: keywords=[${query.keywords.join(", ")}], mode=${query.mode || "any"}, minStipend=${query.minimumStipend || "none"}`);

    // Check Local Cache (TTL 15 mins)
    const cacheKey = `${query.keywords.join("_")}_${query.mode || "all"}_${query.minimumStipend || 0}`;
    if (!forceRefresh) {
      try {
        if (fs.existsSync(cacheFilePath)) {
          const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
          const entry = cacheData[cacheKey] as CacheEntry;
          if (entry && (Date.now() - entry.timestamp) < 15 * 60 * 1000) {
            telemetry.push("cache_hit: returning freshly cached discovery feed");
            const rankedCached = entry.results.map(item => rankInternship(item, profile, query));
            return {
              status: "success",
              query,
              sourceSummary: {
                totalSources: entry.sourcesQueried.length,
                successfulSources: entry.sourcesQueried.filter(s => s.status === "success").length,
                failedSources: entry.sourcesQueried.filter(s => s.status !== "success").length,
                sources: entry.sourcesQueried
              },
              stats: {
                totalRaw: entry.results.length,
                validCount: entry.results.length,
                duplicatesRemoved: 0,
                finalCount: entry.results.length
              },
              cached: true,
              message: `Scoutly retrieved ${rankedCached.length} verified internships from cache (${entry.sourcesQueried.length} sources).`,
              results: rankedCached,
              telemetry
            };
          }
        }
      } catch (e) {}
    }

    // Step 1: Parallel Source Search via Promise.allSettled()
    const adapters = SourceRegistry.getEnabledAdapters();
    telemetry.push(`sources_queried: launching ${adapters.length} adapters concurrently with 12s timeout`);

    const settled = await Promise.allSettled(
      adapters.map(adapter => adapter.search(query, 12000))
    );

    let rawListings: NormalizedInternship[] = [];
    const sourceStatuses: { id: string; name: string; status: string; count: number; durationMs: number; error?: string | null }[] = [];

    for (let i = 0; i < settled.length; i++) {
      const adapter = adapters[i];
      const outcome = settled[i];

      if (outcome.status === "fulfilled") {
        const res = outcome.value;
        SourceHealthTracker.recordResult(res.sourceId, res.sourceName, res.status, res.durationMs, res.error);
        sourceStatuses.push({
          id: res.sourceId,
          name: res.sourceName,
          status: res.status,
          count: res.count,
          durationMs: res.durationMs,
          error: res.error
        });
        rawListings.push(...res.results);
      } else {
        SourceHealthTracker.recordResult(adapter.id, adapter.name, "network_error", 12000, outcome.reason?.message);
        sourceStatuses.push({
          id: adapter.id,
          name: adapter.name,
          status: "network_error",
          count: 0,
          durationMs: 12000,
          error: outcome.reason?.message || "Adapter rejected"
        });
      }
    }

    telemetry.push(`normalization_started: received ${rawListings.length} raw results`);
    const validItems = filterValidInternships(rawListings);
    telemetry.push(`validation_completed: ${validItems.length} valid items retained`);

    // Step 2: Deduplication
    telemetry.push("deduplication_started");
    const { unique, duplicatesRemoved } = deduplicateInternships(validItems);
    telemetry.push(`deduplication_completed: removed ${duplicatesRemoved} duplicate listings`);

    // Step 3: Deterministic User Constraints Filtering
    telemetry.push("filtering_started");
    const filtered = unique.filter(item => {
      // Stipend filter
      if (query.minimumStipend && item.stipend.max !== null && item.stipend.max < query.minimumStipend) {
        return false;
      }
      // Mode filter
      if (query.mode && query.mode !== "unknown" && item.mode !== "unknown" && item.mode !== query.mode) {
        return false;
      }
      return true;
    });
    telemetry.push(`filtering_completed: ${filtered.length} items passed constraints`);

    // Step 4: Multi-Factor & Self-Learning Ranking
    telemetry.push("ranking_started");
    const ranked = filtered
      .map(item => rankInternship(item, profile, query))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    telemetry.push("ranking_completed");

    // Save to Cache
    try {
      let cacheData: Record<string, CacheEntry> = {};
      if (fs.existsSync(cacheFilePath)) {
        try { cacheData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8")); } catch (e) {}
      }
      cacheData[cacheKey] = {
        timestamp: Date.now(),
        results: ranked,
        sourcesQueried: sourceStatuses
      };
      const dir = path.dirname(cacheFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
    } catch (e) {}

    const successfulCount = sourceStatuses.filter(s => s.status === "success").length;
    const finalMessage = `Scoutly searched ${sourceStatuses.length} public sources and combined ${ranked.length} relevant internships into your personalized feed.`;

    telemetry.push("discovery_completed");

    return {
      status: ranked.length > 0 ? "success" : "no_results",
      query,
      sourceSummary: {
        totalSources: sourceStatuses.length,
        successfulSources: successfulCount,
        failedSources: sourceStatuses.length - successfulCount,
        sources: sourceStatuses
      },
      stats: {
        totalRaw: rawListings.length,
        validCount: validItems.length,
        duplicatesRemoved,
        finalCount: ranked.length
      },
      cached: false,
      message: finalMessage,
      results: ranked,
      telemetry
    };
  }
}
