import type { ApplicationRecord, Opportunity, DiscoverySearchResponse, StudentProfile } from "../types/domain";

const API_BASE = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "") : "";

const fallbackProfile: StudentProfile = {
  name: "Yash Harfode",
  college: "Samrat Ashok Technological Institute, Vidisha",
  degree: "B.Tech Computer Science (Cybersecurity)",
  branch: "Cybersecurity",
  year: "Expected 2029",
  location: "India",
  skills: ["Python", "Network Traffic Analysis", "IAM", "Ethical Hacking", "React", "Node.js", "Linux"],
  projects: [
    { name: "Scoutly", description: "Autonomous AI agent for student opportunity discovery and application automation", technologies: ["React", "Node.js", "Playwright", "TypeScript"] }
  ],
  experience: [],
  preferredDomains: ["Cybersecurity", "AI/ML", "Software Development"],
  preferredLocations: ["India", "Remote"],
  preferredMode: ["remote", "hybrid", "in_person"],
  minimumStipend: 10000,
  resumePath: "Resume/Yash_Harfode_Resume.pdf",
  github: "https://github.com/yashharfode/",
  linkedin: "https://linkedin.com/in/yashharfode",
  portfolio: "https://yashharfode.dev",
  email: "yashharfode123@gmail.com",
  phone: "+91 9244161034"
};

export async function getProfile(): Promise<StudentProfile> {
  try {
    const response = await fetch(`${API_BASE}/api/profile`);
    if (response.ok) return response.json() as Promise<StudentProfile>;
  } catch {}
  const stored = localStorage.getItem("scoutly-profile");
  return stored ? JSON.parse(stored) as StudentProfile : fallbackProfile;
}

export async function saveProfile(profile: StudentProfile): Promise<StudentProfile> {
  localStorage.setItem("scoutly-profile", JSON.stringify(profile));
  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (response.ok) return response.json() as Promise<StudentProfile>;
  } catch {}
  return profile;
}

export async function searchOpportunities(query: string, forceRefresh = false): Promise<DiscoverySearchResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, forceRefresh })
    });
    if (response.ok) return response.json() as Promise<DiscoverySearchResponse>;
  } catch {}
  return {
    status: "success",
    aiStatus: "fallback",
    stats: { raw: 0, duplicatesRemoved: 0, matched: 0 },
    results: []
  };
}

export async function getSavedOpportunities(): Promise<Opportunity[]> {
  try {
    const res = await fetch(`${API_BASE}/api/saved`);
    if (res.ok) return res.json();
  } catch {}
  return [];
}

export async function saveOpportunity(opportunity: Opportunity): Promise<void> {
  const response = await fetch(`${API_BASE}/api/saved`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opportunity)
  });
  if (!response.ok) throw new Error("Could not save this opportunity.");
}

export async function removeSavedOpportunity(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/saved/${id}`, { method: "DELETE" });
}

export async function getApplications(): Promise<ApplicationRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/api/applications`);
    if (res.ok) return res.json();
  } catch {}
  return [];
}

// Browser Agent Workflow Endpoints
export async function startApplicationSession(params: {
  opportunityId: string;
  customUrl?: string;
  title?: string;
  organization?: string;
  browserMode?: "mock" | "playwright";
}): Promise<{ sessionId: string; url: string; mode: string }> {
  const res = await fetch(`${API_BASE}/api/apply/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error("Failed to initialize browser agent session.");
  return res.json();
}

export async function analyzeApplicationPage(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error("Failed to analyze application page.");
  return res.json();
}

export async function fillApplicationForm(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error("Failed to map and fill application form.");
  return res.json();
}

export async function updateApplicationField(sessionId: string, fieldId: string, value: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/update-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, fieldId, value })
  });
  if (!res.ok) throw new Error("Failed to update field.");
  return res.json();
}

export async function regenerateAIAnswer(sessionId: string, fieldId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/regenerate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, fieldId })
  });
  if (!res.ok) throw new Error("Failed to regenerate answer.");
  return res.json();
}

export async function submitApplication(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error("Failed to submit application.");
  return res.json();
}

export async function cancelApplication(sessionId: string): Promise<any> {
  await fetch(`${API_BASE}/api/apply/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
}

export async function resumeApplicationSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error("Failed to resume session.");
  return res.json();
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/apply/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to get session status.");
  return res.json();
}

export async function uploadResumeFile(file: File): Promise<{ success: boolean; resumePath: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        const res = await fetch(`${API_BASE}/api/profile/upload-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            base64Data
          })
        });
        if (!res.ok) throw new Error("Resume upload failed");
        const data = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function getAgentMemory(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/agent/memory`);
    if (res.ok) return res.json();
  } catch {}
  return null;
}

export async function getStudentEvents(type?: string, mode?: string, search?: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (type && type !== "all") params.append("type", type);
    if (mode && mode !== "all") params.append("mode", mode);
    if (search) params.append("search", search);

    const res = await fetch(`${API_BASE}/api/events?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.events || [];
    }
  } catch {}
  return [];
}
