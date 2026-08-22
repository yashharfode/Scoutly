import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LocalStorage } from "./storage.interface.js";

export class JsonStorage<T> implements LocalStorage<T> {
  constructor(private readonly filePath: string, private readonly initialValue: T) {}
  async get(): Promise<T> { try { return JSON.parse(await readFile(this.filePath, "utf8")) as T; } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return this.save(this.initialValue); throw error; } }
  async save(value: T): Promise<T> { await mkdir(path.dirname(this.filePath), { recursive: true }); await writeFile(this.filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8"); return value; }
}
