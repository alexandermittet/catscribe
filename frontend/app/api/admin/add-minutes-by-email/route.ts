import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_KEY = process.env.API_KEY || "";

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get("X-Admin-Key");
  if (!adminKey || adminKey !== API_KEY) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  let body: { email?: string; minutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON. Expected: { email, minutes }" },
      { status: 400 }
    );
  }
  const { email, minutes } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { detail: "Valid email is required" },
      { status: 400 }
    );
  }
  const m = typeof minutes === "number" ? minutes : parseFloat(String(minutes));
  if (isNaN(m) || m <= 0) {
    return NextResponse.json(
      { detail: "minutes must be a positive number" },
      { status: 400 }
    );
  }
  const formData = new FormData();
  formData.append("email", String(email).trim());
  formData.append("minutes", String(m));
  const response = await fetch(`${BACKEND_URL}/minutes/add-by-email`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { detail: data.detail || "Failed to add minutes" },
      { status: response.status }
    );
  }
  return NextResponse.json(data);
}
