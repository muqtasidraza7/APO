import { z } from "zod";

export const cvSchema = z.object({
  skills: z.array(z.string()).describe("List of technical and soft skills extracted"),
  job_title: z.string().describe("Most recent or primary job title from CV"),
  experience_level: z.enum(["Junior", "Mid-Level", "Senior", "Lead", "Executive"]).describe("Estimated experience level"),
  years_of_experience: z.number().int().describe("Total years of professional experience"),
  summary: z.string().describe("One sentence professional summary based on the CV"),
});

export const projectDocumentSchema = z.object({
  summary: z.string().describe("2-3 sentence executive summary"),
  project_type: z.enum(["software", "construction", "marketing", "consulting", "research", "other"]).catch("other"),
  budget_estimate: z.number().nullable().optional().default(null).or(z.string().transform(s => s ? parseFloat(s) : null)).describe("Estimated budget if mentioned"),
  currency: z.string().nullable().optional().default(null).describe("Currency code e.g. USD"),
  timeline_weeks: z.number().nullable().optional().default(null).or(z.string().transform(s => s ? parseInt(s, 10) : null)).describe("Estimated duration in weeks"),
  start_date: z.string().nullable().optional().default(null).describe("YYYY-MM-DD if mentioned"),
  end_date: z.string().nullable().optional().default(null).describe("YYYY-MM-DD if mentioned"),
  client_info: z.object({
    name: z.string().nullable().optional().default(null),
    contact_person: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
  }).nullable().optional().default(null),
  requirements: z.array(z.string()).max(8).optional().default([]).describe("Key requirements (up to 8)"),
  milestones: z.array(z.object({
    title: z.string(),
    week: z.number().or(z.string().transform(s => parseInt(s, 10))),
    deliverable: z.string(),
    success_criteria: z.string().nullable().optional().default(null).describe("Measurable success criterion for this milestone"),
  })).max(8).optional().default([]).describe("Up to 8 key milestones with measurable success criteria"),
  risks: z.array(z.object({
    description: z.string(),
    severity: z.enum(["high", "medium", "low"]).catch("medium"),
    mitigation: z.string(),
  })).max(6).optional().default([]).describe("Top 6 risks with mitigations"),
  required_skills: z.array(z.string()).max(10).optional().default([]),
  success_criteria: z.array(z.string()).max(6).optional().default([]).describe("Key project-level success criteria as flat strings"),
  constraints: z.array(z.string()).max(5).optional().default([]).describe("Key constraints as flat strings"),
  assumptions: z.array(z.string()).max(5).optional().default([]),
});

export const taskAssignmentSchema = z.object({
  task_title: z.string().describe("Exact milestone title from list"),
  assigned_to: z.array(z.string()).describe("Array of team-member-uuids (1–5 members)"),
  assigned_to_names: z.array(z.string()).describe("Names/job titles of all assigned members in the same order as assigned_to"),
  reasoning: z.string().describe("Explain the assignment. If a pattern influenced this decision, cite it explicitly with the date and reason."),
  pattern_warning: z.string().nullable().describe("Brief warning text if a caution pattern applies, otherwise null"),
});

export const taskAssignmentsArraySchema = z.array(taskAssignmentSchema);

export const smartAllocationSchema = z.object({
  assignments: z.array(z.object({
    task_name: z.string().describe("Exact milestone title"),
    week_number: z.number(),
    worker_ids: z.array(z.string()).describe("Array of UUIDs from team list (1–5 members)"),
    reasoning: z.string().describe("Explain WHY the assigned member(s) are the best fit. Cite skills, experience level, performance score, and any patterns that influenced the decision."),
    non_selection_notes: z.string().describe("For a single assignee: briefly explain why 1–2 other team members were less suitable (mention their role or skill gap). For 2+ assignees: briefly summarize why this specific group works well together for this milestone."),
    dependency_risk_warning: z.string().optional().describe("If this assignment poses a risk due to dependencies or overloaded worker capacity, explain it here briefly. Otherwise leave empty."),
  })),
});
