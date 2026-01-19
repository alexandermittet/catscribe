import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'X-API-Key': API_KEY,
  },
});

export interface TranscriptionRequest {
  language: string;
  model: string;
}

export interface TranscriptionResponse {
  job_id: string;
  status: string;
  message?: string;
}

export interface TranscriptionResult {
  job_id: string;
  text: string;
  language: string;
  duration: number;
  download_urls: {
    txt: string;
    srt: string;
    vtt: string;
  };
}

export interface CreditBalance {
  credits: number;
  email?: string;
}

export interface MinutesBalance {
  minutes: number;
  email?: string;
}

export interface UsageLimit {
  remaining_tiny_base: number;
  remaining_small: number;
  is_paid: boolean;
}

export async function transcribeAudio(
  file: File,
  fingerprint: string,
  language: string,
  model: string
): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);
  formData.append('model', model);
  formData.append('fingerprint', fingerprint);

  // Use Next.js API route which proxies to backend with API key
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // Handle different error formats
    const errorMessage = errorData.detail || 
                        (Array.isArray(errorData.detail) ? errorData.detail[0]?.msg || JSON.stringify(errorData.detail) : null) ||
                        errorData.message || 
                        JSON.stringify(errorData);
    
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getTranscription(
  jobId: string,
  fingerprint: string
): Promise<TranscriptionResult> {
  const response = await fetch(`/api/transcription/${jobId}?fingerprint=${encodeURIComponent(fingerprint)}`);
  if (!response.ok) {
    throw new Error('Failed to get transcription');
  }
  return response.json();
}

export async function getMinutes(fingerprint: string): Promise<MinutesBalance> {
  const response = await fetch(`/api/minutes?fingerprint=${encodeURIComponent(fingerprint)}`);
  if (!response.ok) {
    throw new Error('Failed to get minutes');
  }
  return response.json();
}

export async function getUsageLimits(fingerprint: string): Promise<UsageLimit> {
  const response = await fetch(`/api/usage?fingerprint=${encodeURIComponent(fingerprint)}`);
  if (!response.ok) {
    throw new Error('Failed to get usage limits');
  }
  return response.json();
}

export async function claimMinutes(email: string, fingerprint: string): Promise<MinutesBalance> {
  const response = await fetch('/api/minutes/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      fingerprint,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to claim minutes' }));
    throw new Error(error.detail || 'Failed to claim minutes');
  }

  return response.json();
}

export function getDownloadUrl(jobId: string, format: string, fingerprint: string): string {
  // Use frontend API route which proxies to backend with API key
  return `/api/download/${jobId}/${format}?fingerprint=${encodeURIComponent(fingerprint)}`;
}
