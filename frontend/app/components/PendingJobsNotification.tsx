'use client';

import { useState, useEffect } from 'react';
import { JobInfo } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

interface PendingJobsNotificationProps {
  jobs: JobInfo[];
  fingerprint: string;
  onJobSelect: (jobId: string) => void;
  onDismiss: (jobId: string) => void;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

export default function PendingJobsNotification({
  jobs,
  fingerprint,
  onJobSelect,
  onDismiss,
}: PendingJobsNotificationProps) {
  const { t } = useLanguage();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (jobs.length === 0) {
    return null;
  }

  const handleViewJob = (jobId: string) => {
    onJobSelect(jobId);
  };

  const handleDismiss = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    onDismiss(jobId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'processing':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'queued':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'failed':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('status.completed');
      case 'processing':
        return t('status.processing');
      case 'queued':
        return t('status.queued');
      case 'failed':
        return t('status.failed');
      default:
        return status;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      <div className="rounded-lg shadow-lg p-4 border-2" style={{ backgroundColor: '#F285CC', borderColor: '#591E45' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('pendingJobs.title')}
          </h3>
          <button
            onClick={() => onDismiss('all')}
            className="text-gray-600 hover:text-gray-900"
            aria-label="Dismiss all"
          >
            ✕
          </button>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">
          {t('pendingJobs.description')}
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {jobs.map((job) => (
            <div
              key={job.job_id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${getStatusColor(job.status)}`}
              onClick={() => handleViewJob(job.job_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{getStatusText(job.status)}</span>
                    {job.model && (
                      <span className="text-xs opacity-75">({job.model})</span>
                    )}
                  </div>
                  
                  {job.status === 'processing' && job.progress !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round(job.progress * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs mt-1">
                        {Math.round(job.progress * 100)}% {t('pendingJobs.percentComplete')}
                        {job.time_remaining !== undefined && job.time_remaining > 0 && (
                          <span className="ml-2">~{formatTime(job.time_remaining)} {t('pendingJobs.remaining')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {job.status === 'completed' && (
                    <div className="text-sm mt-1 font-medium">
                      ✓ {t('pendingJobs.readyToDownload')}
                    </div>
                  )}

                  {job.status === 'failed' && job.error && (
                    <div className="text-xs mt-1 opacity-75">
                      {job.error}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => handleDismiss(e, job.job_id)}
                  className="ml-2 text-gray-600 hover:text-gray-900 text-sm"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
