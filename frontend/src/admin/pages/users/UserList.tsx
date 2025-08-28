// frontend/src/admin/pages/users/UserList.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Button,
  Badge,
  Switch,
  Spinner,
} from "@radix-ui/themes";
import {
  EyeOpenIcon,
  Pencil1Icon,
  Cross1Icon
} from "@radix-ui/react-icons";
import { ResponsiveTable } from "../../components/ResponsiveTable";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: number;
  createdAt: string;
}

interface ColumnDefinition {
  title: string;
  dataIndex: keyof User;
  key: string;
  render?: (value: any, record?: User) => React.ReactNode;
  width?: string;
  hiddenOnMobile?: boolean;
}

export const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleStatusChange = async (userId: number, isActive: boolean) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { isActive: isActive ? 1 : 0 });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const columns: ColumnDefinition[] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id: number) => <Text size="2">{id}</Text>,
      width: "80px",
      hiddenOnMobile: true
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      render: (name: string) => <Text size="2" weight="medium">{name}</Text>
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => <Text size="2">{email}</Text>
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string, record?: User) => (
        <Flex align="center" gap="2">
          <Badge
            color={role === 'admin' ? 'red' : 'blue'}
            variant="soft"
          >
            {role}
          </Badge>
          {role !== 'admin' && record && (
            <Button
              size="1"
              variant="soft"
              onClick={() => handleRoleChange(record.id, 'admin')}
            >
              <Pencil1Icon />
              Make Admin
            </Button>
          )}
          {role === 'admin' && record && (
            <Button
              size="1"
              variant="soft"
              color="red"
              onClick={() => handleRoleChange(record.id, 'user')}
            >
              <Cross1Icon />
              Remove Admin
            </Button>
          )}
        </Flex>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: number, record?: User) => (
        <Flex align="center" gap="2">
          <Switch
            checked={isActive === 1}
            onCheckedChange={(checked: boolean) => record && handleStatusChange(record.id, checked)}
          />
          <Text size="2" color={isActive === 1 ? "green" : "red"}>
            {isActive === 1 ? "Active" : "Disabled"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <Text size="2">{new Date(date).toLocaleDateString()}</Text>
      ),
      hiddenOnMobile: true
    },
    {
      title: "Actions",
      dataIndex: "id" as keyof User,
      key: "actions",
      render: (_: any, record?: User) => (
        <Button
          size="1"
          variant="soft"
          onClick={() => record && navigate(`/admin/users/${record.id}`)}
        >
          <EyeOpenIcon />
          View
        </Button>
      ),
      width: "100px"
    },
  ];

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
        <Spinner />
        <Text size="2" ml="2">Loading users...</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text size="6" weight="bold" mb="6">
        User Management
      </Text>

      <ResponsiveTable
        data={users}
        columns={columns}
        loading={loading}
        emptyText="No users found"
      />
    </Box>
  );
};
