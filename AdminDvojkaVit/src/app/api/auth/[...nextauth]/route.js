import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authAPI } from '../../../../lib/api'; // Keep this for login

// Define the backend API URL (ensure this is set in your environment)
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const result = await authAPI.login(credentials.email, credentials.password);
          console.log('[NextAuth Authorize] Login API Result:', result);

          if (result.success && result.data) {
            const userId = result.data.user_id || result.data.id; // Get the ID
            console.log(`[NextAuth Authorize] User ID from backend: ${userId}`);
            console.log(`[NextAuth Authorize] Access Token from backend: ${result.data.access_token ? 'Present' : 'Missing'}`);
            return {
              id: userId, // Use the string 'id' field
              email: credentials.email,
              name: result.data.username || result.data.email,
              token: result.data.access_token,
              refreshToken: result.data.refresh_token
            };
          }
          console.log('[NextAuth Authorize] Login failed or no data returned.');
          return null;
        } catch (error) {
          console.error('[NextAuth Authorize] Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in: User object is available
      if (account && user) {
        console.log('[NextAuth JWT Callback - Initial Sign In] User object:', user);
        token.id = user.id; // Set initial ID from authorize result
        token.email = user.email;
        token.accessToken = user.token;
        token.refreshToken = user.refreshToken;
        console.log(`[NextAuth JWT Callback - Initial Sign In] Token after initial assignment:`, token);
      }

      // Fetch/refresh profile data if access token exists
      if (token.accessToken) {
        try {
          console.log(`[NextAuth JWT Callback] Attempting to fetch /api/users/me. Current token ID: ${token.id}`);
          const profileResponse = await fetch(`${BACKEND_API_URL}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log(`[NextAuth JWT Callback] Profile data received:`, profileData);

            // --- Log before and after ID update ---
            console.log(`[NextAuth JWT Callback] Token ID *before* profile update: ${token.id}`);
            console.log(`[NextAuth JWT Callback] Profile data ID received: ${profileData.id}`);
            if (profileData.id) {
              token.id = profileData.id; // Update token.id from profile
              console.log(`[NextAuth JWT Callback] Token ID *after* profile update: ${token.id}`);
            } else {
              console.warn(`[NextAuth JWT Callback] Profile data missing 'id' field. Token ID remains: ${token.id}`);
            }
            // --- End ID Update Logging ---

            // Merge other relevant profile data into the token
            token.subscription_status = profileData.subscription_status;
            token.subscription_tier = profileData.subscription_tier;
            token.api_key = profileData.api_key;
            token.is_email_verified = profileData.is_email_verified;
            token.company_name = profileData.company_name;
            token.username = profileData.username;
            // Add other fields as needed
          } else {
            console.error(`[NextAuth JWT Callback] Failed to fetch user profile: ${profileResponse.status} ${profileResponse.statusText}`);
            // Handle potential token expiration/refresh here
            // TODO: Implement token refresh logic using token.refreshToken if accessToken is expired
          }
        } catch (error) {
          console.error('[NextAuth JWT Callback] Error fetching user profile:', error);
        }
      } else {
        console.warn('[NextAuth JWT Callback] No access token found in token object. Cannot fetch profile.');
      }

      console.log('[NextAuth JWT Callback] Returning final token:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth Session Callback] Received token:', token);
      // Populate session.user from the potentially updated token
      session.user.id = token.id;
      session.user.email = token.email;
      // SECURITY NOTE: Exposing the raw access token to the client-side session should be done with caution.
      // Consider if the frontend truly needs it directly. Prefer using Next.js API routes as a proxy
      // for backend calls where possible.
      session.user.token = token.accessToken;
      session.user.subscription_status = token.subscription_status;
      session.user.subscription_tier = token.subscription_tier;
      session.user.api_key = token.api_key;
      session.user.is_email_verified = token.is_email_verified;
      session.user.company_name = token.company_name;
      session.user.username = token.username;

      console.log("[NextAuth Session Callback] Populated final session:", session);
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your_fallback_secret_key_but_use_env_variable'
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
