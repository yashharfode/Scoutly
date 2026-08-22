import { NormalizedInternship, DiscoveryQuery } from "./source-adapter.js";
import { StudentProfile } from "../models/domain.js";
import { AgentMemoryManager } from "../agents/learning/agent-memory.js";

export function rankInternship(
  item: NormalizedInternship,
  profile: StudentProfile,
  query: DiscoveryQuery
): NormalizedInternship {
  const matchReasons: string[] = [];
  const warningReasons: string[] = [];
  const memory = AgentMemoryManager.getMemory();

  let score = 0;

  // 1. Skills Match (35 pts)
  const profileSkills = profile.skills.map(s => s.toLowerCase());
  const itemSkills = item.skills.map(s => s.toLowerCase());
  
  const matchedSkills = item.skills.filter(s => 
    profileSkills.some(ps => ps.includes(s.toLowerCase()) || s.toLowerCase().includes(ps))
  );

  if (matchedSkills.length > 0) {
    const skillScore = Math.min(35, matchedSkills.length * 12);
    score += skillScore;
    matchedSkills.slice(0, 3).forEach(s => matchReasons.push(`✓ ${s} matches profile`));
  }

  // 2. Domain Match (20 pts)
  const profileDomains = profile.preferredDomains.map(d => d.toLowerCase());
  const itemText = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  
  const domainMatched = profileDomains.some(d => itemText.includes(d));
  if (domainMatched) {
    score += 20;
    matchReasons.push("✓ Aligns with target career domain");
  }

  // 3. Location & Mode (15 pts)
  if (item.mode === "remote") {
    score += 15;
    matchReasons.push("✓ Remote opportunity");
  } else if (item.mode && profile.preferredMode.includes(item.mode as any)) {
    score += 12;
    matchReasons.push(`✓ ${item.mode.replace("_", " ")} mode preference`);
  } else if (item.location.toLowerCase().includes("india")) {
    score += 8;
  }

  // 4. Stipend Requirement (10 pts)
  const minStipend = item.stipend.min ?? 0;
  if (minStipend >= profile.minimumStipend && minStipend > 0) {
    score += 10;
    matchReasons.push("✓ Stipend meets preference");
  } else if (item.stipend.min !== null) {
    score += 5;
  }

  // 5. Eligibility (10 pts)
  const studentBranch = profile.branch.toLowerCase();
  if (!item.eligibility || item.eligibility.toLowerCase().includes("student") || itemText.includes(studentBranch)) {
    score += 10;
    matchReasons.push("✓ Student eligible");
  } else {
    score += 5;
  }

  // 6. Experience & Freshness (10 pts)
  if (!item.experience || item.experience.toLowerCase().includes("fresher") || item.experience.toLowerCase().includes("0")) {
    score += 5;
  } else if (item.experience.toLowerCase().includes("1+") || item.experience.toLowerCase().includes("year")) {
    warningReasons.push("⚠ Prior experience preferred");
  }

  score += 5; // Base freshness points

  // 7. Incorporate Self-Learning Agent Memory Boosts
  for (const s of item.skills) {
    const weight = memory.skillWeights[s.toLowerCase().trim()] || 0;
    if (weight >= 3) {
      score += 4;
      matchReasons.push(`🧠 AI Learned: High affinity for ${s}`);
    }
  }

  if (item.mode && (memory.preferredModes[item.mode] || 0) >= 3) {
    score += 5;
    matchReasons.push(`🧠 AI Learned: Favored ${item.mode} setup`);
  }

  // Cap between 40 and 98
  const finalMatchScore = Math.min(98, Math.max(40, Math.round(score)));

  return {
    ...item,
    matchScore: finalMatchScore,
    matchReasons: matchReasons.length ? matchReasons : ["✓ Matches student profile baseline"],
    warningReasons: warningReasons.length ? warningReasons : undefined
  };
}
