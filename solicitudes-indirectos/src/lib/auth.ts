import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID ?? "common",
      profile(profile) {
        return {
          id: profile.sub, // Microsoft Object ID — stable and unique
          name: profile.name,
          email: profile.email,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password!);
        if (!isValid) return null;
        if (!user.activo) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
          roles: JSON.parse(user.roles || '["SOLICITANTE"]'),
          funcionalidadesAdicionales: JSON.parse(user.funcionalidadesAdicionales || '[]'),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "azure-ad") {
        const microsoftId = profile?.sub as string | undefined;
        if (!microsoftId) return false;

        // Check if this is an account-linking request (from profile page)
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const linkIntent = cookieStore.get("ms_link_intent")?.value;

          if (linkIntent) {
            cookieStore.delete("ms_link_intent");

            const msEmail = (profile?.email as string | undefined)?.toLowerCase() ?? null;

            const alreadyLinked = await prisma.user.findFirst({
              where: { microsoftId, NOT: { id: linkIntent } },
              select: { id: true },
            });
            if (alreadyLinked) {
              return `/perfil?ms_error=${encodeURIComponent("Esta cuenta de Microsoft ya está vinculada a otro usuario.")}`;
            }

            await prisma.user.update({
              where: { id: linkIntent },
              data: { microsoftId, microsoftEmail: msEmail },
            });

            return `/perfil?ms_linked=${encodeURIComponent(msEmail ?? "true")}`;
          }
        } catch {
          // cookies() not available in this context — continue with normal login
        }

        // Normal login: verify microsoftId is linked to a user
        const dbUser = await prisma.user.findFirst({
          where: { microsoftId },
          select: { activo: true },
        });

        if (!dbUser) {
          const emailUser = profile?.email
            ? await prisma.user.findUnique({
                where: { email: (profile.email as string).toLowerCase() },
                select: { id: true },
              })
            : null;
          if (emailUser) return "/login?error=OAuthNotLinked";
          return "/login?error=OAuthAccountNotFound";
        }

        if (!dbUser.activo) return "/login?error=OAuthAccountInactive";
        return true;
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "azure-ad" && user) {
        // OAuth sign-in: map Microsoft user to DB user via microsoftId
        const dbUser = await prisma.user.findFirst({
          where: { microsoftId: user.id },
          select: {
            id: true,
            roles: true,
            rol: true,
            cargo: true,
            telefono: true,
            activo: true,
            funcionalidadesAdicionales: true,
          },
        });
        if (dbUser && dbUser.activo) {
          token.id = dbUser.id;
          let parsedRoles: string[];
          try { parsedRoles = JSON.parse(dbUser.roles || '["SOLICITANTE"]'); }
          catch { parsedRoles = [dbUser.rol ?? "SOLICITANTE"]; }
          token.roles = parsedRoles;
          token.rol = parsedRoles[0] ?? "SOLICITANTE";
          token.cargo = dbUser.cargo ?? undefined;
          token.telefono = dbUser.telefono ?? undefined;
          try {
            token.funcionalidadesAdicionales = JSON.parse(dbUser.funcionalidadesAdicionales || "[]");
          } catch {
            token.funcionalidadesAdicionales = [];
          }
        }
        return token;
      }

      if (user) {
        // Credentials sign-in
        token.id = user.id;
        token.roles = (user as any).roles ?? ["SOLICITANTE"];
        token.rol = ((user as any).roles ?? ["SOLICITANTE"])[0];
        token.cargo = (user as any).cargo;
        token.telefono = (user as any).telefono;
        token.funcionalidadesAdicionales = (user as any).funcionalidadesAdicionales ?? [];
      } else if (token.id) {
        // Subsequent requests — always refresh roles from DB so changes take effect immediately
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { roles: true, rol: true, cargo: true, telefono: true, activo: true, funcionalidadesAdicionales: true },
          });
          if (dbUser && dbUser.activo) {
            let parsedRoles: string[];
            try { parsedRoles = JSON.parse(dbUser.roles || '["SOLICITANTE"]'); }
            catch { parsedRoles = [dbUser.rol ?? "SOLICITANTE"]; }
            token.roles = parsedRoles;
            token.rol = parsedRoles[0] ?? "SOLICITANTE";
            token.cargo = dbUser.cargo ?? undefined;
            token.telefono = dbUser.telefono ?? undefined;
            try {
              token.funcionalidadesAdicionales = JSON.parse(dbUser.funcionalidadesAdicionales || "[]");
            } catch {
              token.funcionalidadesAdicionales = [];
            }
          }
        } catch {
          // DB unavailable — keep existing token values
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.rol = (token.roles as string[])[0] ?? "";
        session.user.cargo = token.cargo as string;
        session.user.telefono = token.telefono as string;
        session.user.funcionalidadesAdicionales = (token.funcionalidadesAdicionales as string[]) ?? [];
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions) as any;
