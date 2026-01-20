'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import FileUpload from './components/FileUpload';
import TranscriptionStatus from './components/TranscriptionStatus';
import ResultDisplay from './components/ResultDisplay';
import CheckoutModal from './components/CheckoutModal';
import ClaimCreditsModal from './components/ClaimCreditsModal';
import ClaimMinutesModal from './components/ClaimMinutesModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import FontToggle from './components/FontToggle';
import FirstTimeArrow from './components/FirstTimeArrow';
import { getFingerprint } from './lib/fingerprint';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { useLanguage } from './contexts/LanguageContext';
import {
  transcribeAudio,
  getMinutes,
  getUsageLimits,
  TranscriptionResult,
  UsageLimit,
  MinutesBalance,
} from './lib/api';

const getLanguages = (t: (key: string) => string) => [
  { value: 'auto', label: t('languages.autoDetect') },
  // Scandinavian languages
  { value: 'da', label: t('languages.danish') },
  { value: 'no', label: t('languages.norwegian') },
  { value: 'sv', label: t('languages.swedish') },
  { value: 'is', label: t('languages.icelandic') },
  { value: 'fi', label: t('languages.finnish') },
  // Priority languages
  { value: 'en', label: t('languages.english') },
  { value: 'uk', label: t('languages.ukrainian') },
  // All other languages alphabetically
  { value: 'af', label: t('languages.afrikaans') },
  { value: 'ar', label: t('languages.arabic') },
  { value: 'hy', label: t('languages.armenian') },
  { value: 'az', label: t('languages.azerbaijani') },
  { value: 'be', label: t('languages.belarusian') },
  { value: 'bs', label: t('languages.bosnian') },
  { value: 'bg', label: t('languages.bulgarian') },
  { value: 'ca', label: t('languages.catalan') },
  { value: 'zh', label: t('languages.chinese') },
  { value: 'hr', label: t('languages.croatian') },
  { value: 'cs', label: t('languages.czech') },
  { value: 'nl', label: t('languages.dutch') },
  { value: 'et', label: t('languages.estonian') },
  { value: 'fr', label: t('languages.french') },
  { value: 'gl', label: t('languages.galician') },
  { value: 'de', label: t('languages.german') },
  { value: 'el', label: t('languages.greek') },
  { value: 'he', label: t('languages.hebrew') },
  { value: 'hi', label: t('languages.hindi') },
  { value: 'hu', label: t('languages.hungarian') },
  { value: 'id', label: t('languages.indonesian') },
  { value: 'it', label: t('languages.italian') },
  { value: 'ja', label: t('languages.japanese') },
  { value: 'kn', label: t('languages.kannada') },
  { value: 'kk', label: t('languages.kazakh') },
  { value: 'ko', label: t('languages.korean') },
  { value: 'lv', label: t('languages.latvian') },
  { value: 'lt', label: t('languages.lithuanian') },
  { value: 'mk', label: t('languages.macedonian') },
  { value: 'ms', label: t('languages.malay') },
  { value: 'mr', label: t('languages.marathi') },
  { value: 'mi', label: t('languages.maori') },
  { value: 'ne', label: t('languages.nepali') },
  { value: 'fa', label: t('languages.persian') },
  { value: 'pl', label: t('languages.polish') },
  { value: 'pt', label: t('languages.portuguese') },
  { value: 'ro', label: t('languages.romanian') },
  { value: 'ru', label: t('languages.russian') },
  { value: 'sr', label: t('languages.serbian') },
  { value: 'sk', label: t('languages.slovak') },
  { value: 'sl', label: t('languages.slovenian') },
  { value: 'es', label: t('languages.spanish') },
  { value: 'sw', label: t('languages.swahili') },
  { value: 'tl', label: t('languages.tagalog') },
  { value: 'ta', label: t('languages.tamil') },
  { value: 'th', label: t('languages.thai') },
  { value: 'tr', label: t('languages.turkish') },
  { value: 'ur', label: t('languages.urdu') },
  { value: 'vi', label: t('languages.vietnamese') },
  { value: 'cy', label: t('languages.welsh') },
];

const getModels = (t: (key: string) => string) => [
  { value: 'tiny', label: t('models.tiny') },
  { value: 'base', label: t('models.base') },
  { value: 'small', label: t('models.small') },
  { value: 'medium', label: t('models.medium'), comingSoon: true },
  { value: 'large', label: t('models.large'), comingSoon: true },
];

// Default fallback values
const defaultUsageLimits: UsageLimit = {
  remaining_tiny_base: 45,
  remaining_small: 5,
  is_paid: false
};

const defaultMinutes: MinutesBalance = {
  minutes: 0,
  email: undefined
};

export default function Home() {
  const { t } = useLanguage();
  const [fingerprint, setFingerprint] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('auto');
  const [model, setModel] = useState('base');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimit | null>(null);
  const [minutes, setMinutes] = useState<MinutesBalance | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const LANGUAGES = getLanguages(t);
  const MODELS = getModels(t);

  const loadUsageData = useCallback(async (fp: string) => {
    setLoadingUsage(true);
    try {
      const [limits, minutesBalance] = await Promise.all([
        getUsageLimits(fp),
        getMinutes(fp),
      ]);
      setUsageLimits(limits);
      setMinutes(minutesBalance);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      // Set default fallback values on error
      setUsageLimits(defaultUsageLimits);
      setMinutes(defaultMinutes);
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    // Initialize fingerprint
    getFingerprint().then(fp => {
      setFingerprint(fp);
      localStorage.setItem('fingerprint', fp);
      
      // Load usage limits and minutes
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
  }, [loadUsageData]);

  useEffect(() => {
    if (model === 'large') setModel('base');
  }, [model]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const handleTranscribe = async () => {
    if (!selectedFile || !fingerprint) {
      setError(t('form.pleaseSelectFile'));
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setResult(null);

    try {
      // Determine if user is paid (has minutes balance)
      const isPaid = (minutes?.minutes || 0) > 0;
      const response = await transcribeAudio(selectedFile, fingerprint, language, model, isPaid);
      setJobId(response.job_id);
    } catch (err: any) {
      setIsTranscribing(false);
      const errorMessage = err.message || err.response?.data?.detail || err.response?.data?.message || t('errors.transcriptionFailed');
      setError(errorMessage);
      console.error('Transcription error:', err);
    }
  };

  const handleTranscriptionComplete = useCallback((transcriptionResult: TranscriptionResult) => {
    setIsTranscribing(false);
    setResult(transcriptionResult);
    // Reload usage data
    if (fingerprint) {
      loadUsageData(fingerprint);
    }
  }, [fingerprint, loadUsageData]);

  const handleTranscriptionError = useCallback((errorMessage: string) => {
    setIsTranscribing(false);
    setError(errorMessage);
  }, []);

  const isModelComingSoon = (modelValue: string) => modelValue === 'large' || modelValue === 'medium';
  const canUseModel = (modelValue: string): boolean => {
    if (isModelComingSoon(modelValue)) return false; // disabled for now (coming soon)
    // Use fallback defaults if usageLimits is null
    const limits = usageLimits || defaultUsageLimits;
    if (limits.is_paid) return true;
    
    if (modelValue === 'tiny' || modelValue === 'base') {
      return limits.remaining_tiny_base > 0;
    }
    if (modelValue === 'small') {
      // Only small model uses premium free minutes (medium/large disabled due to server RAM)
      return limits.remaining_small > 0;
    }
    return false;
  };

  return (
    <>
      <LanguageSwitcher />
      <FontToggle />
      <FirstTimeArrow />
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
        {/* Tape recorder image - desktop left, mobile left */}
        <div className="hidden lg:block fixed top-1/2 -translate-y-1/2 z-20 pointer-events-none" style={{ left: 'calc((100vw - 56rem) / 4 - 100px)' }}>
          <Image
            src="/tape-recorder.svg"
            alt="Tape Recorder"
            width={200}
            height={200}
            style={{ maxWidth: '200px', height: 'auto' }}
          />
        </div>
        {/* Cat image - desktop right, mobile right */}
        <div className="hidden lg:block fixed top-1/2 -translate-y-1/2 z-20 pointer-events-none" style={{ right: 'calc((100vw - 56rem) / 4 - 100px)' }}>
          <Image
            src="/nerd-cat.svg"
            alt="Nerd Cat"
            width={200}
            height={200}
            className="opacity-80"
            style={{ maxWidth: '200px', height: 'auto' }}
          />
        </div>
        {/* Mobile: both images side by side above content */}
        <div className="lg:hidden flex justify-center items-center gap-4 mb-6">
          <Image
            src="/tape-recorder.svg"
            alt="Tape Recorder"
            width={150}
            height={150}
            style={{ maxWidth: '150px', height: 'auto' }}
          />
          <Image
            src="/nerd-cat.svg"
            alt="Nerd Cat"
            width={150}
            height={150}
            style={{ maxWidth: '150px', height: 'auto' }}
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('page.title')}</h1>
          <p className="text-lg text-gray-600">{t('page.subtitle')}</p>
          <p className="text-sm text-gray-500 mt-3">{t('page.note')}</p>
        </div>

        {/* Usage Info */}
        <div className="mb-6 p-4 rounded-lg shadow" style={{ backgroundColor: '#F285CC' }}>
          {loadingUsage ? (
            <div className="text-center text-gray-500">
              {t('usage.loadingAccount')}
            </div>
          ) : (usageLimits?.is_paid ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-green-600 font-semibold">{t('usage.premiumCat')}</span>
                  {minutes && minutes.email && (
                    <span className="text-sm text-gray-500">({minutes.email})</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {minutes && (
                    <span className="text-gray-700">
                      {t('usage.minutes')} <span className="font-semibold">{minutes.minutes.toFixed(1)}</span>
                    </span>
                  )}
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="text-blue-600 hover:underline"
                  >
                    {t('usage.buyPremiumMinutes')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{t('usage.freeCat')}</span>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="text-blue-600 hover:underline"
                >
                  {t('usage.buyPremiumMinutes')}
                </button>
              </div>
              {usageLimits && (
                <div className="text-sm text-gray-600">
                  <span>{t('usage.freeMinutesRemaining')} {usageLimits.remaining_tiny_base}</span>
                  <span className="ml-4">{t('usage.premiumMinutesRemaining')} {usageLimits.remaining_small}</span>
                </div>
              )}
            </div>
          ))}
          {!loadingUsage && minutes && minutes.minutes === 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => setShowClaimModal(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                {t('usage.alreadyBought')}
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
                {t('fileUpload.selected')} <span className="font-medium">{selectedFile.name}</span>
                <span className="ml-2 text-gray-500">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.language')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{ backgroundColor: '#F277C7' }}
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
                {t('form.modelQuality')}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !canUseModel(model) && !isModelComingSoon(model)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                style={{ backgroundColor: !canUseModel(model) ? undefined : '#F277C7' }}
                disabled={isTranscribing}
              >
                {MODELS.map((m) => (
                  <option
                    key={m.value}
                    value={m.value}
                    disabled={'comingSoon' in m && m.comingSoon || !canUseModel(m.value)}
                    style={'comingSoon' in m && m.comingSoon ? { color: '#9ca3af' } : undefined}
                  >
                    {m.label}
                    {'comingSoon' in m && m.comingSoon ? ` ${t('models.comingSoon')}` : !canUseModel(m.value) ? ` ${t('models.limitReached')}` : ''}
                  </option>
                ))}
              </select>
              {!canUseModel(model) && !isModelComingSoon(model) && (
                <p className="mt-1 text-xs text-red-600">
                  {usageLimits?.is_paid
                    ? t('form.insufficientMinutes')
                    : t('form.freeTierLimitReached')}
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
            className="mt-6 w-full px-6 py-3 text-white font-semibold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: (!selectedFile || isTranscribing || !canUseModel(model)) ? undefined : '#591E45',
            }}
            onMouseEnter={(e) => {
              if (selectedFile && !isTranscribing && canUseModel(model)) {
                e.currentTarget.style.backgroundColor = '#6d2a54';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && !isTranscribing && canUseModel(model)) {
                e.currentTarget.style.backgroundColor = '#591E45';
              }
            }}
          >
            {isTranscribing ? t('form.transcribing') : t('form.startTranscription')}
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
          <ClaimMinutesModal
            fingerprint={fingerprint}
            onClose={() => setShowClaimModal(false)}
            onSuccess={(data) => {
              setShowClaimModal(false);
              if (data) {
                setMinutes(data);
                if (data.minutes > 0) {
                  setUsageLimits({ remaining_tiny_base: 999, remaining_small: 999, is_paid: true});
                } else if (fingerprint) loadUsageData(fingerprint);
              } else if (fingerprint) loadUsageData(fingerprint);
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
            © {new Date().getFullYear()} <span className="font-semibold">admitted</span>. {t('footer.allRightsReserved')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {t('footer.designedBy')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('footer.catDrawingBy')} <a href="https://www.ericadigitaldesign.etsy.com" target="_blank" rel="noopener noreferrer" className="hover:underline">www.ericadigitaldesign.etsy.com</a>
          </p>
        </footer>
        </div>
      </main>
    </>
  );
}
