import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostic: test if Vercel can reach the backend.
 * Open /api/backend-check in the browser to see the result.
 * No secrets are exposed.
 */
export async function GET() {
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const url = `${BACKEND_URL}/health`;

  const out: Record<string, unknown> = {
    backend_url: BACKEND_URL,
    health_url: url,
    backend_reachable: false,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    out.backend_reachable = true;
    out.status_code = response.status;
    out.ok = response.ok;

    const text = await response.text();
    try {
      out.health_body = JSON.parse(text);
    } catch {
      out.health_body = text;
    }

    return NextResponse.json(out);
  } catch (error: unknown) {
    const e = error as NodeJS.ErrnoException & { cause?: unknown };
    out.error = e?.message ?? String(error);
    out.error_code = e?.code ?? (e?.cause as NodeJS.ErrnoException)?.code;
    out.error_cause = e?.cause != null ? String(e.cause) : undefined;
    return NextResponse.json(out, { status: 200 });
  }
}
