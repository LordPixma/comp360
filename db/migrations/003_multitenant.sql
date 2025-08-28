ALTER TABLE tenants RENAME TO companies;

ALTER TABLE memberships RENAME COLUMN tenant_id TO company_id;
ALTER TABLE control_status RENAME COLUMN tenant_id TO company_id;
ALTER TABLE integrations RENAME COLUMN tenant_id TO company_id;
ALTER TABLE evidence_manifests RENAME COLUMN tenant_id TO company_id;
ALTER TABLE tasks RENAME COLUMN tenant_id TO company_id;
ALTER TABLE risks RENAME COLUMN tenant_id TO company_id;
ALTER TABLE audit_log RENAME COLUMN tenant_id TO company_id;
