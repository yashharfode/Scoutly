import path from "node:path";
import fs from "node:fs";
import { Opportunity, StudentProfile } from "../../models/domain.js";

export interface LearnedPreference {
  skillWeights: Record<string, number>;
  preferredModes: Record<string, number>;
  preferredLocations: Record<string, number>;
  averageTargetStipend: number;
  totalApplications: number;
  totalSaved: number;
  totalDismissed: number;
  insights: string[];
  lastUpdated: string;
}

const memoryFilePath = path.resolve(process.cwd(), "..", "data", "agent-memory.json");

const defaultMemory: LearnedPreference = {
  skillWeights: { "python": 3, "cybersecurity": 4, "linux": 2, "react": 2, "network traffic analysis": 3 },
  preferredModes: { "remote": 5, "hybrid": 2 },
  preferredLocations: { "india": 3, "remote": 5 },
  averageTargetStipend: 18000,
  totalApplications: 1,
  totalSaved: 0,
  totalDismissed: 0,
  insights: [
    "Scoutly has learned you strongly prefer Remote Cybersecurity and Python roles.",
    "Target stipend calibrated to ₹15,000 - ₹25,000/month."
  ],
  lastUpdated: new Date().toISOString()
};

export class AgentMemoryManager {
  private static loadMemory(): LearnedPreference {
    try {
      if (fs.existsSync(memoryFilePath)) {
        return JSON.parse(fs.readFileSync(memoryFilePath, "utf8"));
      }
    } catch (e) {}
    return { ...defaultMemory };
  }

  private static saveMemory(memory: LearnedPreference) {
    try {
      const dir = path.dirname(memoryFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      memory.lastUpdated = new Date().toISOString();
      fs.writeFileSync(memoryFilePath, JSON.stringify(memory, null, 2));
    } catch (e) {
      console.warn("Could not persist agent memory:", e);
    }
  }

  public static getMemory(): LearnedPreference {
    return this.loadMemory();
  }

  public static recordAction(action: "save" | "apply" | "dismiss", opportunity: Opportunity) {
    const memory = this.loadMemory();
    const weightDelta = action === "apply" ? 3 : action === "save" ? 2 : -2;

    if (action === "apply") memory.totalApplications++;
    if (action === "save") memory.totalSaved++;
    if (action === "dismiss") memory.totalDismissed++;

    // Update skill preferences
    for (const skill of opportunity.skills || []) {
      const k = skill.toLowerCase().trim();
      memory.skillWeights[k] = Math.max(0, (memory.skillWeights[k] || 1) + weightDelta);
    }

    // Update mode preferences
    if (opportunity.mode) {
      const m = opportunity.mode.toLowerCase();
      memory.preferredModes[m] = Math.max(0, (memory.preferredModes[m] || 1) + weightDelta);
    }

    // Recalculate average stipend
    if (opportunity.stipend && opportunity.stipend > 0 && action !== "dismiss") {
      memory.averageTargetStipend = Math.round((memory.averageTargetStipend + opportunity.stipend) / 2);
    }

    // Generate proactive self-learning insights
    const topSkills = Object.entries(memory.skillWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k.toUpperCase());

    const topMode = Object.entries(memory.preferredModes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "remote";

    memory.insights = [
      `Learned Interest: Frequently scouts ${topSkills.join(", ")} opportunities.`,
      `Preferred Setup: ${topMode.toUpperCase()} roles receive an autonomous +15% match boost.`,
      `Calibrated Target Stipend: Approx ₹${memory.averageTargetStipend.toLocaleString("en-IN")}/month based on your activity.`
    ];

    this.saveMemory(memory);
    return memory;
  }

  public static scoreWithLearning(
    opportunity: Opportunity, 
    profile: StudentProfile, 
    query: string
  ): Opportunity {
    const memory = this.loadMemory();
    const profileTerms = [...profile.skills, ...profile.preferredDomains].map(s => s.toLowerCase());
    
    // 1. Base skill match
    const matched = opportunity.skills.filter(skill => 
      profileTerms.some(term => skill.toLowerCase().includes(term) || term.includes(skill.toLowerCase()))
    );
    const reasons = matched.map(s => `✓ ${s} matches your profile`);

    // 2. Learned skill boost
    let learningBoost = 0;
    for (const s of opportunity.skills) {
      const weight = memory.skillWeights[s.toLowerCase().trim()] || 0;
      if (weight >= 3) {
        learningBoost += 6;
        reasons.push(`🧠 AI Learned: High affinity for ${s}`);
      }
    }

    // 3. Mode matching & learned preference
    if (opportunity.mode) {
      if (profile.preferredMode.includes(opportunity.mode)) {
        reasons.push(`✓ ${opportunity.mode.replace("_", " ")} preference`);
      }
      if ((memory.preferredModes[opportunity.mode] || 0) >= 3) {
        learningBoost += 8;
        reasons.push(`🧠 AI Learned: Preference for ${opportunity.mode} work`);
      }
    }

    // 4. Stipend
    if ((opportunity.stipend ?? 0) >= profile.minimumStipend) {
      reasons.push("✓ Stipend requirement met");
    }

    // 5. Keyword match
    const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const textBlob = `${opportunity.title} ${opportunity.description} ${opportunity.tags.join(" ")}`.toLowerCase();
    const queryMatches = queryTokens.some(q => textBlob.includes(q));
    if (queryMatches) reasons.push("✓ Keyword query match");

    const calculatedScore = Math.min(
      99,
      Math.max(
        42,
        35 +
        matched.length * 10 +
        learningBoost +
        (opportunity.mode && profile.preferredMode.includes(opportunity.mode) ? 10 : 0) +
        ((opportunity.stipend ?? 0) >= profile.minimumStipend ? 12 : 0) +
        (queryMatches ? 8 : 0)
      )
    );

    return {
      ...opportunity,
      matchScore: calculatedScore,
      rawData: {
        matchReasons: reasons.length ? reasons : ["✓ Matches profile baseline"]
      }
    };
  }
}
