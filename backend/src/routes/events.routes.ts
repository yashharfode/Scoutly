import { Router } from "express";

export interface StudentEvent {
  id: string;
  title: string;
  organizer: string;
  type: "hackathon" | "workshop" | "competition" | "conference";
  description: string;
  date: string;
  mode: "online" | "in-person" | "hybrid";
  location: string;
  registrationDeadline: string;
  rewards: string;
  tags: string[];
  registrationUrl: string;
  featured?: boolean;
}

export const STUDENT_EVENTS: StudentEvent[] = [
  {
    id: "event-smart-india-hackathon",
    title: "Smart India Hackathon (SIH 2026)",
    organizer: "Ministry of Education & AICTE",
    type: "hackathon",
    description: "World's biggest open innovation hackathon solving real problem statements from Government ministries, state departments, and top industries.",
    date: "Sep 15 - 18, 2026",
    mode: "hybrid",
    location: "Pan-India Nodal Centers & Online",
    registrationDeadline: "2026-09-05",
    rewards: "🏆 ₹1,00,000 Per Problem Statement + National Recognition",
    tags: ["Hackathon", "AICTE", "Government", "AI", "Cybersecurity", "IoT"],
    registrationUrl: "https://www.sih.gov.in/",
    featured: true
  },
  {
    id: "event-asian-paints-alchemy",
    title: "Asian Paints Alchemy 2026 (Innovation Challenge)",
    organizer: "Asian Paints",
    type: "competition",
    description: "National engineering challenge to design next-generation automated software pipelines and systems architecture with direct PPO interviews.",
    date: "Aug 30 - Sep 22, 2026",
    mode: "online",
    location: "Online (National)",
    registrationDeadline: "2026-09-22",
    rewards: "🏆 ₹5,00,000 Prize Pool + Pre-Placement Internship Offers (PPO)",
    tags: ["Competition", "PPO Track", "Engineering", "Software Design"],
    registrationUrl: "https://unstop.com/competitions/crp-asian-paints-alchemy-2026-asian-paints-1704498",
    featured: true
  },
  {
    id: "event-google-genai-bootcamp",
    title: "Google Cloud GenAI & Agentic Workflows Workshop",
    organizer: "Google Developer Groups (GDG)",
    type: "workshop",
    description: "Hands-on technical workshop on building multi-modal autonomous agents with Gemini 1.5 Pro, Vertex AI RAG pipelines, and LangChain orchestration.",
    date: "Sep 02, 2026 · 6:00 PM IST",
    mode: "online",
    location: "Live Stream + Cloud Skills Lab",
    registrationDeadline: "2026-09-01",
    rewards: "📜 Google Cloud Verified Certificate + $300 Vertex AI Lab Credits",
    tags: ["Workshop", "GenAI", "Gemini", "Google Cloud", "Agents"],
    registrationUrl: "https://gdg.community.dev/",
    featured: true
  },
  {
    id: "event-cyber-threat-hunting-workshop",
    title: "Offensive Security & Threat Hunting Bootcamp",
    organizer: "Nullcon & CyberPeace Foundation",
    type: "workshop",
    description: "Live interactive drills on memory forensics, network packet analysis with Wireshark, active directory penetration testing, and MITRE ATT&CK mapping.",
    date: "Aug 29 - 30, 2026",
    mode: "online",
    location: "Virtual Labs",
    registrationDeadline: "2026-08-28",
    rewards: "📜 CyberPeace Certification + Bug Bounty Fast-Track Passes",
    tags: ["Workshop", "Cybersecurity", "Threat Hunting", "Ethical Hacking", "Wireshark"],
    registrationUrl: "https://nullcon.net/"
  },
  {
    id: "event-ethindia-hackathon",
    title: "ETHIndia 2026 — Asia's Largest Web3 & AI Hackathon",
    organizer: "Devfolio & Ethereum Foundation",
    type: "hackathon",
    description: "36-hour in-person hackathon bringing together 2,000+ top student developers, engineers, and founders to build decentralized AI & Web3 applications.",
    date: "Dec 04 - 06, 2026",
    mode: "in-person",
    location: "KTPO, Bengaluru",
    registrationDeadline: "2026-10-15",
    rewards: "🏆 $100,000+ Bounties + Travel Grants + VC Mentorship",
    tags: ["Hackathon", "Devfolio", "Web3", "AI", "Bengaluru"],
    registrationUrl: "https://ethindia.co/"
  },
  {
    id: "event-aws-serverless-masterclass",
    title: "AWS Cloud & Serverless Microservices Masterclass",
    organizer: "AWS User Group India",
    type: "workshop",
    description: "Architect production microservices using AWS Lambda, DynamoDB single-table design, EventBridge, and automated Terraform infrastructure.",
    date: "Sep 12, 2026",
    mode: "online",
    location: "Virtual Hands-On Session",
    registrationDeadline: "2026-09-10",
    rewards: "📜 AWS Community Badge + 50% AWS Certification Voucher",
    tags: ["Workshop", "AWS", "Serverless", "Cloud", "Terraform"],
    registrationUrl: "https://aws.amazon.com/developer/community/usergroups/india/"
  },
  {
    id: "event-microsoft-imagine-cup",
    title: "Microsoft Imagine Cup 2026 Global Challenge",
    organizer: "Microsoft Learn",
    type: "competition",
    description: "Global student technology competition to build purpose-driven AI and cloud startups using Microsoft Azure AI and GitHub Copilot.",
    date: "Oct 01 - Nov 30, 2026",
    mode: "online",
    location: "Global Virtual Track",
    registrationDeadline: "2026-10-31",
    rewards: "🏆 $100,000 Grand Prize + Mentorship with Satya Nadella",
    tags: ["Competition", "Microsoft", "Azure", "Startups", "Global"],
    registrationUrl: "https://imaginecup.microsoft.com/"
  },
  {
    id: "event-mit-hackmit",
    title: "HackMIT 2026 (Global Student Track)",
    organizer: "MIT Tech Club",
    type: "hackathon",
    description: "MIT's flagship annual hackathon open to worldwide college students building revolutionary hardware, software, and AI inventions.",
    date: "Sep 19 - 21, 2026",
    mode: "hybrid",
    location: "Cambridge, MA & Global Discord",
    registrationDeadline: "2026-09-08",
    rewards: "🏆 $50,000+ Prize Categories + Global Hardware Grants",
    tags: ["Hackathon", "MIT", "AI", "Open Source", "Global"],
    registrationUrl: "https://hackmit.org/"
  }
];

export const eventsRouter = Router();

eventsRouter.get("/events", async (req, res) => {
  const { type, mode, search } = req.query;

  let filtered = [...STUDENT_EVENTS];

  if (type && type !== "all") {
    filtered = filtered.filter(e => e.type === type);
  }

  if (mode && mode !== "all") {
    filtered = filtered.filter(e => e.mode === mode);
  }

  if (search && typeof search === "string" && search.trim().length > 0) {
    const s = search.toLowerCase();
    filtered = filtered.filter(e => 
      e.title.toLowerCase().includes(s) ||
      e.organizer.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s) ||
      e.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  res.json({
    status: "ok",
    count: filtered.length,
    events: filtered
  });
});
