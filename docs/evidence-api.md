# Evidence Management API

This document describes the evidence management endpoints implemented to handle file upload, download, and deletion for compliance controls.

## Endpoints

### 1. Upload Evidence

**Endpoint:** `POST /v1/companies/{companyId}/evidence`  
**Description:** Upload new evidence for a control  
**Authentication:** Required (Bearer token)  
**Permissions:** owner, admin, contributor

#### Request Body
```json
{
  "control_id": "string",
  "collector": "string", 
  "file": {
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 1024,
    "content": "base64_encoded_file_content"
  }
}
```

#### Response
```json
{
  "success": true,
  "evidenceId": "manifest_id",
  "storageKey": "tenant_id/manifest_id/filename"
}
```

### 2. Download Evidence

**Endpoint:** `GET /v1/evidence/{evidenceId}`  
**Description:** Download a specific piece of evidence  
**Authentication:** Required (Bearer token)  
**Permissions:** Any authenticated user with access to the tenant

#### Response
Returns the file directly with appropriate Content-Type and Content-Disposition headers.

### 3. Delete Evidence

**Endpoint:** `DELETE /v1/evidence/{evidenceId}`  
**Description:** Remove a piece of evidence  
**Authentication:** Required (Bearer token)  
**Permissions:** owner, admin

#### Response
```json
{
  "success": true
}
```

## Implementation Details

- **Tenant Isolation:** All evidence is scoped to the authenticated user's tenant
- **File Storage:** Files are stored in Cloudflare R2 bucket with path structure: `{tenant_id}/{manifest_id}/{filename}`
- **Metadata:** Evidence metadata is stored in the `evidence_manifests` table
- **Audit Logging:** All operations are logged to the audit trail
- **File Integrity:** SHA256 hashes are calculated and stored for all uploaded files
- **Security:** Company ID parameter must match the authenticated user's tenant

## Database Schema

The implementation uses the existing `evidence_manifests` table:

```sql
CREATE TABLE evidence_manifests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  collector TEXT NOT NULL,
  objects_json TEXT NOT NULL,  -- JSON array of file objects
  hash TEXT NOT NULL,          -- Manifest hash
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE
);
```

## Error Handling

- **400 Bad Request:** Invalid request body or validation errors
- **401 Unauthorized:** Missing or invalid authentication token
- **403 Forbidden:** Insufficient permissions or cross-tenant access attempt
- **404 Not Found:** Evidence not found or access denied
- **500 Internal Server Error:** Server-side processing errors

All errors follow the standard format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```