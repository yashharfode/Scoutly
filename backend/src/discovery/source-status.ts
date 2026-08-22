import { SourceStatusType } from "./source-adapter.js";

export interface SourceHealthRecord {
  sourceId: string;
  sourceName: string;
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  consecutiveFailures: number;
  lastStatus: SourceStatusType;
  lastLatencyMs: number;
  averageLatencyMs: number;
  lastSuccessTimestamp?: string;
  lastFailureTimestamp?: string;
  lastError?: string | null;
}

export class SourceHealthTracker {
  private static healthMap: Record<string, SourceHealthRecord> = {};

  public static recordResult(sourceId: string, sourceName: string, status: SourceStatusType, durationMs: number, error?: string | null) {
    if (!this.healthMap[sourceId]) {
      this.healthMap[sourceId] = {
        sourceId,
        sourceName,
        totalSearches: 0,
        successfulSearches: 0,
        failedSearches: 0,
        consecutiveFailures: 0,
        lastStatus: status,
        lastLatencyMs: durationMs,
        averageLatencyMs: durationMs
      };
    }

    const record = this.healthMap[sourceId];
    record.totalSearches++;
    record.lastStatus = status;
    record.lastLatencyMs = durationMs;
    record.averageLatencyMs = Math.round((record.averageLatencyMs * (record.totalSearches - 1) + durationMs) / record.totalSearches);

    if (status === "success" || status === "no_results") {
      record.successfulSearches++;
      record.consecutiveFailures = 0;
      record.lastSuccessTimestamp = new Date().toISOString();
      record.lastError = null;
    } else {
      record.failedSearches++;
      record.consecutiveFailures++;
      record.lastFailureTimestamp = new Date().toISOString();
      record.lastError = error || status;
    }
  }

  public static getAllHealth(): SourceHealthRecord[] {
    return Object.values(this.healthMap);
  }

  public static getSuccessRate(sourceId: string): number {
    const record = this.healthMap[sourceId];
    if (!record || record.totalSearches === 0) return 1.0;
    return record.successfulSearches / record.totalSearches;
  }
}
