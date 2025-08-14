import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { Flex, Spinner } from '@radix-ui/themes';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Flex align="center" justify="center" className="w-screen h-screen"><Spinner/></Flex>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};
