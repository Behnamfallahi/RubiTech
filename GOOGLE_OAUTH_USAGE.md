# Google OAuth Integration Usage

## Environment Variables Required

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Base URL for callbacks
BASE_URL="http://localhost:4000"

# Frontend URL for redirects
FRONTEND_URL="http://localhost:3000"
```

## API Endpoints

### 1. GET /auth/google
Redirects user to Google OAuth consent screen.

**Usage:**
```javascript
// Frontend can redirect to this URL
window.location.href = 'http://localhost:4000/auth/google';
```

### 2. GET /auth/google/info
Returns Google OAuth URL for frontend integration.

**Response:**
```json
{
  "googleAuthUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "برای ورود با گوگل، از این URL استفاده کنید"
}
```

### 3. GET /auth/google/callback
Handles the OAuth callback from Google (automatically called by Google).

**Flow:**
1. User clicks Google login button
2. Redirects to `/auth/google`
3. User authorizes on Google
4. Google redirects to `/auth/google/callback`
5. Server processes the callback and redirects to frontend dashboard

## Frontend Integration Example

```javascript
// Get Google OAuth URL
const response = await fetch('/auth/google/info');
const { googleAuthUrl } = await response.json();

// Redirect to Google OAuth
window.location.href = googleAuthUrl;
```

## User Creation Flow

1. **Existing User**: If user exists with the same email, they are logged in
2. **New User**: New user is created with:
   - Role: `AMBASSADOR` (default)
   - Status: `PENDING` (requires admin approval)
   - No password (OAuth users don't need passwords)

## Security Notes

- All OAuth flows use HTTPS in production
- JWT tokens are generated for authenticated users
- New users require admin approval before accessing protected routes
- Google OAuth credentials must be properly configured in Google Cloud Console
