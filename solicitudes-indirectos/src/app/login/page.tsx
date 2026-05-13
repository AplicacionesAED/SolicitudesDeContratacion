"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/shared/ui/spinner";

const MicrosoftLogo = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <rect x="0"  y="0"  width="10" height="10" fill="#F25022" />
    <rect x="11" y="0"  width="10" height="10" fill="#7FBA00" />
    <rect x="0"  y="11" width="10" height="10" fill="#00A4EF" />
    <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
  </svg>
);

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthNotLinked:
    "Esta cuenta de Microsoft aún no está vinculada. Inicia sesión con correo y contraseña y vincúlala desde tu perfil.",
  OAuthAccountNotFound:
    "No existe ningún usuario registrado con esta cuenta de Microsoft.",
  OAuthAccountInactive:
    "Tu cuenta está inactiva. Contacta al administrador.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const oauthError = searchParams.get("error");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email:    email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  async function handleMicrosoftLogin() {
    setMsLoading(true);
    await signIn("azure-ad", { callbackUrl });
  }

  if (oauthError) {
    const oauthErrorText = OAUTH_ERROR_MESSAGES[oauthError] ?? "Error al iniciar sesión con Microsoft.";
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8 flex flex-col items-center gap-5">
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 w-full text-sm text-red-700"
        >
          <span className="font-semibold shrink-0">✕</span>
          <span>{oauthErrorText}</span>
        </div>
        <a
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Volver al inicio de sesión
        </a>
      </div>
    );
  }

  const displayError = error;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
      <h2 className="text-base font-semibold text-gray-900 mb-6 text-center">
        Iniciar sesión
      </h2>

      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-5 text-sm text-red-700"
        >
          <span className="font-semibold shrink-0">✕</span>
          <span>{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@baiak.com"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
        >
          {loading && <Spinner size="sm" className="text-white" />}
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">o</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Microsoft button */}
      <button
        type="button"
        onClick={handleMicrosoftLogin}
        disabled={msLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {msLoading ? <Spinner size="sm" /> : <MicrosoftLogo />}
        {msLoading ? "Conectando…" : "Iniciar sesión con Microsoft"}
      </button>

      <p className="mt-4 text-center text-xs text-gray-400 leading-relaxed">
        El acceso con Microsoft requiere vincular tu cuenta desde tu perfil.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
            <span className="text-white text-xl font-bold tracking-tight">BK</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Baia Kristal</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de Solicitudes Indirectos</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8"><Spinner size="lg" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Baia Kristal — Uso interno
        </p>
      </div>
    </div>
  );
}
