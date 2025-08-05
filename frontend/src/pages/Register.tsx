// frontend/src/pages/Register.tsx
import { useState } from 'react';
import { Button, TextField, Flex, Text, Card, Link } from '@radix-ui/themes';
import { useLocation, Link as WouterLink } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Register() {
  const [fullName, setFullName] = useState(''); // Added
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // Added
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Updated payload
      const { data } = await axios.post('/api/auth/register', { 
        fullName, 
        email, 
        password, 
        phoneNumber 
      });
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <Flex align="center" justify="center" className="min-h-screen min-w-screen">
      <Card className="p-8 min-w-md max-w-1/3">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Text as="label" size="6" weight="bold" align="center">Create Account</Text>
            <TextField.Root
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <TextField.Root
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField.Root
              placeholder="Phone Number (Optional)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <TextField.Root
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <Text color="red" size="2">{error}</Text>}
            <Button type="submit" size="3">Register</Button>
            <Text size="2" align="center">
              Already have an account? <Link asChild><WouterLink to="/login">Sign In</WouterLink></Link>
            </Text>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
