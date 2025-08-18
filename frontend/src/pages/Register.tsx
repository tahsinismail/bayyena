// frontend/src/pages/Register.tsx
import { useState } from 'react';
import { Button, TextField, Flex, Text, Card, Link, Spinner } from '@radix-ui/themes';
import { useLocation, Link as WouterLink } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import logo from '../assets/logo.png';

export default function Register() {
  const [fullName, setFullName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Client-side validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      setIsLoading(false);
      return;
    }
    
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await axios.post('/api/auth/register', { 
        fullName: fullName.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        phoneNumber: phoneNumber.trim() || undefined 
      });
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.response?.status === 409) {
        setError(err.response.data?.message || 'An account with this email already exists.');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Please check your information and try again.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" align="center" justify="center" className="min-h-screen min-w-screen max-w-screen mx-auto">
      <img src={logo} alt="Logo" className="mb-8"  width={150} height={150}/>
      <Card className="p-8 min-w-sm max-w-1/3">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Text as="label" size="6" weight="bold" align="center">Create Account</Text>
            <TextField.Root
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
            <TextField.Root
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <TextField.Root
              placeholder="Phone Number (Optional)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
            />
            <TextField.Root
              type="password"
              placeholder="Password (minimum 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {error && (
              <Flex direction="column" gap="2" p="3" className="bg-red-50 border border-red-200 rounded">
                <Text color="red" size="2" weight="medium">⚠️ Registration Failed</Text>
                <Text color="red" size="2">{error}</Text>
              </Flex>
            )}
            <Button type="submit" size="3" disabled={isLoading}>
              {isLoading ? (
                <Flex align="center" gap="2">
                  <Spinner size="2" />
                  Creating account...
                </Flex>
              ) : (
                'Create Account'
              )}
            </Button>
            <Text size="2" align="center">
              Already have an account? <Link asChild><WouterLink to="/login">Sign In</WouterLink></Link>
            </Text>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
