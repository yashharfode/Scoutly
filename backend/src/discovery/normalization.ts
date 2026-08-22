import { OpportunityMode, NormalizedStipend } from "./source-adapter.js";

export function cleanText(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ") // strip HTML
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMode(modeOrLocation?: string | null): { mode: OpportunityMode; location: string } {
  if (!modeOrLocation) return { mode: "unknown", location: "India" };
  const raw = cleanText(modeOrLocation).toLowerCase();
  
  let mode: OpportunityMode = "unknown";
  if (raw.includes("remote") || raw.includes("work from home") || raw.includes("wfh") || raw.includes("anywhere")) {
    mode = "remote";
  } else if (raw.includes("hybrid") || raw.includes("flexible")) {
    mode = "hybrid";
  } else if (raw.includes("onsite") || raw.includes("in office") || raw.includes("office") || raw.includes("on-site")) {
    mode = "onsite";
  } else {
    // If it mentions a specific city like Bengaluru, Mumbai, Pune, assume onsite/hybrid
    const indianCities = ["bengaluru", "bangalore", "mumbai", "delhi", "noida", "gurgaon", "gurugram", "hyderabad", "pune", "chennai", "kolkata", "ahmedabad", "jaipur"];
    if (indianCities.some(c => raw.includes(c))) {
      mode = "onsite";
    }
  }

  // Location string cleanup
  let location = cleanText(modeOrLocation);
  if (!location || location.toLowerCase() === "remote") {
    location = mode === "remote" ? "Remote (India / Global)" : "India";
  }

  return { mode, location };
}

export function parseStipend(rawStipend?: string | number | null): NormalizedStipend {
  if (rawStipend === null || rawStipend === undefined || rawStipend === "") {
    return { min: null, max: null, currency: null, display: "Stipend not disclosed" };
  }

  if (typeof rawStipend === "number") {
    return {
      min: rawStipend,
      max: rawStipend,
      currency: "INR",
      display: `₹${rawStipend.toLocaleString("en-IN")}/month`
    };
  }

  const raw = cleanText(rawStipend);
  const lower = raw.toLowerCase();

  if (lower.includes("unpaid") || lower.includes("free") || lower.includes("expenses only")) {
    return { min: 0, max: 0, currency: "INR", display: "Unpaid / Experience" };
  }
  if (lower.includes("performance") || lower.includes("incentive")) {
    return { min: null, max: null, currency: "INR", display: "Performance based" };
  }
  if (lower.includes("not disclosed") || lower.includes("competitive") || lower.includes("negotiable") || lower.includes("best in industry")) {
    return { min: null, max: null, currency: null, display: "Not disclosed" };
  }

  // Currency detection
  let currency = "INR";
  if (raw.includes("$") || lower.includes("usd")) currency = "USD";
  else if (raw.includes("€") || lower.includes("eur")) currency = "EUR";
  else if (raw.includes("£") || lower.includes("gbp")) currency = "GBP";
  else if (raw.includes("₹") || lower.includes("inr") || lower.includes("rs") || lower.includes("/month") || lower.includes("/mo")) currency = "INR";

  // Number extraction
  // Matches e.g. "15000 - 25000", "15K - 20K", "12,000 /month", "₹18000"
  const numbers: number[] = [];
  const matches = raw.matchAll(/(?:₹|\$|€|£|INR|Rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|l)?/gi);

  for (const m of matches) {
    let numStr = m[1].replace(/,/g, "");
    let val = parseFloat(numStr);
    const multiplier = (m[2] || "").toLowerCase();
    
    if (multiplier === "k") val *= 1000;
    else if (multiplier === "lakh" || multiplier === "l") val *= 100000;
    
    if (!isNaN(val) && val > 0) {
      numbers.push(Math.round(val));
    }
  }

  if (numbers.length === 0) {
    return { min: null, max: null, currency: null, display: raw };
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";

  const display = min === max
    ? `${symbol}${min.toLocaleString("en-IN")}/month`
    : `${symbol}${min.toLocaleString("en-IN")} - ${symbol}${max.toLocaleString("en-IN")}/month`;

  return { min, max, currency, display };
}

export function extractSkills(title: string, description: string, tags: string[] = []): string[] {
  const commonTechSkills = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Java", "C++", "C#",
    "Go", "Rust", "SQL", "MongoDB", "PostgreSQL", "Linux", "Git", "Docker", "Kubernetes",
    "AWS", "Azure", "GCP", "Cybersecurity", "Network Security", "IAM", "Ethical Hacking",
    "SOC", "Penetration Testing", "Incident Response", "SIEM", "Cryptography",
    "Machine Learning", "Deep Learning", "NLP", "LLM", "Computer Vision", "Data Science",
    "Tailwind CSS", "Next.js", "Django", "FastAPI", "Flask", "Spring Boot", "DevOps"
  ];

  const fullText = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
  const matched = new Set<string>();

  // Add existing tags
  for (const t of tags) {
    if (t.trim().length > 1) matched.add(cleanText(t));
  }

  for (const skill of commonTechSkills) {
    const sLower = skill.toLowerCase();
    const regex = new RegExp(`\\b${sLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
    if (regex.test(fullText)) {
      matched.add(skill);
    }
  }

  return Array.from(matched).slice(0, 8);
}
