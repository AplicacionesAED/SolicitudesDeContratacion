import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const msError = searchParams.get("error");

  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  function fail(msg: string) {
    return NextResponse.redirect(`${baseUrl}/perfil?ms_error=${encodeURIComponent(msg)}`);
  }

  if (msError) {
    return fail("Autenticación con Microsoft cancelada o fallida.");
  }

  if (!code || !stateParam) {
    return fail("Parámetros inválidos en la respuesta de Microsoft.");
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get("ms_link_state")?.value;
  cookieStore.delete("ms_link_state");

  if (!raw) {
    return fail("La sesión de vinculación expiró. Intenta de nuevo.");
  }

  let linkState: { state: string; userId: string };
  try {
    linkState = JSON.parse(raw);
  } catch {
    return fail("Estado de sesión inválido.");
  }

  if (linkState.state !== stateParam) {
    return fail("Error de seguridad: estado inválido. Intenta de nuevo.");
  }

  // Exchange authorization code for tokens
  const tenantId = process.env.AZURE_TENANT_ID ?? "common";
  const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid profile email",
      }).toString(),
    }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Microsoft token exchange error:", err);
    return fail("Error al obtener el token de Microsoft. Intenta de nuevo.");
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.id_token) {
    return fail("Microsoft no devolvió un token de identidad válido.");
  }

  const payload = decodeJwtPayload(tokenData.id_token);
  const microsoftId = payload.oid as string | undefined; // Object ID — stable, unique per tenant

  if (!microsoftId) {
    return fail("No se pudo obtener el identificador de usuario de Microsoft.");
  }

  // Ensure this Microsoft account isn't already linked to a different user
  const existing = await prisma.user.findFirst({
    where: { microsoftId, NOT: { id: linkState.userId } },
    select: { id: true },
  });
  if (existing) {
    return fail("Esta cuenta de Microsoft ya está vinculada a otro usuario del sistema.");
  }

  // Save the link
  await prisma.user.update({
    where: { id: linkState.userId },
    data: { microsoftId },
  });

  return NextResponse.redirect(`${baseUrl}/perfil?ms_linked=true`);
}
