'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [accountPending, setAccountPending] = useState(false);

  const { register, error } = useApp();
  const { language, t } = useLanguage();

  // Helper functions for content direction detection
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setValidationError('');
    setSuccessMessage('');
    setAccountPending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationError('');
    setSuccessMessage('');
    setAccountPending(false);

    // Validation
    if (!formData.fullName.trim()) {
      setValidationError(t('auth.validation.fullNameRequired'));
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setValidationError(t('auth.validation.validEmailRequired'));
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setValidationError(t('auth.validation.passwordMinLength'));
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('auth.validation.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    try {
      console.log('RegisterForm: Starting registration...');
      const result = await register(
        formData.fullName,
        formData.email,
        formData.password,
        formData.phoneNumber || undefined
      );
      
      console.log('RegisterForm: Registration result:', result);
      
      // Check if account is pending approval
      if (result && result.accountPending === true) {
        console.log('RegisterForm: Account is pending, setting success message');
        const message = result.message || 'Thank you for creating your account! Your account is currently pending approval. Please contact our support team to activate your account and start using Bayyena.';
        setAccountPending(true);
        setSuccessMessage(message);
        console.log('RegisterForm: State after setting - accountPending:', true, 'successMessage:', message);
        console.log('RegisterForm: Success message set, component should re-render');
      } else {
        console.log('RegisterForm: Account was created and auto-logged in');
        // Account was created and auto-logged in (likely admin user)
        onSuccess?.();
      }
    } catch (err) {
      console.error('RegisterForm: Registration error:', err);
      // Error is handled by the AppContext and will be displayed via the error prop
    } finally {
      setIsLoading(false);
    }
  };

  // Debug render state
  console.log('RegisterForm: Render state - accountPending:', accountPending, 'successMessage:', successMessage, 'validationError:', validationError, 'appContextError:', error, 'isLoading:', isLoading);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-card border border-border rounded-lg">
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
          <h1 className={`text-2xl font-bold text-foreground ${getUITextClasses()}`}>{t('auth.signUpTitle')}</h1>
        </div>
        <p className={`text-sm text-muted-foreground ${getUITextClasses()}`}>
          {t('auth.joinBayyena')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className={`text-sm font-medium text-foreground ${getUITextClasses()}`}>
            {t('auth.fullName')}
          </label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder={t('auth.fullNamePlaceholder')}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={`text-sm font-medium text-foreground ${getUITextClasses()}`}>
            {t('auth.email')}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t('auth.emailPlaceholder')}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phoneNumber" className={`text-sm font-medium text-foreground ${getUITextClasses()}`}>
            {t('auth.phoneNumber')}
          </label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder={t('auth.phoneNumberPlaceholder')}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className={`text-sm font-medium text-foreground ${getUITextClasses()}`}>
            {t('auth.password')}
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder={t('auth.enterPassword')}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className={`text-sm font-medium text-foreground ${getUITextClasses()}`}>
            {t('auth.confirmPassword')}
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            required
            disabled={isLoading}
          />
        </div>

        {!successMessage && (validationError || error) && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {validationError || error}
          </div>
        )}

        {successMessage && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-4">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-green-600 mt-0.5">
                ✓
              </div>
              <div>
                <p className={`font-medium ${getUITextClasses()}`}>{t('auth.accountCreatedSuccessfully')}</p>
                <p className={`mt-1 ${getUITextClasses()}`}>{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {!accountPending && (
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
        )}

        {accountPending && (
          <div className="space-y-3">
            <Button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full"
              variant="outline"
            >
              {t('auth.goToSignIn')}
            </Button>
          </div>
        )}
      </form>

      {!accountPending && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={`text-sm text-blue-600 hover:text-blue-800 hover:underline ${getUITextClasses()}`}
            disabled={isLoading}
          >
            {t('auth.alreadyHaveAccount')}
          </button>
        </div>
      )}
    </div>
  );
}
