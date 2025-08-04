// frontend/src/components/Layout.tsx
import { type ReactNode } from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <Flex direction="column" className="min-h-screen">
      <Box p="4" className="border-b">
        <Flex justify="between" align="center">
          <Text weight="bold" size="5">LegalCaseBuilder</Text>
          <Flex gap="4" align="center">
            <Text>Welcome, {user?.fullName}</Text>
            <Button onClick={handleLogout} variant="soft" color="red">
              Logout
            </Button>
          </Flex>
        </Flex>
      </Box>
      <main className="flex-grow bg-gray-50">{children}</main>
    </Flex>
  );
}
