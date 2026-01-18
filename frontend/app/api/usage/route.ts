import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    const fingerprint = request.nextUrl.searchParams.get('fingerprint');
    
    console.log('[DEBUG] Usage API - BACKEND_URL:', BACKEND_URL);
    console.log('[DEBUG] Usage API - fingerprint:', fingerprint);
    
    if (!fingerprint) {
      return NextResponse.json(
        { detail: 'Fingerprint required' },
        { status: 400 }
      );
    }

    const url = `${BACKEND_URL}/usage?fingerprint=${fingerprint}`;
    console.log('[DEBUG] Usage API - Calling:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    console.log('[DEBUG] Usage API - Response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.log('[DEBUG] Usage API - Error response data:', data);
      return NextResponse.json(
        { detail: data.detail || 'Failed to get usage limits' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ERROR] Usage API failed:', error);
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
