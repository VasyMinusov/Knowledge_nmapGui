import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './tokens/colors.css';
import './tokens/shadows.css';
import './tokens/typography.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);