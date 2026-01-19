'use client';

import { useState, useEffect } from 'react';

export default function FirstTimeArrow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if the arrow has been shown before for this fingerprint
    const fingerprint = localStorage.getItem('fingerprint');
    if (!fingerprint) {
      // Wait for fingerprint to be set
      const checkInterval = setInterval(() => {
        const fp = localStorage.getItem('fingerprint');
        if (fp) {
          clearInterval(checkInterval);
          const hasSeenSwitcher = localStorage.getItem(`language_switcher_seen_${fp}`);
          if (!hasSeenSwitcher) {
            setShow(true);
          }
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    } else {
      const hasSeenSwitcher = localStorage.getItem(`language_switcher_seen_${fingerprint}`);
      if (!hasSeenSwitcher) {
        setShow(true);
      }
    }
  }, []);

  useEffect(() => {
    // Hide arrow on any click and persist the state
    const handleClick = () => {
      const fingerprint = localStorage.getItem('fingerprint');
      if (fingerprint) {
        localStorage.setItem(`language_switcher_seen_${fingerprint}`, 'true');
        setShow(false);
      }
    };

    if (show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [show]);

  if (!show) {
    return null;
  }

  return (
    <div 
      className="fixed top-20 right-2 z-40 pointer-events-none"
      style={{
        animation: 'pulse-fade 2s ease-in-out infinite',
      }}
    >
      <svg 
        width="60" 
        height="60" 
        viewBox="0 0 60 60" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <path 
          d="M30 50 L30 25 M30 25 L20 35 M30 25 L40 35" 
          stroke="#591E45" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      <style jsx>{`
        @keyframes pulse-fade {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
}
