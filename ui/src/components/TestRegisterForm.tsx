'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TestRegisterForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [accountPending, setAccountPending] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Basic validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      setIsLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      console.log('TestRegisterForm: Making direct API call...');
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          phoneNumber: formData.phoneNumber || undefined
        }),
      });

      console.log('TestRegisterForm: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Registration failed');
      }

      const result = await response.json();
      console.log('TestRegisterForm: Response data:', result);

      // Check if account is pending approval
      if (result && result.accountPending === true) {
        console.log('TestRegisterForm: Account is pending, showing success message');
        setAccountPending(true);
        setSuccessMessage(result.message || 'Thank you for creating your account! Your account is currently pending approval. Please contact our support team to activate your account and start using Bayyena.');
      } else {
        console.log('TestRegisterForm: Account was created and auto-logged in');
        setSuccessMessage('Account created and logged in successfully!');
      }
    } catch (err) {
      console.error('TestRegisterForm: Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-card border border-border rounded-lg">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Test Registration</h1>
        <p className="text-sm text-muted-foreground">
          Direct API test for pending account flow
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full Name
          </label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
            Phone Number (Optional)
          </label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="Enter your phone number"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-4">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-green-600 mt-0.5">
                ✓
              </div>
              <div>
                <p className="font-medium">Account Created Successfully!</p>
                <p className="mt-1">{successMessage}</p>
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
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        )}

        {accountPending && (
          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => alert('This would go to sign in')}
              className="w-full"
              variant="outline"
            >
              Go to Sign In
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
