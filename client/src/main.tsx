import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Debug wrapper to capture alert(1) stack trace
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = function (message) {
    console.error("DEBUG ALERT DETECTED:", message, new Error().stack);
    originalAlert(message);
  };
}

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
