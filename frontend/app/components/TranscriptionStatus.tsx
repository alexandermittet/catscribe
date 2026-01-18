'use client';

import { useEffect, useState } from 'react';
import { getTranscription, TranscriptionResult } from '../lib/api';

interface TranscriptionStatusProps {
  jobId: string;
  fingerprint: string;
  onComplete: (result: TranscriptionResult) => void;
  onError: (error: string) => void;
}

export default function TranscriptionStatus({
  jobId,
  fingerprint,
  onComplete,
  onError,
}: TranscriptionStatusProps) {
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed'>('queued');

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await getTranscription(jobId, fingerprint);
        setStatus('completed');
        onComplete(result);
        clearInterval(pollInterval);
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Still processing
          setStatus('processing');
        } else {
          // Error
          setStatus('failed');
          onError(error.response?.data?.detail || 'Transcription failed');
          clearInterval(pollInterval);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, fingerprint, onComplete, onError]);

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center space-x-3">
        {status === 'queued' && (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Queued for processing...</span>
          </>
        )}
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Transcribing audio...</span>
          </>
        )}
        {status === 'completed' && (
          <>
            <div className="rounded-full h-5 w-5 bg-green-500"></div>
            <span className="text-green-700">Transcription completed!</span>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="rounded-full h-5 w-5 bg-red-500"></div>
            <span className="text-red-700">Transcription failed</span>
          </>
        )}
      </div>
    </div>
  );
}
