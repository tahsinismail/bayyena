// frontend/src/pages/Dashboard.tsx
import { Button, Flex, Text } from '@radix-ui/themes';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Dashboard() {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <Flex direction="column" gap="4" align="center" justify="center" className="min-h-screen">
      {/* Use fullName for the welcome message */}
      <Text size="7">Welcome, {user?.fullName}!</Text>
      <Text>You are now on the main dashboard.</Text>
      <Button onClick={handleLogout} color="red" mt="4">Logout</Button>
    </Flex>
  );
}
