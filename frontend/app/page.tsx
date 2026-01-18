'use client';

import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import TranscriptionStatus from './components/TranscriptionStatus';
import ResultDisplay from './components/ResultDisplay';
import CheckoutModal from './components/CheckoutModal';
import ClaimCreditsModal from './components/ClaimCreditsModal';
import { getFingerprint } from './lib/fingerprint';
import {
  transcribeAudio,
  getCredits,
  getUsageLimits,
  TranscriptionResult,
  UsageLimit,
  CreditBalance,
} from './lib/api';

const LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'da', label: 'Danish' },
  { value: 'sv', label: 'Swedish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
];

const MODELS = [
  { value: 'tiny', label: 'Tiny (Fastest, Lower Quality)' },
  { value: 'base', label: 'Base (Balanced)' },
  { value: 'small', label: 'Small (Better Quality)' },
  { value: 'medium', label: 'Medium (High Quality)' },
  { value: 'large', label: 'Large (Best Quality)' },
];

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('auto');
  const [model, setModel] = useState('base');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimit | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Default fallback values
  const defaultUsageLimits: UsageLimit = {
    remaining_tiny_base: 3,
    remaining_small: 1,
    is_paid: false
  };

  const defaultCredits: CreditBalance = {
    credits: 0,
    email: undefined
  };

  useEffect(() => {
    // Initialize fingerprint
    getFingerprint().then(fp => {
      setFingerprint(fp);
      localStorage.setItem('fingerprint', fp);
      
      // Load usage limits and credits
      loadUsageData(fp);
    });

    // Handle Stripe checkout success
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      // Payment successful, reload usage data
      const fp = localStorage.getItem('fingerprint');
      if (fp) {
        setTimeout(() => {
          loadUsageData(fp);
        }, 2000); // Wait a bit for webhook to process
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadUsageData = async (fp: string) => {
    setLoadingUsage(true);
    try {
      const [limits, creditBalance] = await Promise.all([
        getUsageLimits(fp),
        getCredits(fp),
      ]);
      setUsageLimits(limits);
      setCredits(creditBalance);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      // Set default fallback values on error
      setUsageLimits(defaultUsageLimits);
      setCredits(defaultCredits);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleTranscribe = async () => {
    if (!selectedFile || !fingerprint) {
      setError('Please select a file');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setResult(null);

    try {
      const response = await transcribeAudio(selectedFile, fingerprint, language, model);
      setJobId(response.job_id);
    } catch (err: any) {
      setIsTranscribing(false);
      const errorMessage = err.message || err.response?.data?.detail || err.response?.data?.message || 'Failed to start transcription';
      setError(errorMessage);
      console.error('Transcription error:', err);
    }
  };

  const handleTranscriptionComplete = (transcriptionResult: TranscriptionResult) => {
    setIsTranscribing(false);
    setResult(transcriptionResult);
    // Reload usage data
    if (fingerprint) {
      loadUsageData(fingerprint);
    }
  };

  const handleTranscriptionError = (errorMessage: string) => {
    setIsTranscribing(false);
    setError(errorMessage);
  };

  const canUseModel = (modelValue: string): boolean => {
    // Use fallback defaults if usageLimits is null
    const limits = usageLimits || defaultUsageLimits;
    if (limits.is_paid) return true;
    
    if (modelValue === 'small') {
      return limits.remaining_small > 0 && limits.remaining_tiny_base === 0;
    }
    if (modelValue === 'tiny' || modelValue === 'base') {
      return limits.remaining_tiny_base > 0;
    }
    return false;
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">admitted</h1>
          <p className="text-lg text-gray-600">Transcribe audio files using OpenAI Whisper</p>
        </div>

        {/* Usage Info */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          {loadingUsage ? (
            <div className="text-center text-gray-500">
              Loading account information...
            </div>
          ) : (usageLimits?.is_paid ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">Paid Account</span>
                {credits && credits.email && (
                  <span className="text-sm text-gray-500">({credits.email})</span>
                )}
              </div>
              {credits && (
                <span className="text-gray-700">
                  Credits: <span className="font-semibold">{credits.credits.toFixed(1)}</span>
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Free Tier</span>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="text-blue-600 hover:underline"
                >
                  Buy premium minutes
                </button>
              </div>
              {usageLimits && (
                <div className="text-sm text-gray-600">
                  <span>Tiny/Base remaining: {usageLimits.remaining_tiny_base}</span>
                  <span className="ml-4">Small remaining: {usageLimits.remaining_small}</span>
                </div>
              )}
            </div>
          ))}
          {!loadingUsage && credits && credits.credits === 0 && !credits.email && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => setShowClaimModal(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Already bought credits and not showing? click here
              </button>
            </div>
          )}
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            disabled={isTranscribing}
          />

          {selectedFile && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">
                Selected: <span className="font-medium">{selectedFile.name}</span>
                <span className="ml-2 text-gray-500">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isTranscribing}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Quality
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !canUseModel(model)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                disabled={isTranscribing}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value} disabled={!canUseModel(m.value)}>
                    {m.label}
                    {!canUseModel(m.value) && ' (Limit reached)'}
                  </option>
                ))}
              </select>
              {!canUseModel(model) && (
                <p className="mt-1 text-xs text-red-600">
                  {usageLimits?.is_paid
                    ? 'Insufficient credits'
                    : 'Free tier limit reached for this model'}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleTranscribe}
            disabled={!selectedFile || isTranscribing || !canUseModel(model)}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
          </button>

          {jobId && isTranscribing && (
            <TranscriptionStatus
              jobId={jobId}
              fingerprint={fingerprint}
              onComplete={handleTranscriptionComplete}
              onError={handleTranscriptionError}
            />
          )}

          {result && (
            <ResultDisplay result={result} fingerprint={fingerprint} />
          )}
        </div>

        {showCheckout && (
          <CheckoutModal
            fingerprint={fingerprint}
            onClose={() => setShowCheckout(false)}
            onSuccess={() => {
              setShowCheckout(false);
              if (fingerprint) {
                loadUsageData(fingerprint);
              }
            }}
          />
        )}

        {showClaimModal && (
          <ClaimCreditsModal
            fingerprint={fingerprint}
            onClose={() => setShowClaimModal(false)}
            onSuccess={() => {
              setShowClaimModal(false);
              if (fingerprint) {
                loadUsageData(fingerprint);
              }
            }}
          />
        )}
        
        {/* Footer with business name */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} <span className="font-semibold">admitted</span>. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
