import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { supabase } from "./supabase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { data: user } = await supabase
          .from("User")
          .select("id, email, name, image, role, password, isActive, branches")
          .eq("email", email)
          .maybeSingle();

        if (!user || !user.password || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          branches: user.branches ?? [],
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.branches = (user as { branches?: string[] }).branches ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.branches = (token.branches as string[] | undefined) ?? [];

        // The JWT cookie caches role/branches for the life of the session
        // (up to 8h — see auth.config.ts). Without this, a SUPER_ADMIN
        // demoting someone or reassigning their branch wouldn't take effect
        // for an already-logged-in user until they happened to log out and
        // back in — a real authorization staleness gap, not just a UX one.
        // Re-fetching here runs on every auth() call, so changes apply on
        // the user's very next request instead.
        const { data: current } = await supabase
          .from("User")
          .select("role, branches, isActive")
          .eq("id", token.id as string)
          .maybeSingle();

        if (current && current.isActive) {
          session.user.role = current.role;
          session.user.branches = current.branches ?? [];
        } else if (current && !current.isActive) {
          // Deactivated mid-session: strip access immediately rather than
          // waiting for them to be kicked out on next login. They stay
          // "authenticated" (still has an id), but every role/branch check
          // downstream now sees no role match and no assigned branches.
          session.user.role = "";
          session.user.branches = [];
        }
      }
      return session;
    },
  },
});
