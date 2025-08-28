export interface Tenant {
  id: string
  name: string
  region: 'EU' | 'UK' | 'US'
  created_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
}

export interface Membership {
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'contributor' | 'auditor'
  added_at: string
}

export interface Control {
  id: string
  pack: string
  ref: string
  title: string
  guidance: string
}

export interface ControlStatus {
  tenant_id: string
  control_id: string
  status: 'pass' | 'fail' | 'na' | 'exception'
  evidence_manifest_id?: string
  owner_user_id?: string
  next_review_at?: string
  updated_at: string
}

export interface Integration {
  id: string
  tenant_id: string
  type: 'aws' | 'github' | 'google' | 'm365' | 'cloudflare'
  config_json: string
  secret_ref?: string
  created_at: string
}

export interface EvidenceManifest {
  id: string
  tenant_id: string
  control_id: string
  collected_at: string
  collector: string
  objects_json: string
  hash: string
}

export interface Task {
  id: string
  tenant_id: string
  title: string
  status: 'todo' | 'doing' | 'blocked' | 'done'
  assignee_user_id?: string
  due_at?: string
  meta_json?: string
}

export interface Risk {
  id: string
  tenant_id: string
  title: string
  impact: number
  likelihood: number
  owner_user_id?: string
  treatment?: 'accept' | 'mitigate' | 'transfer' | 'avoid'
}

export interface AuditLogEntry {
  id: string
  tenant_id: string
  actor: string
  action: string
  target?: string
  at: string
  meta_json?: string
}

// Job types
export type JobType = 
  | 'collect.evidence' 
  | 'refresh.tenant' 
  | 'export.audit' 
  | 'webhook.dispatch'

export interface BaseJob {
  type: JobType
  id: string
  tenant: string
  createdAt: string
  dedupeKey?: string
}

export interface CollectEvidenceJob extends BaseJob {
  type: 'collect.evidence'
  controlId: string
  integrationId: string
}

export interface RefreshTenantJob extends BaseJob {
  type: 'refresh.tenant'
}

// Connector types
export interface ConnectorContext {
  tenant: string
  integrationId: string
  secrets: Record<string, string>
  rateLimiter?: any
}

export interface EvidenceObject {
  key: string
  sha256: string
  size: number
  contentType: string
}

export interface CollectorResult {
  manifestId: string
  objects: EvidenceObject[]
  status: 'pass' | 'fail' | 'na'
}

export interface CheckSpec {
  id: string
  controlId: string
  type: string
  config: Record<string, any>
}

export interface Connector {
  type: 'aws' | 'github' | 'google' | 'm365' | 'cloudflare'
  capabilities: string[]
  auth: {
    kind: 'oauth' | 'apikey'
    scopes: string[]
  }
  collect(ctx: ConnectorContext, check: CheckSpec): Promise<CollectorResult>
}