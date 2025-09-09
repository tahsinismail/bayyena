'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error } = useApp();
  const { language, t } = useLanguage();

  // Helper functions for content direction detection
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('LoginForm: Starting login...');
      await login(email, password);
      console.log('LoginForm: Login completed');
    } catch (err) {
      console.error('LoginForm: Login error:', err);
      // Error is handled by the context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6 space-y-4">
        {/* Language Switcher */}
        <div className="flex justify-end">
          <LanguageSwitcher variant="compact" />
        </div>
        
        <div className="text-center space-y-2 flex flex-col gap-2 items-center justify-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image 
              src="/logo.png" 
              alt="Bayyena" 
              width={40} 
              height={40} 
              className="w-10 h-10"
            />
            <h1 className={`text-2xl font-bold ${getUITextClasses()}`}>{t('auth.signInTitle')}</h1>
          </div>
          <p className={`text-muted-foreground ${getUITextClasses()}`}>{t('auth.signInToAccount')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className={`text-sm font-medium ${getUITextClasses()}`}>
              {t('auth.email')}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterEmail')}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className={`text-sm font-medium ${getUITextClasses()}`}>
              {t('auth.password')}
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.enterPassword')}
              required
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
        
        {onSwitchToRegister && (
          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className={`text-sm text-blue-600 hover:text-blue-800 hover:underline ${getUITextClasses()}`}
              disabled={isLoading}
            >
              {t('auth.dontHaveAccount')}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
