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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:poll_entry',message:'Poll started',data:{jobId,isMounted},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!isMounted) return;
      
      try {
        const result = await getTranscription(jobId, fingerprint);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:poll_after_fetch',message:'Received result from API',data:{jobId,status:result.status,statusType:typeof result.status,hasText:!!result.text,textLength:result.text?.length,hasDownloadUrls:!!result.download_urls},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
        // #endregion
        
        if (!isMounted) return;
        
        // Update status - check multiple indicators
        let currentStatus = result.status;
        
        // Fallback: if we have text and download URLs, it's completed
        if (!currentStatus && result.text && result.text.length > 0 && result.download_urls && Object.keys(result.download_urls).length > 0) {
          currentStatus = 'completed';
          console.log(`[TranscriptionStatus] Job ${jobId} - status missing but has text and download URLs, treating as completed`);
        }
        
        // Default to processing if no status
        if (!currentStatus) {
          currentStatus = 'processing';
        }
        
        console.log(`[TranscriptionStatus] Job ${jobId} status: ${currentStatus}`, {
          progress: result.progress,
          elapsed_time: result.elapsed_time,
          estimated_total_time: result.estimated_total_time,
          time_remaining: result.time_remaining,
          text_length: result.text?.length,
          has_download_urls: !!result.download_urls,
          status_from_result: result.status
        });
        console.log(`[TranscriptionStatus] Status check - currentStatus: "${currentStatus}", type: ${typeof currentStatus}, === 'completed': ${currentStatus === 'completed'}`);
        
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
        const isCompleted = currentStatus === 'completed' || result.text?.length > 0;
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:completion_check',message:'Checking completion',data:{jobId,currentStatus,statusComparison:currentStatus==='completed',hasText:result.text?.length>0,isCompleted,willCallOnComplete:isCompleted},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
        if (isCompleted) {
          console.log(`[TranscriptionStatus] Job ${jobId} completed (status: ${currentStatus}, text length: ${result.text?.length}), calling onComplete`);
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:before_clear_interval',message:'About to clear interval and call onComplete',data:{jobId,intervalExists:!!pollIntervalRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
          // #endregion
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Ensure status is set to completed before calling onComplete
          setStatus('completed');
          try {
            onCompleteRef.current(result);
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:after_onComplete',message:'onComplete called successfully',data:{jobId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:onComplete_error',message:'onComplete threw error',data:{jobId,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            throw error;
          }
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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:useEffect_setup',message:'Setting up polling interval',data:{jobId,fingerprint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    poll();
    pollIntervalRef.current = setInterval(poll, 2000);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/8e0ea2fb-19cc-4a4e-a996-68356312ba25',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranscriptionStatus.tsx:useEffect_cleanup',message:'Cleaning up polling interval',data:{jobId,intervalExists:!!pollIntervalRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
