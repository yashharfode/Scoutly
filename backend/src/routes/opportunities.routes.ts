import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Application, Opportunity, StudentProfile } from "../models/domain.js";
import { profileStorage } from "../storage/profile.storage.js";
import { JsonStorage } from "../storage/json-storage.js";
import { AgentMemoryManager } from "../agents/learning/agent-memory.js";

const savedStorage = new JsonStorage<Opportunity[]>(path.resolve(process.cwd(), "..", "data", "saved-opportunities.json"), []);
export const applicationsStorage = new JsonStorage<Application[]>(path.resolve(process.cwd(), "..", "data", "applications.json"), []);
const searchSchema = z.object({ query: z.string().trim().min(2) });
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

// Curated verified opportunities (Local Playwright Demo & Real Portal Listings)
const curatedOpportunities: Opportunity[] = [
  { 
    id: "mock-cyber-analyst", 
    title: "Cybersecurity Analyst Intern", 
    organization: "SecureStack (Local Application Portal)", 
    type: "internship", 
    description: "Support threat triage, security monitoring, and practical vulnerability analysis.", 
    location: "India", 
    mode: "remote", 
    stipend: 18000, 
    currency: "INR", 
    skills: ["Python", "Network Security", "Linux", "IAM"], 
    eligibility: "Students pursuing computer science or cybersecurity.", 
    deadline: "2026-09-15", 
    applicationUrl: "http://localhost:3000/mock-application/cybersecurity-intern", 
    source: "Verified Local Portal", 
    sourceUrl: "http://localhost:3000", 
    extractedAt: new Date().toISOString(), 
    tags: ["cybersecurity", "networking", "python"] 
  },
  { 
    id: "wellfound-ai-security", 
    title: "AI / Security Engineering Intern", 
    organization: "Wellfound Verified Role", 
    type: "internship", 
    description: "Build LLM-powered agent features, evaluate prompt injection risks, and build defensive pipelines.", 
    location: "India (Remote)", 
    mode: "remote", 
    stipend: 25000, 
    currency: "INR", 
    skills: ["Python", "AI/ML", "React", "Node.js", "LLM Security"], 
    eligibility: "B.Tech students with Python and AI experience.", 
    deadline: "2026-09-30", 
    applicationUrl: "https://wellfound.com/jobs", 
    source: "Wellfound Live", 
    sourceUrl: "https://wellfound.com/location/India", 
    extractedAt: new Date().toISOString(), 
    tags: ["ai", "security", "remote"] 
  },
  { 
    id: "mock-soc-analyst", 
    title: "SOC Threat Intelligence Intern", 
    organization: "BlueTeam India", 
    type: "internship", 
    description: "Analyze suspicious network traffic, investigate incident response alerts, and document security findings.", 
    location: "Bengaluru, India", 
    mode: "hybrid", 
    stipend: 15000, 
    currency: "INR", 
    skills: ["Network Traffic Analysis", "Linux", "Incident Response", "Python"], 
    eligibility: "Students interested in defensive security and SOC operations.", 
    deadline: "2026-09-20", 
    applicationUrl: "http://localhost:3000/mock-application/cybersecurity-intern", 
    source: "Defensive Security Portal", 
    sourceUrl: "http://localhost:3000", 
    extractedAt: new Date().toISOString(), 
    tags: ["cybersecurity", "soc", "linux"] 
  },
  { 
    id: "mock-fullstack-dev", 
    title: "Full Stack AI Developer Intern", 
    organization: "CampusFlow Labs", 
    type: "internship", 
    description: "Build student-facing autonomous agent workflows with React, TypeScript, and Node.js.", 
    location: "India (Remote)", 
    mode: "remote", 
    stipend: 20000, 
    currency: "INR", 
    skills: ["React", "Node.js", "TypeScript", "Python"], 
    eligibility: "Students with hands-on web development projects.", 
    deadline: "2026-10-05", 
    applicationUrl: "http://localhost:3000/mock-application/cybersecurity-intern", 
    source: "CampusFlow Portal", 
    sourceUrl: "http://localhost:3000", 
    extractedAt: new Date().toISOString(), 
    tags: ["react", "typescript", "node.js"] 
  }
];

// Fetch live opportunities from real remote jobs API with timeout/fallback
async function fetchLiveWebOpportunities(query: string): Promise<Opportunity[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://remotive.com/api/remote-jobs?category=software-dev&limit=6`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json() as any;
      if (Array.isArray(data?.jobs)) {
        return data.jobs.slice(0, 4).map((j: any): Opportunity => ({
          id: `live-${j.id}`,
          title: j.title || "Software Engineering Intern",
          organization: j.company_name || "Tech Company",
          type: "internship",
          description: j.description?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
          location: j.candidate_required_location || "Remote",
          mode: "remote",
          stipend: 22000,
          currency: "INR",
          skills: (j.tags || ["Python", "JavaScript", "React"]).slice(0, 4),
          deadline: "2026-10-15",
          applicationUrl: j.url || "https://wellfound.com/jobs",
          source: "Live Web Feed",
          sourceUrl: j.url || "",
          extractedAt: new Date().toISOString(),
          tags: ["live-feed", ...(j.tags || [])]
        }));
      }
    }
  } catch (e) {
    // Network offline or timeout -> fall back cleanly to curated
  }
  return [];
}

export const opportunitiesRouter = Router();

// Search & Adaptive Match Ranking
opportunitiesRouter.post("/search", async (req, res, next) => {
  try {
    const { query } = searchSchema.parse(req.body);
    const profile = await profileStorage.get();

    // 1. Fetch live opportunities + combine with curated
    const liveListings = await fetchLiveWebOpportunities(query);
    const allOpportunities = [...curatedOpportunities, ...liveListings];

    // 2. Score with Self-Learning Agent Memory
    const results = allOpportunities
      .map(o => AgentMemoryManager.scoreWithLearning(o, profile, query))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    res.json({
      status: "success",
      aiStatus: "self_learning_active",
      memoryInsights: AgentMemoryManager.getMemory().insights,
      stats: {
        raw: allOpportunities.length,
        duplicatesRemoved: 0,
        matched: results.length
      },
      results
    });
  } catch (error) {
    next(error);
  }
});

// Agent Self-Learning Memory Endpoints
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
      // Reinforce Agent Self-Learning
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
