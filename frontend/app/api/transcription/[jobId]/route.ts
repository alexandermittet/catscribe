import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    const fingerprint = request.nextUrl.searchParams.get('fingerprint');
    
    if (!fingerprint) {
      return NextResponse.json(
        { detail: 'Fingerprint required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/transcription/${jobId}?fingerprint=${encodeURIComponent(fingerprint)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to get transcription' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
