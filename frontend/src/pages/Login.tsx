import { useState } from 'react';
import { Button, TextField, Flex, Text, Card, Link } from '@radix-ui/themes';
import { useLocation, Link as WouterLink } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Flex direction="column" align="center" justify="center" className="min-h-screen min-w-screen">
      <img src="/logo.png" alt="Logo" className="mb-8"  width={150} height={150}/>
      <Card className="p-16 min-w-md min-h-max w-1/3 h-1/2">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Text as="label" size="6" weight="bold" align="center">Sign In</Text>
            <TextField.Root
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField.Root
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <Text color="red" size="2">{error}</Text>}
            <Button type="submit" size="3">Login</Button>
            <Text size="2" align="center">
              Don't have an account? <Link asChild><WouterLink to="/register">Register</WouterLink></Link>
            </Text>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}
