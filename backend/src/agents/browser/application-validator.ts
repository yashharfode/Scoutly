import { FormField, FieldMapping } from "./browser-types.js";

export interface ValidationResult {
  ready: boolean;
  completion: number;
  safeFields: number;
  reviewFields: number;
  missingFields: number;
  missingRequired: string[];
}

export function validateApplication(fields: FormField[], mappings: FieldMapping[]): ValidationResult {
  let safeFields = 0;
  let reviewFields = 0;
  let missingFields = 0;
  const missingRequired: string[] = [];

  for (const field of fields) {
    const mapping = mappings.find(m => m.fieldId === field.id);
    
    if (!mapping || !mapping.value) {
      missingFields++;
      if (field.required) {
        missingRequired.push(field.labelText || field.name || field.id);
      }
    } else if (mapping.status === "safe") {
      safeFields++;
    } else if (mapping.status === "review" || mapping.status === "unknown") {
      reviewFields++;
      // If a required field is marked for review, it's not strictly "missing" but needs user action.
      // We might consider it "ready for review" but not "ready to submit".
    }
  }

  const totalFields = fields.length;
  const completion = totalFields > 0 ? (safeFields + reviewFields) / totalFields : 1;
  const ready = missingRequired.length === 0;

  return {
    ready,
    completion,
    safeFields,
    reviewFields,
    missingFields,
    missingRequired
  };
}
