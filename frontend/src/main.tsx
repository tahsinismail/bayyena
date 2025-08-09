import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './i18n'; // <-- IMPORT THIS FILE HERE

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme accentColor='gold'>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Theme>
  </React.StrictMode>,
)
