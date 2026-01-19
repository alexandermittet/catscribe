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
          d="M30 10 L30 35 M30 35 L20 25 M30 35 L40 25" 
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
            transform: translateY(5px);
          }
        }
      `}</style>
    </div>
  );
}
