// frontend/src/admin/pages/users/UserShow.tsx
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Badge,
  Switch,
  Button,
  Card,
  Separator,
  Spinner
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

export const UserShow = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const [, navigate] = useLocation();

  useEffect(() => {
    fetchUser();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/users/${params.id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!user) return;

    try {
      await axios.put(`/api/admin/users/${user.id}/status`, { isActive: isActive ? 1 : 0 });
      setUser({ ...user, isActive: isActive ? 1 : 0 });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
        <Spinner />
        <Text size="2" ml="2">Loading user details...</Text>
      </Flex>
    );
  }

  if (!user) {
    return (
      <Box>
        <Text size="4" color="red">User not found</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex align="center" gap="4" mb="6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeftIcon />
          Back to Users
        </Button>
        <Text size="6" weight="bold">
          User Details
        </Text>
      </Flex>

      <Card>
        <Flex direction="column" gap="6">
          <Flex gap="4" direction="column">
            <Text size="4" weight="bold">Basic Information</Text>
            <Flex direction="column" gap="4">
              
                <Flex gap='4' style={{ alignItems: 'center' }}>
                  <Text size="2" color="gray">ID</Text>
                  <Text size="2">{user.id}</Text>
                </Flex>
                <Flex gap='4' style={{ alignItems: 'center' }}>
                  <Text size="2" color="gray">Full Name</Text>
                  <Text size="2" weight="medium">{user.fullName}</Text>
                </Flex>
              

              
                <Flex gap="4" style={{ alignItems: 'center' }}>
                  <Text size="2" color="gray">Email</Text>
                  <Text size="2">{user.email}</Text>
                </Flex>
                <Flex gap="4" style={{ alignItems: 'center' }}>
                  <Text size="2" color="gray">Phone Number</Text>
                  <Text size="2">{user.phoneNumber || "N/A"}</Text>
                </Flex>
              
            </Flex>
          </Flex>

          <Separator size="4" />

          <Flex gap="4" direction="column">
            <Text size="4" weight="bold" mb="4">Account Settings</Text>
            <Flex gap="4">
                <Text size="2" color="gray">Role</Text>
                <Badge
                color={user.role === 'admin' ? 'red' : 'blue'}
                variant="soft"
                size="2"
                >
                {user.role}
                </Badge>
            </Flex>

            <Flex gap="4">
                <Text size="2" color="gray">Status</Text>
                <Flex align="center" gap="2">
                <Switch
                    checked={user.isActive === 1}
                    onCheckedChange={handleStatusChange}
                />
                <Text size="2" color={user.isActive === 1 ? "green" : "red"}>
                    {user.isActive === 1 ? "Active" : "Disabled"}
                </Text>
                </Flex>
            </Flex>
                    

              <Flex gap="4">
                <Text size="2" color="gray">Created At</Text>
                <Text size="2">{new Date(user.createdAt).toLocaleString()}</Text>
              </Flex>
          </Flex>
        </Flex>
      </Card>
    </Box>
  );
};
