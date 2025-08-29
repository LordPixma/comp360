CREATE TEMP TABLE integrations_backup(
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  secret_ref TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO integrations_backup SELECT id, tenant_id, type, config_json, secret_ref, created_at FROM integrations;

DROP TABLE integrations;

CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('aws','github','cloudflare')),
  config_json TEXT NOT NULL,
  secret_ref TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

INSERT INTO integrations SELECT id, tenant_id, type, config_json, secret_ref, created_at FROM integrations_backup;

DROP TABLE integrations_backup;
