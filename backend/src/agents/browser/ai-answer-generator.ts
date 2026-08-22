import { FormField, FieldMapping } from "./browser-types.js";
import { StudentProfile, Opportunity } from "../../models/domain.js";
import { env } from "../../config/env.js";

export async function generateAnswersForUnknowns(
  fields: FormField[], 
  mappings: FieldMapping[], 
  profile: StudentProfile,
  opportunity: Opportunity
): Promise<FieldMapping[]> {
  const updatedMappings = [...mappings];
  
  for (let i = 0; i < updatedMappings.length; i++) {
    const mapping = updatedMappings[i];
    if (mapping.source === "ai_generation_pending" || mapping.status === "unknown") {
      const field = fields.find(f => f.id === mapping.fieldId);
      if (!field) continue;
      
      const questionText = field.labelText || field.name || field.placeholder || "Why are you interested in this role?";
      
      let answer = "";
      if (env.OPENROUTER_API_KEY) {
        try {
          const prompt = `You are helping student ${profile.name} apply for the internship "${opportunity.title}" at "${opportunity.organization}".
Student details:
- College: ${profile.college}
- Degree: ${profile.degree} (${profile.branch})
- Skills: ${profile.skills.join(", ")}
- Projects: ${profile.projects?.map(p => p.name + ": " + p.description).join("; ") || "Hands-on academic and personal coding projects"}

Internship Details:
- Title: ${opportunity.title}
- Organization: ${opportunity.organization}
- Description: ${opportunity.description || ""}
- Required Skills: ${opportunity.skills.join(", ")}

Question to answer:
"${questionText}"

CRITICAL RULES:
1. Write a direct, genuine, first-person response (2-4 sentences).
2. ONLY use the student's actual skills and degree. NEVER invent fake companies, certifications, or past employment.
3. Sound human, humble, yet capable.
4. Output ONLY the plain text answer with no quotes or markdown.`;

          const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
              model: env.AI_MODEL,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 300
            })
          });

          if (response.ok) {
            const data = await response.json() as any;
            answer = data.choices?.[0]?.message?.content?.trim() || "";
          }
        } catch (err) {
          console.warn("AI generation failed, falling back to deterministic template:", err);
        }
      }

      if (!answer) {
        const topSkills = profile.skills.slice(0, 3).join(", ");
        answer = `I am eager to contribute to the ${opportunity.title} role at ${opportunity.organization}. As a ${profile.degree} student at ${profile.college}, I have built strong foundational skills in ${topSkills}. I am excited to apply these practically and learn alongside your engineering team.`;
      }

      updatedMappings[i] = {
        ...mapping,
        value: answer,
        source: "ai_generated",
        confidence: 0.92,
        status: "review", // AI answers require human-in-the-loop review
        aiGenerated: true
      };
    }
  }
  
  return updatedMappings;
}
