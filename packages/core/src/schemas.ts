import { z } from 'zod'

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: z.enum(['EU', 'UK', 'US']),
  created_at: z.string()
})

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  created_at: z.string()
})

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.enum(['EU', 'UK', 'US'])
})

export const CreateIntegrationSchema = z.object({
  type: z.enum(['aws', 'github', 'google', 'm365', 'cloudflare']),
  config: z.record(z.any())
})

export const CollectEvidenceSchema = z.object({
  controlId: z.string(),
  integrationId: z.string().optional()
})

export const UpdateControlStatusSchema = z.object({
  status: z.enum(['pass', 'fail', 'na', 'exception']),
  owner_user_id: z.string().optional(),
  next_review_at: z.string().optional()
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  status: z.enum(['todo', 'doing', 'blocked', 'done']),
  assignee_user_id: z.string().optional(),
  due_at: z.string().optional(),
  meta: z.record(z.any()).optional()
})

export const CreateRiskSchema = z.object({
  title: z.string().min(1).max(200),
  impact: z.number().int().min(1).max(5),
  likelihood: z.number().int().min(1).max(5),
  owner_user_id: z.string().optional(),
  treatment: z.enum(['accept', 'mitigate', 'transfer', 'avoid']).optional()
})

// Admin schemas
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  is_global_admin: z.boolean().optional().default(false)
})

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  is_global_admin: z.boolean().optional()
})

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(100),
  region: z.enum(['EU', 'UK', 'US'])
})

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  region: z.enum(['EU', 'UK', 'US']).optional()
})

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  urgent: z.boolean().optional().default(false)
})