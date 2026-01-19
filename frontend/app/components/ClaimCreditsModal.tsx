'use client';

import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ClaimCreditsModalProps {
  fingerprint: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimCreditsModal({ fingerprint, onClose, onSuccess }: ClaimCreditsModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClaim = async () => {
    if (!email || !email.includes('@')) {
      setError(t('claim.errorInvalidEmail'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/credits/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fingerprint,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('claim.errorClaimFailed').replace('{type}', t('claim.credits')));
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || t('claim.errorClaimFailed').replace('{type}', t('claim.credits')));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{t('claim.creditsTitle')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            {t('claim.description').replace('{type}', t('claim.credits')).replace('{type}', t('claim.credits'))}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common.emailAddress')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('common.emailPlaceholder')}
              disabled={loading || success}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">{t('claim.successMessage').replace('{type}', t('claim.credits'))}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading || success}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleClaim}
              disabled={loading || !email || success}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('claim.claiming') : success ? t('common.success') : t('claim.claimButton').replace('{type}', t('claim.credits'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
