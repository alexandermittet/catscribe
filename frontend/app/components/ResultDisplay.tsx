'use client';

import { TranscriptionResult } from '../lib/api';
import { getDownloadUrl } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

interface ResultDisplayProps {
  result: TranscriptionResult;
  fingerprint: string;
}

export default function ResultDisplay({ result, fingerprint }: ResultDisplayProps) {
  const { t } = useLanguage();
  const handleDownload = (format: string) => {
    const url = getDownloadUrl(result.job_id, format, fingerprint);
    window.open(url, '_blank');
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('results.title')}</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleDownload('txt')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('results.downloadTxt')}
            </button>
            <button
              onClick={() => handleDownload('srt')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t('results.downloadSrt')}
            </button>
            <button
              onClick={() => handleDownload('vtt')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {t('results.downloadVtt')}
            </button>
          </div>
        </div>
        <div className="mb-4 text-sm text-gray-600">
          <span>{t('results.language')} {result.language.toUpperCase()}</span>
          <span className="ml-4">{t('results.duration')} {Math.round(result.duration / 60)} {t('results.minutes')}</span>
        </div>
        <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm">{result.text}</pre>
        </div>
      </div>
    </div>
  );
}
