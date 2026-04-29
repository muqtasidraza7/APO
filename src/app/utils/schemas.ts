import { z } from "zod";

export const cvSchema = z.object({
  skills: z.array(z.string()).describe("List of technical and soft skills extracted"),
  job_title: z.string().describe("Most recent or primary job title from CV"),
  experience_level: z.enum(["Junior", "Mid-Level", "Senior", "Lead", "Executive"]).describe("Estimated experience level"),
  years_of_experience: z.number().int().describe("Total years of professional experience"),
  summary: z.string().describe("One sentence professional summary based on the CV"),
});

export const projectDocumentSchema = z.object({
  summary: z.string().describe("2-3 sentence executive summary of the project"),
  project_type: z.enum(["software", "construction", "marketing", "consulting", "research", "other"]).catch("other"),
  budget_estimate: z.number().optional().describe("Estimated budget if mentioned"),
  currency: z.string().optional().describe("Currency like USD"),
  timeline_weeks: z.number().optional().describe("Estimated duration in weeks"),
  start_date: z.string().optional().describe("YYYY-MM-DD format if mentioned"),
  end_date: z.string().optional().describe("YYYY-MM-DD format if mentioned"),
  client_info: z.object({
    name: z.string().optional(),
    contact_person: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    stakeholders: z.array(z.string()).optional(),
  }).optional(),
  requirements: z.array(z.string()).optional(),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimated_hours: z.number().optional(),
    required_skills: z.array(z.string()).optional(),
    priority: z.enum(["high", "medium", "low"]).catch("medium"),
    dependencies: z.array(z.string()).optional(),
    acceptance_criteria: z.array(z.string()).optional(),
  })).optional(),
  milestones: z.array(z.object({
    title: z.string(),
    week: z.number(),
    deliverable: z.string(),
    success_criteria: z.string().optional(),
  })).optional(),
  risks: z.array(z.object({
    description: z.string(),
    severity: z.enum(["high", "medium", "low"]).catch("medium"),
    mitigation: z.string(),
  })).optional(),
  required_skills: z.array(z.string()).optional(),
  success_criteria: z.object({
    kpis: z.array(z.string()).optional(),
    acceptance_criteria: z.array(z.string()).optional(),
    quality_metrics: z.array(z.string()).optional(),
  }).optional(),
  constraints: z.object({
    technical: z.array(z.string()).optional(),
    business: z.array(z.string()).optional(),
    regulatory: z.array(z.string()).optional(),
  }).optional(),
  assumptions: z.array(z.string()).optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
});

export const taskAssignmentSchema = z.object({
  task_title: z.string().describe("Exact milestone title from list"),
  assigned_to: z.string().describe("team-member-uuid"),
  assigned_to_name: z.string().describe("Job title or name of the assigned person"),
  reasoning: z.string().describe("Explain the assignment. If a pattern influenced this decision, cite it explicitly with the date and reason."),
  pattern_warning: z.string().nullable().describe("Brief warning text if a caution pattern applies, otherwise null"),
});

export const taskAssignmentsArraySchema = z.array(taskAssignmentSchema);

export const smartAllocationSchema = z.object({
  assignments: z.array(z.object({
    task_name: z.string().describe("Exact milestone title"),
    week_number: z.number(),
    worker_id: z.string().describe("UUID from team list"),
    reasoning: z.string().describe("Explain the assignment. If a pattern influenced this decision, cite it explicitly."),
  })),
});
