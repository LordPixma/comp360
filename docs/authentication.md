# Authentication API Documentation

This document describes the email/password authentication endpoints implemented for the COMP360 API.

## Endpoints Overview

All authentication endpoints are available under `/api/v1/auth/`:

- `POST /api/v1/auth/register` - User self-registration
- `POST /api/v1/auth/login` - User login with email and password
- `POST /api/v1/auth/logout` - Invalidate user session
- `POST /api/v1/auth/refresh-token` - Obtain a new JWT using a refresh token
- `POST /api/v1/auth/forgot-password` - Initiate password reset process
- `POST /api/v1/auth/reset-password` - Complete password reset with a token

## Endpoint Details

### POST /api/v1/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "user-id",
    "email": "user@example.com", 
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400` - Validation error (invalid email/password format)
- `409` - User already exists
- `500` - Registration failed

### POST /api/v1/auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid email or password
- `500` - Login failed

### POST /api/v1/auth/logout

Invalidate the user's refresh token.

**Headers:**
```
X-Refresh-Token: abc123...
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/refresh-token

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "abc123..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid or expired refresh token
- `500` - Token refresh failed

### POST /api/v1/auth/forgot-password

Initiate a password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists, a password reset link has been sent",
  "reset_link": "http://localhost/reset-password?token=xyz" // Only in development
}
```

### POST /api/v1/auth/reset-password

Complete password reset using a reset token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newsecurepassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid or expired reset token
- `500` - Password reset failed

## Security Features

1. **Password Hashing**: Passwords are hashed using PBKDF2 with 100,000 iterations
2. **JWT Tokens**: Access tokens expire in 15 minutes for security
3. **Refresh Tokens**: Long-lived tokens (7 days) stored in database with revocation support
4. **Token Revocation**: Logout invalidates refresh tokens, password reset revokes all tokens
5. **Rate Limiting**: Consider implementing rate limiting on authentication endpoints
6. **HTTPS Only**: All authentication should be done over HTTPS in production

## Database Schema

The implementation adds the following to the existing schema:

**Users table additions:**
- `password_hash` - Hashed password (nullable for OAuth-only users)

**New tables:**
- `refresh_tokens` - Store refresh tokens with expiry and revocation status
- `password_reset_tokens` - Store password reset tokens with expiry

## Integration Examples

### Frontend Login Flow

```javascript
// Login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token, refresh_token } = await loginResponse.json();

// Store tokens securely
localStorage.setItem('refresh_token', refresh_token);
// Access token should be kept in memory or secure storage

// Use access token for API calls
const apiResponse = await fetch('/api/v1/tenants', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Refresh token when access token expires
const refreshResponse = await fetch('/api/v1/auth/refresh-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refresh_token: localStorage.getItem('refresh_token')
  })
});

const { access_token: newAccessToken } = await refreshResponse.json();
```

### Password Reset Flow

```javascript
// Request password reset
await fetch('/api/v1/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// User clicks link in email, extract token from URL
const token = new URLSearchParams(location.search).get('token');

// Reset password
await fetch('/api/v1/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: token,
    password: 'newpassword123'
  })
});
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional validation details
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Invalid credentials
- `CONFLICT` - Resource already exists
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error