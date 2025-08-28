// frontend/src/admin/pages/auth/LoginPage.tsx
import { useState } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Button,
  Card,
  TextField,
  Spinner
} from "@radix-ui/themes";
import {
  ArrowLeftIcon
} from "@radix-ui/react-icons";
import { useAuth } from "../../../hooks/useAuth";

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [, navigate] = useLocation();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', formData);
      const user = response.data.user;

      if (user.role === 'admin') {
        setUser(user);
        navigate('/admin');
      } else {
        // Redirect non-admin users to main app
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      alert(error?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Flex
      justify="center"
      align="center"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--gray-1)',
        padding: '1rem'
      }}
    >
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <Flex direction="column" gap="6" p="6">
          <Box style={{ textAlign: 'center' }}>
            <Text size="6" weight="bold" style={{ color: 'var(--blue-11)' }}>
              LegalCaseBuilder
            </Text>
            <Text size="4" color="gray" mt="2">
              Admin Panel
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Box>
                <Text size="2" weight="medium" mb="2">Email</Text>
                <TextField.Root
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                  required
                  autoComplete="email"
                />
              </Box>

              <Box>
                <Text size="2" weight="medium" mb="2">Password</Text>
                <TextField.Root
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </Box>

              <Button
                type="submit"
                size="3"
                disabled={loading}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {loading ? (
                  <Flex align="center" gap="2">
                    <Spinner />
                    Signing in...
                  </Flex>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Flex>
          </form>

          <Flex justify="center">
            <Button
              variant="ghost"
              asChild
              style={{ color: 'var(--gray-11)' }}
            >
              <a href="/">
                <ArrowLeftIcon style={{ marginRight: '0.5rem' }} />
                Back to Main Application
              </a>
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
