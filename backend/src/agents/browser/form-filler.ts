import { BrowserAgent, FormField, FieldMapping } from "./browser-types.js";

export interface FillReport {
  filledCount: number;
  failedCount: number;
  errors: { fieldId: string; error: string }[];
}

export async function fillForm(
  agent: BrowserAgent, 
  fields: FormField[], 
  mappings: FieldMapping[]
): Promise<FillReport> {
  let filledCount = 0;
  let failedCount = 0;
  const errors: { fieldId: string; error: string }[] = [];

  for (const mapping of mappings) {
    if (mapping.status === "safe" || mapping.status === "review") {
      const field = fields.find(f => f.id === mapping.fieldId);
      if (field && field.selector && mapping.value) {
        if (field.type === "file") {
          const res = await agent.uploadFile(field.selector, mapping.value);
          if (res.success) {
            filledCount++;
          } else {
            failedCount++;
            errors.push({ fieldId: field.id, error: res.error || "File upload failed" });
          }
        } else {
          const res = await agent.fillField(field.selector, mapping.value);
          if (res.success) {
            filledCount++;
          } else {
            failedCount++;
            errors.push({ fieldId: field.id, error: res.error || "Field fill failed" });
          }
        }
      }
    }
  }

  return { filledCount, failedCount, errors };
}
