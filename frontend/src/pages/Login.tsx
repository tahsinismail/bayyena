import { useState } from 'react';
import { Button, TextField, Flex, Text, Card, Link, Spinner } from '@radix-ui/themes';
import { useLocation, Link as WouterLink } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Client-side validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password.');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await axios.post('/api/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      setUser(data.user);
      
      // Redirect admin users to admin panel, regular users to main app
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response?.status === 401) {
        setError(err.response.data?.message || 'Invalid email or password.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" align="center" justify="center" className="min-h-screen max-w-screen min-w-screen mx-auto">
      <img src={logo} alt="Logo" className="mb-8"  width={150} height={150}/>
      <Card className="p-16 min-w-sm min-h-max w-1/3 h-1/2">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Text as="label" size="6" weight="bold" align="center">Sign In</Text>
            <TextField.Root
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <TextField.Root
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            {error && (
              <Flex direction="column" gap="2" p="3" className="bg-red-50 border border-red-200 rounded">
                <Text color="red" size="2" weight="medium">⚠️ Sign In Failed</Text>
                <Text color="red" size="2">{error}</Text>
              </Flex>
            )}
            <Button type="submit" size="3" disabled={isLoading}>
              {isLoading ? (
                <Flex align="center" gap="2">
                  <Spinner size="2" />
                  Signing in...
                </Flex>
              ) : (
                'Sign In'
              )}
            </Button>
            <Text size="2" align="center">
              Don't have an account? <Link asChild><WouterLink to="/register">Register</WouterLink></Link>
            </Text>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
