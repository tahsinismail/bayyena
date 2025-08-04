import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { Flex, Text } from '@radix-ui/themes';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Flex align="center" justify="center" className="h-screen"><Text>Loading...</Text></Flex>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};
