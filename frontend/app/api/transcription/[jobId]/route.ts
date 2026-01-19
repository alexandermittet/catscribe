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
    });

    const data = await response.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:backend_response',message:'Received from backend',data:{jobId,status:data.status,statusType:typeof data.status,hasText:!!data.text,textLength:data.text?.length,backendStatus:response.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to get transcription' },
        { status: response.status }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:returning_to_frontend',message:'Returning to frontend',data:{jobId,status:data.status,statusType:typeof data.status,hasText:!!data.text},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
