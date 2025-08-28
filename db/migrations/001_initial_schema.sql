PRAGMA foreign_keys = ON;

-- Core tables
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('EU','UK','US')),
  created_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE memberships (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','contributor','auditor')),
  added_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE controls (
  id TEXT PRIMARY KEY,
  pack TEXT NOT NULL,
  ref TEXT NOT NULL,
  title TEXT NOT NULL,
  guidance TEXT NOT NULL
);

CREATE TABLE control_status (
  tenant_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass','fail','na','exception')),
  evidence_manifest_id TEXT,
  owner_user_id TEXT,
  next_review_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, control_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('aws','github','google','m365','cloudflare')),
  config_json TEXT NOT NULL,
  secret_ref TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE evidence_manifests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  collector TEXT NOT NULL,
  objects_json TEXT NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo','doing','blocked','done')),
  assignee_user_id TEXT,
  due_at TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_user_id) REFERENCES users(id)
);

CREATE TABLE risks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  owner_user_id TEXT,
  treatment TEXT CHECK (treatment IN ('accept','mitigate','transfer','avoid')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  at TEXT NOT NULL,
  meta_json TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_control_status_tenant ON control_status(tenant_id);
CREATE INDEX idx_control_status_updated ON control_status(updated_at);
CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX idx_evidence_tenant ON evidence_manifests(tenant_id);
CREATE INDEX idx_evidence_collected ON evidence_manifests(collected_at);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_user_id);
CREATE INDEX idx_risks_tenant ON risks(tenant_id);
CREATE INDEX idx_audit_tenant_time ON audit_log(tenant_id, at DESC);

-- Append-only guard for audit log
CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
