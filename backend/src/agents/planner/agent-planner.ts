import { ActionTraceStep } from "../memory/experience-memory.types.js";

export type AgentToolName =
  | "evaluate_eligibility"
  | "retrieve_application_memory"
  | "inspect_form"
  | "map_fields"
  | "generate_application_answer"
  | "fill_field"
  | "upload_resume"
  | "verify_field"
  | "request_human_review"
  | "submit_application"
  | "verify_submission"
  | "save_application"
  | "store_application_experience";

export interface PlannerGoal {
  type: "apply_to_internship";
  opportunityId: string;
  opportunityTitle: string;
  organization: string;
  targetUrl: string;
}

export class AgentPlanner {
  private steps: ActionTraceStep[] = [];
  private plan: string[] = [
    "1. Evaluate opportunity & eligibility",
    "2. Retrieve application experience memory",
    "3. Inspect target form DOM",
    "4. Adapt & map form fields to verified profile",
    "5. Synthesize grounded responses for subjective questions",
    "6. Fill form & attach resume",
    "7. Request explicit human review and approval",
    "8. Submit and verify confirmation",
    "9. Record newly learned experience to memory"
  ];

  public getPlan(): string[] {
    return [...this.plan];
  }

  public getTrace(): ActionTraceStep[] {
    return [...this.steps];
  }

  public recordStep(
    stepName: string,
    tool: AgentToolName,
    status: "success" | "warning" | "error" | "info",
    summary: string,
    details?: Record<string, any>
  ): ActionTraceStep {
    const traceStep: ActionTraceStep = {
      step: stepName,
      tool,
      status,
      summary,
      details,
      timestamp: new Date().toISOString()
    };
    this.steps.push(traceStep);
    console.log(`[AgentPlanner] [${status.toUpperCase()}] ${stepName} (${tool}): ${summary}`);
    return traceStep;
  }
}
