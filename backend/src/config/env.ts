import "dotenv/config";
import { z } from "zod";

const schema = z.object({ PORT: z.coerce.number().default(3000), MOCK_MODE: z.string().default("true").transform((value) => value === "true"), BROWSER_MODE: z.enum(["mock", "playwright"]).default("mock"), OPENROUTER_API_KEY: z.string().optional(), OPENAI_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"), AI_MODEL: z.string().default("google/gemma-4-26b-a4b-it:free"), AI_FALLBACK_MODEL: z.string().optional() });
export const env = schema.parse(process.env);
