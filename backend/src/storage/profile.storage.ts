import path from "node:path";
import type { StudentProfile } from "../models/domain.js";
import { JsonStorage } from "./json-storage.js";

const dataPath = path.resolve(process.cwd(), "..", "data", "student-profile.json");
export const profileStorage = new JsonStorage<StudentProfile>(dataPath, { name: "", college: "", degree: "", branch: "", year: "", location: "", skills: [], projects: [], experience: [], preferredDomains: [], preferredLocations: [], preferredMode: [], minimumStipend: 0, resumePath: "", github: "", linkedin: "", portfolio: "", email: "", phone: "" });
