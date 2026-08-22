import { FormField, FieldMapping } from "./browser-types.js";
import { StudentProfile } from "../../models/domain.js";

// Specificity-ordered multi-signal mapping rules (most specific to least specific)
const MAPPING_RULES: { key: keyof StudentProfile; keywords: string[] }[] = [
  { 
    key: "github", 
    keywords: ["github profile", "github url", "github link", "github.com", "git repo", "github username", "github"] 
  },
  { 
    key: "linkedin", 
    keywords: ["linkedin profile", "linkedin url", "linkedin link", "linkedin.com", "linkedin"] 
  },
  { 
    key: "portfolio", 
    keywords: ["portfolio url", "personal website", "portfolio website", "personal site", "portfolio link", "portfolio"] 
  },
  { 
    key: "resumePath", 
    keywords: ["upload resume", "attach resume", "resume / cv", "curriculum vitae", "upload cv", "resume", "cv", "attach file"] 
  },
  { 
    key: "email", 
    keywords: ["email address", "e-mail", "contact email", "primary email", "email"] 
  },
  { 
    key: "phone", 
    keywords: ["phone number", "contact number", "mobile number", "mobile", "telephone", "phone", "cell", "userMbNum"] 
  },
  { 
    key: "skills", 
    keywords: ["key skills", "technical skills", "skills", "technologies", "skillsets", "tech stack", "skills designations", "enter skills"] 
  },
  { 
    key: "college", 
    keywords: ["college", "university", "institute", "institution", "school name", "academic institution"] 
  },
  { 
    key: "degree", 
    keywords: ["degree", "program", "course", "qualification", "undergraduate degree"] 
  },
  { 
    key: "branch", 
    keywords: ["branch", "major", "field of study", "specialization", "department", "stream"] 
  },
  { 
    key: "location", 
    keywords: ["current location", "city", "residence", "where are you based", "location", "enter location"] 
  },
  { 
    key: "name", 
    keywords: ["full name", "candidate name", "your name", "applicant name", "first and last name", "first name", "name"] 
  }
];

const SENSITIVE_KEYWORDS = [
  "dob", "date of birth", "birth date", "gender", "sex", "ssn", "national id", "aadhaar", 
  "government id", "disability", "work authorization", "visa", "sponsorship", "citizenship", 
  "ethnicity", "race", "salary", "stipend", "expected monthly stipend", "expected compensation", 
  "criminal", "medical", "legal declaration", "felony", "drug test"
];

const SUBJECTIVE_KEYWORDS = [
  "why are you interested", "why should we hire", "why do you want", "tell us about yourself",
  "describe a project", "what makes you a good fit", "cover letter", "relevant experience",
  "share something you built", "interest in this role", "why join", "about yourself", "statement of purpose", "sop"
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function containsWordOrPhrase(haystack: string, needle: string): boolean {
  const normHaystack = ` ${normalize(haystack)} `;
  const normNeedle = ` ${normalize(needle)} `;
  return normHaystack.includes(normNeedle);
}

export function mapFields(fields: FormField[], profile: StudentProfile): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  for (const field of fields) {
    const label = normalize(field.labelText || "");
    const name = normalize(field.name || "");
    const placeholder = normalize(field.placeholder || "");
    const aria = normalize(field.ariaLabel || "");
    const id = normalize(field.id || "");

    const fullText = `${label} ${name} ${placeholder} ${aria} ${id}`;

    // 1. Sensitive / Legal -> strictly review required
    if (SENSITIVE_KEYWORDS.some(k => containsWordOrPhrase(fullText, k))) {
      mappings.push({
        fieldId: field.id,
        value: "",
        source: "sensitive_user_input_required",
        confidence: 0,
        status: "review"
      });
      continue;
    }

    // 2. Deterministic semantic match with student profile FIRST (Prevents skills from becoming AI paragraphs!)
    let matchedKey: keyof StudentProfile | null = null;
    let matchConfidence = 0;

    for (const rule of MAPPING_RULES) {
      const matchFound = rule.keywords.some(kw => {
        return containsWordOrPhrase(label, kw) ||
               containsWordOrPhrase(name, kw) ||
               containsWordOrPhrase(id, kw) ||
               containsWordOrPhrase(placeholder, kw);
      });

      if (matchFound) {
        matchedKey = rule.key;
        matchConfidence = 0.95;
        break;
      }
    }

    if (matchedKey === "github") {
      const isUsernameField = containsWordOrPhrase(fullText, "username") || containsWordOrPhrase(fullText, "handle");
      const githubUrl = profile.github || "https://github.com/yashharfode";
      const username = githubUrl.replace(/^https?:\/\/github\.com\/?/i, "").replace(/\/$/, "") || "yashharfode";
      
      const val = (isUsernameField && field.type !== "url") ? username : githubUrl;
      mappings.push({
        fieldId: field.id,
        value: val,
        source: "student_profile",
        confidence: 0.98,
        status: "safe"
      });
      continue;
    }

    if (matchedKey === "skills") {
      const skillsStr = Array.isArray(profile.skills) ? profile.skills.join(", ") : String(profile.skills || "Python, React, Node.js");
      mappings.push({
        fieldId: field.id,
        value: skillsStr,
        source: "student_profile",
        confidence: 0.98,
        status: "safe"
      });
      continue;
    }

    if (matchedKey) {
      const profileVal = profile[matchedKey];
      if (profileVal && String(profileVal).trim().length > 0) {
        mappings.push({
          fieldId: field.id,
          value: String(profileVal),
          source: "student_profile",
          confidence: matchConfidence,
          status: "safe"
        });
        continue;
      }
    }

    // 3. Subjective / Long-form -> AI generation (Only if not matched to a profile field like skills)
    if (field.tag === "textarea" || SUBJECTIVE_KEYWORDS.some(k => containsWordOrPhrase(fullText, k))) {
      mappings.push({
        fieldId: field.id,
        value: "",
        source: "ai_generation_pending",
        confidence: 0,
        status: "review",
        aiGenerated: true
      });
      continue;
    }

    // 4. Unknown web field
    mappings.push({
      fieldId: field.id,
      value: "",
      source: "unknown_web_field",
      confidence: 0,
      status: "unknown"
    });
  }

  return mappings;
}
