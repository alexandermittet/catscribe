'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await getTranscription(jobId, fingerprint);
        
        // Update status
        const currentStatus = result.status || 'processing';
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
          onComplete(result);
          clearInterval(pollInterval);
        } else if (currentStatus === 'failed') {
          onError('Transcription failed');
          clearInterval(pollInterval);
        }
      } catch (error: any) {
        // Check if it's a 404 (job not found) or other error
        if (error.message?.includes('404') || error.response?.status === 404) {
          // Job not found - might be queued, keep polling
          setStatus('queued');
        } else {
          // Error
          setStatus('failed');
          onError(error.response?.data?.detail || error.message || 'Transcription failed');
          clearInterval(pollInterval);
        }
      }
    }, 1000); // Poll every 1 second for smoother progress updates

    return () => clearInterval(pollInterval);
  }, [jobId, fingerprint, onComplete, onError]);

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
