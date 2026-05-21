# Google OAuth Setup Instructions

## What was changed

Your Time Tracker system has been converted from OTP-based authentication to **Google OAuth** using NextAuth.js.

### Updated Files
- **lib/auth.ts** - NextAuth configuration with Google provider
- **app/signin/page.tsx** - Google sign-in button
- **app/signup/page.tsx** - Auto-redirect to Google sign-in (no more manual signup)
- **app/page.tsx** - Dashboard now uses NextAuth sessions
- **app/providers.tsx** - New SessionProvider wrapper
- **app/layout.tsx** - Added SessionProvider wrapper
- **app/api/auth/[...nextauth]/route.ts** - NextAuth API route (already existed)

## Setup Steps

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google+ API**:
   - Search for "Google+ API" in the search bar
   - Click on the result and press "Enable"
4. Create OAuth 2.0 Client ID:
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Save **Client ID** and **Client Secret**

### 2. Add Environment Variables

Create or update `.env.local` in your `time_tracker` directory:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-console

# Supabase (keep existing)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMTP (optional, for OTP fallback if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@timetracker.com
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Install Dependencies

Make sure NextAuth provider is installed:
```bash
npm install next-auth@^4.24.14
```

### 4. Test Locally

```bash
cd time_tracker
npm run dev
```

- Go to `http://localhost:3000`
- You'll be redirected to `/signin`
- Click "Sign in with Google"
- Sign in with your Google account
- First-time users are auto-created in Supabase

### 5. Dashboard & Logout

- After sign-in, you'll see your dashboard with your Google profile picture
- Click "Sign out" button in the top right to log out

## How It Works

1. **User clicks Google Sign In** → Redirected to Google login
2. **Google authenticates** → Redirected back to `/api/auth/callback/google`
3. **NextAuth verifies** the Google token
4. **User auto-created in Supabase** if it's their first time (with name & picture)
5. **JWT token created** and stored in session
6. **Redirected to dashboard**

## Key Features

✅ **Auto user creation** - New users automatically created on first sign-in  
✅ **Profile data** - Name and profile picture stored in Supabase metadata  
✅ **Secure sessions** - JWT-based, 30-day expiration  
✅ **Protected routes** - Dashboard requires authentication  
✅ **Sign out** - Available in dashboard header  

## API Integration

The `/api/sessions` endpoint should now check for user ID via NextAuth session instead of Supabase bearer token.

Current implementation expects `X-User-ID` header. Update your API routes if needed.

## Troubleshooting

**"Invalid Client ID" error:**
- Check that GOOGLE_CLIENT_ID matches exactly
- Ensure Google+ API is enabled
- Verify redirect URI matches exactly

**Blank page or redirect loop:**
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches your domain
- Clear browser cookies

**User not being created:**
- Check Supabase credentials are valid
- Check browser console for error messages
- Verify Supabase auth table exists

## Next Steps

1. Remove OTP routes if not needed:
   - `/api/auth/send-otp/route.ts`
   - `/api/auth/verify-otp/route.ts`
   - `/api/auth/otp-store.ts`

2. Update any API endpoints that relied on bearer token auth

3. Configure production domain in Google Cloud Console
