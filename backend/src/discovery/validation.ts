import { NormalizedInternship } from "./source-adapter.js";

export function validateInternship(item: NormalizedInternship): boolean {
  if (!item.id || item.id.trim().length === 0) return false;
  if (!item.title || item.title.trim().length < 3) return false;
  if (!item.company || item.company.trim().length < 2) return false;
  if (!item.source || item.source.trim().length === 0) return false;
  
  // URL check
  if (!item.applicationUrl || !item.applicationUrl.startsWith("http")) {
    return false;
  }

  // Reject obvious spam/junk titles
  const junkPatterns = ["earn money from home", "click here", "data entry part time guaranteed"];
  if (junkPatterns.some(p => item.title.toLowerCase().includes(p))) {
    return false;
  }

  return true;
}

export function filterValidInternships(items: NormalizedInternship[]): NormalizedInternship[] {
  return items.filter(validateInternship);
}
