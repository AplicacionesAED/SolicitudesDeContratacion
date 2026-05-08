import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("No autenticado", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let lastCount = -1;
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // connection already closed
        }
      }

      // Heartbeat inicial para que el cliente sepa que la conexión está activa
      send(": ping\n\n");

      intervalId = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(intervalId);
          return;
        }
        try {
          const count = await prisma.notificacion.count({
            where: { userId, leida: false },
          });

          if (count !== lastCount) {
            lastCount = count;
            send(`data: ${JSON.stringify({ totalNoLeidas: count })}\n\n`);
          } else {
            // Mantener la conexión viva
            send(": ping\n\n");
          }
        } catch {
          clearInterval(intervalId);
          try { controller.close(); } catch { /* ya cerrado */ }
        }
      }, 10_000);
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  request.signal.addEventListener("abort", () => {
    clearInterval(intervalId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
