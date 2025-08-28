// frontend/src/admin/pages/dashboard/Dashboard.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Card,
  Grid,
  Spinner,
} from "@radix-ui/themes";
import {
  PersonIcon,
  ActivityLogIcon,
  GearIcon,
  CheckCircledIcon
} from "@radix-ui/react-icons";

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
      if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
        <Spinner />
        <Text size="2" ml="2">Loading dashboard...</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text size="6" weight="bold" mb="6">
        Admin Dashboard
      </Text>

      <Grid columns={{ initial: "1", md: "2", lg: "4" }} gap="4" mb="8">
        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2" color="gray">Total Users</Text>
              <PersonIcon />
            </Flex>
            <Text size="5" weight="bold" style={{ color: 'var(--blue-11)' }}>
              {stats.totalUsers}
            </Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2" color="gray">Active Users</Text>
              <PersonIcon />
            </Flex>
            <Text size="5" weight="bold" style={{ color: 'var(--green-11)' }}>
              {stats.activeUsers}
            </Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2" color="gray">Admin Users</Text>
              <GearIcon />
            </Flex>
            <Text size="5" weight="bold" style={{ color: 'var(--orange-11)' }}>
              {stats.adminUsers}
            </Text>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" justify="between">
              <Text size="2" color="gray">Recent Activity</Text>
              <ActivityLogIcon />
            </Flex>
            <Text size="5" weight="bold" style={{ color: 'var(--purple-11)' }}>
              {stats.recentActivity}
            </Text>
          </Flex>
        </Card>
      </Grid>

      <Grid columns={{ initial: "1", md: "2" }} gap="6">
        <Card>
          <Flex direction="column" gap="4">
            <Text size="4" weight="bold">System Status</Text>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <CheckCircledIcon style={{ color: 'var(--green-11)' }} />
                <Text size="2">Database: Connected</Text>
              </Flex>
              <Flex align="center" gap="2">
                <CheckCircledIcon style={{ color: 'var(--green-11)' }} />
                <Text size="2">Authentication: Working</Text>
              </Flex>
              <Flex align="center" gap="2">
                <CheckCircledIcon style={{ color: 'var(--green-11)' }} />
                <Text size="2">Admin Panel: Active</Text>
              </Flex>
              <Flex align="center" gap="2">
                <CheckCircledIcon style={{ color: 'var(--green-11)' }} />
                <Text size="2">Activity Logging: Enabled</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Grid>
    </Box>
  );
};
