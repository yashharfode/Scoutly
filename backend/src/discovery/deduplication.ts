import { NormalizedInternship } from "./source-adapter.js";

function normalizeTitleForDedupe(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(internship|intern|trainee|fresher|fellow|associate|co-op)\b/g, "intern")
    .replace(/\b(cyber security)\b/g, "cybersecurity")
    .replace(/\b(software engineer|software developer|swe|sde|web developer)\b/g, "software engineer")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompanyForDedupe(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|technologies|solutions|labs|pvt|private)\b/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Source authority priority (lower number = higher authority)
function getSourcePriority(source: string): number {
  const s = source.toLowerCase();
  if (s.includes("career") || s.includes("official") || s.includes("direct")) return 1;
  if (s.includes("greenhouse") || s.includes("lever") || s.includes("ashby")) return 2;
  if (s.includes("internshala") || s.includes("unstop") || s.includes("wellfound") || s.includes("aicte")) return 3;
  return 4; // Aggregators (Indeed, Foundit, Naukri)
}

export interface DeduplicationResult {
  unique: NormalizedInternship[];
  duplicatesRemoved: number;
}

export function deduplicateInternships(items: NormalizedInternship[]): DeduplicationResult {
  const groups = new Map<string, NormalizedInternship[]>();

  for (const item of items) {
    const normTitle = normalizeTitleForDedupe(item.title);
    const normCompany = normalizeCompanyForDedupe(item.company);
    
    // Fuzzy key
    const key = `${normCompany}::${normTitle}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  const unique: NormalizedInternship[] = [];
  let duplicatesRemoved = 0;

  for (const group of groups.values()) {
    if (group.length === 1) {
      unique.push(group[0]);
    } else {
      duplicatesRemoved += group.length - 1;
      // Sort group to pick the highest quality source
      group.sort((a, b) => {
        const prioA = getSourcePriority(a.source);
        const prioB = getSourcePriority(b.source);
        if (prioA !== prioB) return prioA - prioB;
        // If same priority, prefer one with more filled details
        const detailsA = (a.skills.length * 2) + (a.description.length > 50 ? 2 : 0) + (a.stipend.min ? 3 : 0);
        const detailsB = (b.skills.length * 2) + (b.description.length > 50 ? 2 : 0) + (b.stipend.min ? 3 : 0);
        return detailsB - detailsA;
      });

      // Merge non-empty skills and fields from other duplicates
      const winner = { ...group[0] };
      const mergedSkills = new Set(winner.skills);
      for (const other of group.slice(1)) {
        for (const s of other.skills) mergedSkills.add(s);
        if (!winner.stipend.min && other.stipend.min) {
          winner.stipend = other.stipend;
        }
      }
      winner.skills = Array.from(mergedSkills);
      unique.push(winner);
    }
  }

  return { unique, duplicatesRemoved };
}
