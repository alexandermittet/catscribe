'use client';

import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import TranscriptionStatus from './components/TranscriptionStatus';
import ResultDisplay from './components/ResultDisplay';
import CheckoutModal from './components/CheckoutModal';
import ClaimCreditsModal from './components/ClaimCreditsModal';
import { getFingerprint } from './lib/fingerprint';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import {
  transcribeAudio,
  getCredits,
  getUsageLimits,
  TranscriptionResult,
  UsageLimit,
  CreditBalance,
} from './lib/api';

const LANGUAGES = [
  { value: 'auto', label: '🌐 Auto-detect' },
  // Scandinavian languages
  { value: 'da', label: '🇩🇰 Danish' },
  { value: 'no', label: '🇳🇴 Norwegian' },
  { value: 'sv', label: '🇸🇪 Swedish' },
  { value: 'is', label: '🇮🇸 Icelandic' },
  { value: 'fi', label: '🇫🇮 Finnish' },
  // Priority languages
  { value: 'en', label: '🇬🇧 English' },
  { value: 'uk', label: '🇺🇦 Ukrainian' },
  // All other languages alphabetically
  { value: 'af', label: '🇿🇦 Afrikaans' },
  { value: 'ar', label: '🇸🇦 Arabic' },
  { value: 'hy', label: '🇦🇲 Armenian' },
  { value: 'az', label: '🇦🇿 Azerbaijani' },
  { value: 'be', label: '🇧🇾 Belarusian' },
  { value: 'bs', label: '🇧🇦 Bosnian' },
  { value: 'bg', label: '🇧🇬 Bulgarian' },
  { value: 'ca', label: '🇪🇸 Catalan' },
  { value: 'zh', label: '🇨🇳 Chinese' },
  { value: 'hr', label: '🇭🇷 Croatian' },
  { value: 'cs', label: '🇨🇿 Czech' },
  { value: 'nl', label: '🇳🇱 Dutch' },
  { value: 'et', label: '🇪🇪 Estonian' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'gl', label: '🇪🇸 Galician' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'el', label: '🇬🇷 Greek' },
  { value: 'he', label: '🇮🇱 Hebrew' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'hu', label: '🇭🇺 Hungarian' },
  { value: 'id', label: '🇮🇩 Indonesian' },
  { value: 'it', label: '🇮🇹 Italian' },
  { value: 'ja', label: '🇯🇵 Japanese' },
  { value: 'kn', label: '🇮🇳 Kannada' },
  { value: 'kk', label: '🇰🇿 Kazakh' },
  { value: 'ko', label: '🇰🇷 Korean' },
  { value: 'lv', label: '🇱🇻 Latvian' },
  { value: 'lt', label: '🇱🇹 Lithuanian' },
  { value: 'mk', label: '🇲🇰 Macedonian' },
  { value: 'ms', label: '🇲🇾 Malay' },
  { value: 'mr', label: '🇮🇳 Marathi' },
  { value: 'mi', label: '🇳🇿 Maori' },
  { value: 'ne', label: '🇳🇵 Nepali' },
  { value: 'fa', label: '🇮🇷 Persian' },
  { value: 'pl', label: '🇵🇱 Polish' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'ro', label: '🇷🇴 Romanian' },
  { value: 'ru', label: '🇷🇺 Russian' },
  { value: 'sr', label: '🇷🇸 Serbian' },
  { value: 'sk', label: '🇸🇰 Slovak' },
  { value: 'sl', label: '🇸🇮 Slovenian' },
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'sw', label: '🇹🇿 Swahili' },
  { value: 'tl', label: '🇵🇭 Tagalog' },
  { value: 'ta', label: '🇮🇳 Tamil' },
  { value: 'th', label: '🇹🇭 Thai' },
  { value: 'tr', label: '🇹🇷 Turkish' },
  { value: 'ur', label: '🇵🇰 Urdu' },
  { value: 'vi', label: '🇻🇳 Vietnamese' },
  { value: 'cy', label: '🇬🇧 Welsh' },
];

const MODELS = [
  { value: 'tiny', label: '😴 Lazy Cat (Fastest, Lower Quality)' },
  { value: 'base', label: '🐱 Everyday Cat (Balanced)' },
  { value: 'small', label: '📚 Studious Cat (Better Quality, Slower)' },
  { value: 'medium', label: '🎯 Perfectionistic Cat (High Quality, A bit Slower)' },
  { value: 'large', label: '💪 Hyperpolyglot Gigachad Cat (Best Quality, A lot slower)' },
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Default fallback values
  const defaultUsageLimits: UsageLimit = {
    remaining_tiny_base: 45,
    remaining_small: 5,
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    
    if (modelValue === 'tiny' || modelValue === 'base') {
      return limits.remaining_tiny_base > 0;
    }
    if (modelValue === 'small' || modelValue === 'medium' || modelValue === 'large') {
      return limits.remaining_small > 0;
    }
    return false;
  };

  return (
    <>
      {/* Mouse-Cursor-following spotlight - behind content but above background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 300px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.25) 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />
      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 10 }}>
        <div className="max-w-4xl mx-auto relative">
        {/* Cat image - desktop left, mobile above */}
        <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none" style={{ left: 'calc((100vw - 56rem) / 4 - 100px)' }}>
          <img
            src="/nerd-cat.svg"
            alt="Nerd Cat"
            width={200}
            height={200}
            className="opacity-80"
            style={{ maxWidth: '200px', height: 'auto' }}
          />
        </div>
        <div className="lg:hidden flex justify-center mb-6">
          <img
            src="/nerd-cat.svg"
            alt="Nerd Cat"
            width={150}
            height={150}
            className="opacity-80"
            style={{ maxWidth: '150px', height: 'auto' }}
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">catscribe</h1>
          <p className="text-lg text-gray-600">Cute cat that takes your interview tapes and thoroughly transcribes them in (almost) any language</p>
          <p className="text-sm text-gray-500 mt-3">Note: Cat doesn&apos;t have the best hearing when far away, for best results keep your recorder close to the person speaking so cat can hear whats being said loud and clear</p>
        </div>

        {/* Usage Info */}
        <div className="mb-6 p-4 rounded-lg shadow" style={{ backgroundColor: '#F285CC' }}>
          {loadingUsage ? (
            <div className="text-center text-gray-500">
              Loading account information...
            </div>
          ) : (usageLimits?.is_paid ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-semibold">Premium Cat</span>
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
                <span className="text-gray-700">Free Cat</span>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="text-blue-600 hover:underline"
                >
                  Buy premium minutes
                </button>
              </div>
              {usageLimits && (
                <div className="text-sm text-gray-600">
                  <span>Free minutes remaining: {usageLimits.remaining_tiny_base}</span>
                  <span className="ml-4">Premium minutes remaining: {usageLimits.remaining_small}</span>
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
        <div className="rounded-lg shadow-lg p-6" style={{ backgroundColor: '#F285CC' }}>
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
          <div className="flex justify-center gap-4 mb-3">
            <a
              href="https://github.com/alexandermittet/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 transition-colors"
              aria-label="GitHub"
            >
              <FaGithub size={24} />
            </a>
            <a
              href="https://www.linkedin.com/in/alexandermittet/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 transition-colors"
              aria-label="LinkedIn"
            >
              <FaLinkedin size={24} />
            </a>
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} <span className="font-semibold">admitted</span>. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Designed by Alexander Mittet
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Cat drawing by: <a href="https://www.ericadigitaldesign.etsy.com" target="_blank" rel="noopener noreferrer" className="hover:underline">www.ericadigitaldesign.etsy.com</a>
          </p>
        </footer>
        </div>
      </main>
    </>
  );
}
