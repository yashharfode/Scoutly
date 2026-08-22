import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Application, Opportunity } from "../models/domain.js";
import { profileStorage } from "../storage/profile.storage.js";
import { JsonStorage } from "../storage/json-storage.js";
import { AgentMemoryManager } from "../agents/learning/agent-memory.js";
import { DiscoveryEngine } from "../discovery/discovery-engine.js";
import { SourceRegistry } from "../discovery/source-registry.js";
import { SourceHealthTracker } from "../discovery/source-status.js";

const savedStorage = new JsonStorage<Opportunity[]>(path.resolve(process.cwd(), "..", "data", "saved-opportunities.json"), []);
export const applicationsStorage = new JsonStorage<Application[]>(path.resolve(process.cwd(), "..", "data", "applications.json"), []);

const searchSchema = z.object({
  query: z.string().trim().min(2),
  forceRefresh: z.boolean().optional()
});

const opportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  organization: z.string(),
  type: z.literal("internship"),
  description: z.string().optional(),
  location: z.string().optional(),
  mode: z.enum(["remote", "hybrid", "in_person"]).optional(),
  stipend: z.number().optional(),
  currency: z.string().optional(),
  skills: z.array(z.string()),
  eligibility: z.string().optional(),
  deadline: z.string().optional(),
  applicationUrl: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  extractedAt: z.string(),
  tags: z.array(z.string()),
  rawData: z.record(z.unknown()).optional(),
  matchScore: z.number().optional()
});

export const opportunitiesRouter = Router();

// Multi-Source AI Discovery Endpoint
opportunitiesRouter.post("/search", async (req, res, next) => {
  try {
    const { query, forceRefresh } = searchSchema.parse(req.body);
    const profile = await profileStorage.get();

    const discovery = await DiscoveryEngine.discover(query, profile, !!forceRefresh);

    // Transform normalized results for frontend cards & Apply Agent compatibility
    const results: Opportunity[] = discovery.results.map(item => ({
      id: item.id,
      title: item.title,
      organization: item.company,
      type: "internship",
      description: item.description,
      location: item.location,
      mode: item.mode === "onsite" ? "in_person" : item.mode === "unknown" ? undefined : item.mode,
      stipend: item.stipend.min || undefined,
      currency: item.stipend.currency || "INR",
      skills: item.skills,
      eligibility: item.eligibility || undefined,
      deadline: item.deadline || undefined,
      applicationUrl: item.applicationUrl,
      source: item.source,
      sourceUrl: item.sourceUrl,
      extractedAt: item.discoveredAt,
      tags: item.tags,
      matchScore: item.matchScore,
      rawData: {
        matchReasons: item.matchReasons,
        warningReasons: item.warningReasons,
        stipendDisplay: item.stipend.display
      }
    }));

    res.json({
      status: discovery.status,
      aiStatus: "multi_source_active",
      message: discovery.message,
      sourceSummary: discovery.sourceSummary,
      stats: discovery.stats,
      cached: discovery.cached,
      memoryInsights: AgentMemoryManager.getMemory().insights,
      telemetry: discovery.telemetry,
      results
    });
  } catch (error) {
    next(error);
  }
});

// Discovery Sources & Health
opportunitiesRouter.get("/discovery/sources", async (_req, res) => {
  const adapters = SourceRegistry.getAllAdapters();
  res.json({
    sources: adapters.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      enabled: a.enabled,
      priority: a.priority
    }))
  });
});

opportunitiesRouter.get("/discovery/health", async (_req, res) => {
  res.json({ health: SourceHealthTracker.getAllHealth() });
});

// Self-Learning Agent Memory
opportunitiesRouter.get("/agent/memory", async (_req, res) => {
  res.json(AgentMemoryManager.getMemory());
});

opportunitiesRouter.post("/agent/feedback", async (req, res, next) => {
  try {
    const { action, opportunity } = z.object({
      action: z.enum(["save", "apply", "dismiss"]),
      opportunity: opportunitySchema
    }).parse(req.body);

    const memory = AgentMemoryManager.recordAction(action, opportunity);
    res.json({ success: true, memory });
  } catch (error) {
    next(error);
  }
});

// Saved Opportunities
opportunitiesRouter.get("/saved", async (_req, res, next) => {
  try {
    res.json(await savedStorage.get());
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.post("/saved", async (req, res, next) => {
  try {
    const item = opportunitySchema.parse(req.body);
    const saved = await savedStorage.get();
    if (!saved.some(o => o.id === item.id)) {
      saved.push(item);
      AgentMemoryManager.recordAction("save", item);
    }
    await savedStorage.save(saved);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.delete("/saved/:id", async (req, res, next) => {
  try {
    const saved = await savedStorage.get();
    await savedStorage.save(saved.filter(o => o.id !== req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Applications Tracking
opportunitiesRouter.get("/applications", async (_req, res, next) => {
  try {
    res.json(await applicationsStorage.get());
  } catch (error) {
    next(error);
  }
});
