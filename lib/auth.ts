// import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseKey);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async signIn({ user, profile }) {
      try {
        // Ensure email exists
        if (!user.email) {
          console.error("SignIn Error: No email provided");
          return false;
        }

        console.log("Processing sign in for:", user.email);

        // Fetch existing users
        const { data, error: listError } =
          await supabase.auth.admin.listUsers();

        if (listError) {
          console.error("Error listing users:", listError.message);
          return false;
        }

        // Check if user already exists
        const existingUser = data.users.find(
          (u) => u.email === user.email
        );

        let supabaseUserId = "";

        // CREATE USER IF NOT FOUND
        if (!existingUser) {
          console.log("Creating new user...");

          const { data: newUser, error: createError } =
            await supabase.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              user_metadata: {
                name: user.name,
                image: user.image,
                google_id: profile?.sub,
                created_at: new Date().toISOString(),
              },
            });

          if (createError) {
            console.error(
              "Error creating user:",
              createError.message
            );
            return false;
          }

          supabaseUserId = newUser.user.id;

          // OPTIONAL: update metadata with Supabase ID
          await supabase.auth.admin.updateUserById(
            supabaseUserId,
            {
              user_metadata: {
                name: user.name,
                image: user.image,
                google_id: profile?.sub,
                supabase_id: supabaseUserId,
                created_at: new Date().toISOString(),
              },
            }
          );

          console.log("User created:", supabaseUserId);
        } else {
          console.log("Existing user found");

          supabaseUserId = existingUser.id;

          // Update last login
          const { error: updateError } =
            await supabase.auth.admin.updateUserById(
              existingUser.id,
              {
                user_metadata: {
                  name: user.name,
                  image: user.image,
                  supabase_id: existingUser.id,
                  last_login: new Date().toISOString(),
                },
              }
            );

          if (updateError) {
            console.error(
              "Error updating user:",
              updateError.message
            );
          }
        }

        // Store Supabase UUID in token
        user.id = supabaseUserId;

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // Store user data in JWT
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      return token;
    },

    async session({ session, token }) {
      // Pass token data into session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }

      return session;
    },
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: true,
};