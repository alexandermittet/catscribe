import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fingerprint } = body;

    if (!email || !fingerprint) {
      return NextResponse.json(
        { detail: 'Email and fingerprint are required' },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append('email', email);
    formData.append('fingerprint', fingerprint);

    const response = await fetch(`${BACKEND_URL}/credits/claim`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to claim credits' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ERROR] Claim credits API failed:', error);
    return NextResponse.json(
      { 
        detail: `Internal server error: ${error.message}`,
        backend_url: BACKEND_URL,
        error_type: error.constructor.name
      },
      { status: 500 }
    );
  }
}
