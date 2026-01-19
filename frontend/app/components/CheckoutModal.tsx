'use client';

import { useState } from 'react';
import { PRICING_CONFIG } from '../config/pricing';
import { useLanguage } from '../contexts/LanguageContext';

interface CheckoutModalProps {
  fingerprint: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ fingerprint, onClose, onSuccess }: CheckoutModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) {
      setError(t('checkout.errorInvalidEmail'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fingerprint,
          email,
          packageId: selectedPackage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('checkout.errorCreateSession'));
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || t('checkout.errorCreateSession'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{t('checkout.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('checkout.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('common.emailPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('checkout.packageLabel')}
            </label>
            <div className="space-y-2">
              {PRICING_CONFIG.packages.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`block p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedPackage === pkg.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="package"
                    value={pkg.id}
                    checked={selectedPackage === pkg.id}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="mr-2"
                  />
                  <span className="font-medium">{pkg.minutes} {t('checkout.minutesPackage')}</span>
                  <span className="ml-2 text-gray-600">- {pkg.price} {PRICING_CONFIG.currencyDisplay}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading || !email}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? t('common.processing') : t('checkout.continueToPayment')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
