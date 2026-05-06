import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      rol: string;
      roles: string[];
      cargo?: string;
      telefono?: string;
      funcionalidadesAdicionales: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: string;
    roles: string[];
    cargo?: string;
    telefono?: string;
    funcionalidadesAdicionales: string[];
  }
}
