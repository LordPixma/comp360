#!/bin/bash

# Evidence API Test Examples
# These are example cURL commands for testing the evidence management endpoints

# Set your API base URL and auth token
API_BASE="https://your-worker.your-subdomain.workers.dev/v1"
AUTH_TOKEN="your-jwt-token-here"
COMPANY_ID="your-company-id-here"

echo "Evidence Management API Test Examples"
echo "====================================="

echo ""
echo "1. Upload Evidence"
echo "------------------"
echo "POST ${API_BASE}/companies/${COMPANY_ID}/evidence"

# Create a test file (base64 encoded "Hello World")
TEST_FILE_CONTENT="SGVsbG8gV29ybGQ="

cat << EOF
curl -X POST "${API_BASE}/companies/${COMPANY_ID}/evidence" \\
  -H "Authorization: Bearer ${AUTH_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "control_id": "soc2_cc_1_1",
    "collector": "manual_upload",
    "file": {
      "name": "test-document.txt",
      "type": "text/plain",
      "size": 11,
      "content": "'${TEST_FILE_CONTENT}'"
    }
  }'
EOF

echo ""
echo ""
echo "2. Download Evidence"
echo "-------------------"
echo "GET ${API_BASE}/evidence/{evidenceId}"

cat << EOF
curl -X GET "${API_BASE}/evidence/EVIDENCE_ID_HERE" \\
  -H "Authorization: Bearer ${AUTH_TOKEN}" \\
  -o downloaded-evidence.txt
EOF

echo ""
echo ""
echo "3. Delete Evidence"
echo "------------------"
echo "DELETE ${API_BASE}/evidence/{evidenceId}"

cat << EOF
curl -X DELETE "${API_BASE}/evidence/EVIDENCE_ID_HERE" \\
  -H "Authorization: Bearer ${AUTH_TOKEN}"
EOF

echo ""
echo ""
echo "Notes:"
echo "- Replace EVIDENCE_ID_HERE with the actual evidenceId returned from upload"
echo "- Replace AUTH_TOKEN with a valid JWT token"
echo "- Replace COMPANY_ID with your tenant/company ID"
echo "- The test file content 'SGVsbG8gV29ybGQ=' decodes to 'Hello World'"