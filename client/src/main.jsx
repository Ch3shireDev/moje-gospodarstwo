import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { reloadForNewVersion } from './lazy.js';

// Vite zgłasza to zdarzenie, gdy nie może wczytać pliku zależności modułu (np. po wdrożeniu nowej wersji).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
