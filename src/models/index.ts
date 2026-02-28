import { z } from 'zod';

export const JobDescriptionSchema = z.object({
  title: z.string(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  experience_level: z.string(),
});
export type JobDescription = z.infer<typeof JobDescriptionSchema>;

export const ExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  action_bullets: z.array(z.string()),
});

export const ParsedResumeSchema = z.object({
  candidate_name: z.string(),
  skills: z.array(z.string()),
  experiences: z.array(ExperienceSchema),
});
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

export const ScoreReportSchema = z.object({
  exact_match_score: z.number().min(0).max(100),
  similarity_score: z.number().min(0).max(100),
  achievement_score: z.number().min(0).max(100),
  ownership_score: z.number().min(0).max(100),
  overall_tier: z.enum(['Tier A', 'Tier B', 'Tier C']),
  explainability_reasoning: z.object({
    exact_match: z.string(),
    similarity: z.string(),
    achievement: z.string(),
    ownership: z.string(),
    overall: z.string()
  })
});
export type ScoreReport = z.infer<typeof ScoreReportSchema>;
