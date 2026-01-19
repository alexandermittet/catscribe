'use client';

import { useEffect, useState, useRef } from 'react';
import { getTranscription, TranscriptionResult } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

interface TranscriptionStatusProps {
  jobId: string;
  fingerprint: string;
  onComplete: (result: TranscriptionResult) => void;
  onError: (error: string) => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}${seconds < 10 ? ' ' : ''}${seconds === 1 ? 's' : 's'}`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

export default function TranscriptionStatus({
  jobId,
  fingerprint,
  onComplete,
  onError,
}: TranscriptionStatusProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed'>('queued');
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotalTime, setEstimatedTotalTime] = useState<number | undefined>();
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      
      try {
        const result = await getTranscription(jobId, fingerprint);
        
        if (!isMounted) return;
        
        // Update status
        const currentStatus = result.status || 'processing';
        console.log(`[TranscriptionStatus] Job ${jobId} status: ${currentStatus}`, {
          progress: result.progress,
          elapsed_time: result.elapsed_time,
          estimated_total_time: result.estimated_total_time,
          time_remaining: result.time_remaining,
          text_length: result.text?.length
        });
        
        setStatus(currentStatus);
        
        // Update progress data if available
        if (result.progress !== undefined) {
          setProgress(result.progress);
        }
        if (result.elapsed_time !== undefined) {
          setElapsedTime(result.elapsed_time);
        }
        if (result.estimated_total_time !== undefined) {
          setEstimatedTotalTime(result.estimated_total_time);
        }
        if (result.time_remaining !== undefined) {
          setTimeRemaining(result.time_remaining);
        }
        
        // If completed, call onComplete
        if (currentStatus === 'completed') {
          console.log(`[TranscriptionStatus] Job ${jobId} completed, calling onComplete`);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          onCompleteRef.current(result);
        } else if (currentStatus === 'failed') {
          console.error(`[TranscriptionStatus] Job ${jobId} failed`);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          onErrorRef.current('Transcription failed');
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        console.error(`[TranscriptionStatus] Error polling job ${jobId}:`, error);
        
        // Check if it's a 404 (job not found) or other error
        if (error.message?.includes('404') || error.response?.status === 404) {
          // Job not found - might be queued, keep polling
          console.log(`[TranscriptionStatus] Job ${jobId} not found (404), keeping status as queued`);
          setStatus('queued');
        } else {
          // Error
          console.error(`[TranscriptionStatus] Job ${jobId} error, stopping polling`);
          setStatus('failed');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          onErrorRef.current(error.response?.data?.detail || error.message || 'Transcription failed');
        }
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 2000);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, fingerprint]);

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
      <div className="space-y-3">
        {/* Status indicator */}
        <div className="flex items-center space-x-3">
          {status === 'queued' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">{t('status.queued')}</span>
            </>
          )}
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-700">{t('status.processing')}</span>
            </>
          )}
          {status === 'completed' && (
            <>
              <div className="rounded-full h-5 w-5 bg-green-500"></div>
              <span className="text-green-700">{t('status.completed')}</span>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="rounded-full h-5 w-5 bg-red-500"></div>
              <span className="text-red-700">{t('status.failed')}</span>
            </>
          )}
        </div>

        {/* Progress bar and info - only show when processing */}
        {(status === 'processing' || status === 'queued') && (
          <>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Progress percentage */}
            <div className="text-sm text-gray-700">
              {progressPercent}% {t('status.complete')}
            </div>

            {/* Time information */}
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                {t('status.elapsedTime')}: {formatTime(elapsedTime)}
                {estimatedTotalTime && ` / ${formatTime(estimatedTotalTime)}`}
              </div>
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <div>
                  {t('status.timeRemaining')}: ~{formatTime(timeRemaining)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
