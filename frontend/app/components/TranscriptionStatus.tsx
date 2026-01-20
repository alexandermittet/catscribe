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

  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let isPolling = false; // Prevent overlapping polls

    const poll = async (): Promise<boolean> => {
      // Returns true if should continue polling, false if done
      if (!isMounted || isPolling) return true;
      isPolling = true;
      
      console.log(`[TranscriptionStatus] Polling job ${jobId}...`);
      
      try {
        const result = await getTranscription(jobId, fingerprint);
        
        if (!isMounted) return false;
        
        // Determine status
        let currentStatus = result.status;
        
        // Fallback: if we have text and download URLs, it's completed
        if (!currentStatus && result.text && result.text.length > 0 && result.download_urls && Object.keys(result.download_urls).length > 0) {
          currentStatus = 'completed';
        }
        
        // Default to processing if no status
        if (!currentStatus) {
          currentStatus = 'processing';
        }
        
        console.log(`[TranscriptionStatus] Job ${jobId} status: ${currentStatus}, progress: ${result.progress}, text_length: ${result.text?.length || 0}`);
        
        // Update state
        setStatus(currentStatus);
        if (result.progress !== undefined) setProgress(result.progress);
        if (result.elapsed_time !== undefined) setElapsedTime(result.elapsed_time);
        if (result.estimated_total_time !== undefined) setEstimatedTotalTime(result.estimated_total_time);
        if (result.time_remaining !== undefined) setTimeRemaining(result.time_remaining);
        
        // Check if done
        const isCompleted = currentStatus === 'completed' || (result.text && result.text.length > 0);
        
        if (isCompleted) {
          console.log(`[TranscriptionStatus] Job ${jobId} COMPLETED! Calling onComplete.`);
          setStatus('completed');
          onCompleteRef.current(result);
          return false; // Stop polling
        } else if (currentStatus === 'failed') {
          console.error(`[TranscriptionStatus] Job ${jobId} FAILED!`);
          onErrorRef.current('Transcription failed');
          return false; // Stop polling
        }
        
        return true; // Continue polling
      } catch (error: any) {
        if (!isMounted) return false;
        
        console.error(`[TranscriptionStatus] Error polling job ${jobId}:`, error.message);
        
        // 404 means job not in Redis yet - keep polling
        if (error.message?.includes('404') || error.response?.status === 404) {
          console.log(`[TranscriptionStatus] Job ${jobId} not found (404), will retry...`);
          setStatus('queued');
          return true; // Continue polling
        } else {
          // Real error - stop
          console.error(`[TranscriptionStatus] Job ${jobId} fatal error, stopping.`);
          setStatus('failed');
          onErrorRef.current(error.response?.data?.detail || error.message || 'Transcription failed');
          return false; // Stop polling
        }
      } finally {
        isPolling = false;
      }
    };

    const scheduleNextPoll = () => {
      if (!isMounted) return;
      timeoutId = setTimeout(async () => {
        const shouldContinue = await poll();
        if (shouldContinue && isMounted) {
          scheduleNextPoll();
        }
      }, 2000);
    };

    // Start polling
    console.log(`[TranscriptionStatus] Starting polling for job ${jobId}`);
    
    // Initial poll, then schedule recurring
    poll().then(shouldContinue => {
      if (shouldContinue && isMounted) {
        scheduleNextPoll();
      }
    });

    return () => {
      console.log(`[TranscriptionStatus] Cleanup for job ${jobId}`);
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
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
