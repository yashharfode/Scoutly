import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import { z } from "zod";
import { profileStorage } from "../storage/profile.storage.js";

const profileSchema = z.object({ name: z.string(), college: z.string(), degree: z.string(), branch: z.string(), year: z.string(), location: z.string(), skills: z.array(z.string()), projects: z.array(z.object({ name: z.string(), description: z.string(), technologies: z.array(z.string()) })), experience: z.array(z.object({ organization: z.string(), title: z.string(), description: z.string(), period: z.string() })), preferredDomains: z.array(z.string()), preferredLocations: z.array(z.string()), preferredMode: z.array(z.enum(["remote", "hybrid", "in_person"])), minimumStipend: z.number().nonnegative(), resumePath: z.string(), github: z.string(), linkedin: z.string(), portfolio: z.string(), email: z.string().email().or(z.literal("")), phone: z.string() });
export const profileRouter = Router();

profileRouter.post("/profile/upload-resume", async (req, res, next) => {
  try {
    const { filename, base64Data } = z.object({
      filename: z.string(),
      base64Data: z.string()
    }).parse(req.body);

    const resumeDir = path.resolve(process.cwd(), "..", "Resume");
    if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const savePath = path.join(resumeDir, cleanFilename);
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(savePath, buffer);

    const relativePath = `Resume/${cleanFilename}`;
    const profile = await profileStorage.get();
    profile.resumePath = relativePath;
    await profileStorage.save(profile);

    res.json({
      success: true,
      resumePath: relativePath,
      message: "Resume uploaded and saved successfully"
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/profile", async (_req, res, next) => { try { res.json(await profileStorage.get()); } catch (error) { next(error); } });
profileRouter.put("/profile", async (req, res, next) => { try { const profile = profileSchema.parse(req.body); res.json(await profileStorage.save(profile)); } catch (error) { next(error); } });
