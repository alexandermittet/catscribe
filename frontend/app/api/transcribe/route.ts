import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // #region agent log
    const fs = require('fs');
    fs.appendFileSync('/Users/alexandermittet/LOCAL documents/transkriber-app/.cursor/debug.log',JSON.stringify({location:'route.ts:10',message:'Next.js API route entry',data:{model:formData.get('model'),language:formData.get('language')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})+'\n');
    // #endregion
    
    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    });

    // #region agent log
    fs.appendFileSync('/Users/alexandermittet/LOCAL documents/transkriber-app/.cursor/debug.log',JSON.stringify({location:'route.ts:21',message:'backend response received BEFORE json parse',data:{ok:response.ok,status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})+'\\n');
    // #endregion

    const data = await response.json();

    // #region agent log
    fs.appendFileSync('/Users/alexandermittet/LOCAL documents/transkriber-app/.cursor/debug.log',JSON.stringify({location:'route.ts:28',message:'backend response parsed successfully',data:{data,responseOk:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})+'\\n');
    // #endregion

    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Transcription failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    // #region agent log
    const fs = require('fs');
    fs.appendFileSync('/Users/alexandermittet/LOCAL documents/transkriber-app/.cursor/debug.log',JSON.stringify({location:'route.ts:43',message:'Next.js API route exception',data:{errorMessage:error.message,errorStack:error.stack,errorType:error.constructor.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})+'\\n');
    // #endregion
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
