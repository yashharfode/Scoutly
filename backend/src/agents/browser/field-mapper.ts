import { FormField, FieldMapping } from "./browser-types.js";
import { StudentProfile } from "../../models/domain.js";

// Specificity-ordered multi-signal mapping rules for ALL job portals and ATS systems
const MAPPING_RULES: { key: keyof StudentProfile | string; keywords: string[]; defaultVal?: string }[] = [
  // 1. Social & Portfolio Links
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
    keywords: ["portfolio url", "personal website", "portfolio website", "personal site", "portfolio link", "portfolio", "other website", "blog"] 
  },

  // 2. Resume & Documents
  { 
    key: "resumePath", 
    keywords: ["upload resume", "attach resume", "resume / cv", "curriculum vitae", "upload cv", "resume", "cv", "attach file", "upload file"] 
  },

  // 3. Contact Information
  { 
    key: "email", 
    keywords: ["email address", "e-mail", "contact email", "primary email", "email"] 
  },
  { 
    key: "phone", 
    keywords: ["phone number", "contact number", "mobile number", "mobile", "telephone", "phone", "cell", "usermbnum", "contact"] 
  },

  // 4. Name Variations (Full, First, Last)
  { 
    key: "firstName", 
    keywords: ["first name", "given name", "fname", "forename"] 
  },
  { 
    key: "lastName", 
    keywords: ["last name", "surname", "family name", "lname"] 
  },
  { 
    key: "name", 
    keywords: ["full name", "candidate name", "your name", "applicant name", "first and last name", "legal name", "name"] 
  },

  // 5. Skills & Tech Stack
  { 
    key: "skills", 
    keywords: ["key skills", "technical skills", "skills", "technologies", "skillsets", "tech stack", "skills designations", "enter skills", "primary skills"] 
  },

  // 6. Education & Academics
  { 
    key: "college", 
    keywords: ["college", "university", "institute", "institution", "school name", "academic institution", "college name"] 
  },
  { 
    key: "degree", 
    keywords: ["degree", "program", "course", "qualification", "undergraduate degree", "education level"] 
  },
  { 
    key: "branch", 
    keywords: ["branch", "major", "field of study", "specialization", "department", "stream", "discipline"] 
  },
  { 
    key: "year", 
    keywords: ["graduation year", "passing year", "year of graduation", "batch", "grad year", "expected graduation"] 
  },
  { 
    key: "gpa", 
    keywords: ["cgpa", "gpa", "percentage", "marks", "grades", "academic score"],
    defaultVal: "8.5 CGPA"
  },

  // 7. Location & Address
  { 
    key: "location", 
    keywords: ["current location", "city", "residence", "where are you based", "location", "enter location", "current city"] 
  },
  { 
    key: "country", 
    keywords: ["country", "nationality", "citizenship"],
    defaultVal: "India"
  },

  // 8. Work Authorization & Availability (Universal ATS standards)
  { 
    key: "workAuth", 
    keywords: ["authorized to work", "legally authorized", "work authorization", "work permit", "eligible to work", "legal right to work"],
    defaultVal: "Yes"
  },
  { 
    key: "sponsorship", 
    keywords: ["require sponsorship", "need sponsorship", "visa sponsorship", "require visa sponsorship", "sponsorship now or in future"],
    defaultVal: "No"
  },
  { 
    key: "availability", 
    keywords: ["notice period", "how soon can you start", "earliest start date", "available to start", "availability", "when can you join", "start date"],
    defaultVal: "Immediate / Immediately"
  },
  { 
    key: "experienceYears", 
    keywords: ["years of experience", "total experience", "relevant experience in years", "experience level"],
    defaultVal: "0-1 Years"
  },
  { 
    key: "gender", 
    keywords: ["gender", "sex"],
    defaultVal: "Male"
  }
];

const SUBJECTIVE_KEYWORDS = [
  "why are you interested", "why should we hire", "why do you want", "tell us about yourself",
  "describe a project", "what makes you a good fit", "cover letter", "relevant experience",
  "share something you built", "interest in this role", "why join", "about yourself", "statement of purpose", "sop", "pitch", "message to hiring manager"
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

  const nameParts = (profile.name || "Yash Harfode").trim().split(" ");
  const firstName = nameParts[0] || "Yash";
  const lastName = nameParts.slice(1).join(" ") || "Harfode";

  for (const field of fields) {
    const label = normalize(field.labelText || "");
    const name = normalize(field.name || "");
    const placeholder = normalize(field.placeholder || "");
    const aria = normalize(field.ariaLabel || "");
    const id = normalize(field.id || "");

    const fullText = `${label} ${name} ${placeholder} ${aria} ${id}`;

    // 1. Semantic match with universal ATS rules
    let matchedRule: typeof MAPPING_RULES[0] | null = null;

    for (const rule of MAPPING_RULES) {
      const matchFound = rule.keywords.some(kw => {
        return containsWordOrPhrase(label, kw) ||
               containsWordOrPhrase(name, kw) ||
               containsWordOrPhrase(id, kw) ||
               containsWordOrPhrase(placeholder, kw);
      });

      if (matchFound) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      if (matchedRule.key === "firstName") {
        mappings.push({
          fieldId: field.id,
          value: firstName,
          source: "student_profile",
          confidence: 0.98,
          status: "safe"
        });
        continue;
      }

      if (matchedRule.key === "lastName") {
        mappings.push({
          fieldId: field.id,
          value: lastName,
          source: "student_profile",
          confidence: 0.98,
          status: "safe"
        });
        continue;
      }

      if (matchedRule.key === "github") {
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

      if (matchedRule.key === "skills") {
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

      // Check standard profile field
      const profileKey = matchedRule.key as keyof StudentProfile;
      const profileVal = profile[profileKey];
      if (profileVal && String(profileVal).trim().length > 0) {
        mappings.push({
          fieldId: field.id,
          value: String(profileVal),
          source: "student_profile",
          confidence: 0.95,
          status: "safe"
        });
        continue;
      }

      // Default value for universal ATS questions (Work auth, sponsorship, availability)
      if (matchedRule.defaultVal) {
        mappings.push({
          fieldId: field.id,
          value: matchedRule.defaultVal,
          source: "universal_ats_defaults",
          confidence: 0.92,
          status: "safe"
        });
        continue;
      }
    }

    // 2. Checkboxes (e.g. Terms of Service, Agree to Privacy Policy, Confirm accurate details)
    if (field.type === "checkbox") {
      mappings.push({
        fieldId: field.id,
        value: "true",
        source: "policy_confirmation",
        confidence: 0.99,
        status: "safe"
      });
      continue;
    }

    // 3. Subjective / Long-form -> AI generation
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
