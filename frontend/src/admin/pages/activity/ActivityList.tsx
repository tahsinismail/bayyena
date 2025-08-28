// frontend/src/admin/pages/activity/ActivityList.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Badge,
  Spinner,
} from "@radix-ui/themes";
import { ResponsiveTable } from "../../components/ResponsiveTable";

interface UserActivity {
  id: number;
  userId: number;
  action: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface ColumnDefinition {
  title: string;
  dataIndex: keyof UserActivity;
  key: string;
  render?: (value: any) => React.ReactNode;
  width?: string;
  hiddenOnMobile?: boolean;
}

export const ActivityList = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/activity');
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
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
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      render: (userId: number) => <Text size="2">{userId}</Text>,
      width: "100px",
      hiddenOnMobile: true
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (action: string) => (
        <Badge
          color={
            action === 'login' ? 'green' :
            action === 'case_created' ? 'blue' :
            action === 'document_uploaded' ? 'orange' :
            'gray'
          }
          variant="soft"
        >
          {action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      title: "Details",
      dataIndex: "details",
      key: "details",
      render: (details: any) => (
        <Box style={{ maxWidth: '300px', maxHeight: '100px', overflow: 'auto' }}>
          <Text size="1" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(details, null, 2)}
          </Text>
        </Box>
      ),
      hiddenOnMobile: true
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      render: (ip: string) => <Text size="2">{ip}</Text>,
      hiddenOnMobile: true
    },
    {
      title: "User Agent",
      dataIndex: "userAgent",
      key: "userAgent",
      render: (userAgent: string) => (
        <Text size="2" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {userAgent}
        </Text>
      ),
      hiddenOnMobile: true
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => (
        <Text size="2">{new Date(date).toLocaleString()}</Text>
      ),
    },
  ];

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
        <Spinner />
        <Text size="2" ml="2">Loading activities...</Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text size="6" weight="bold" mb="6">
        User Activity
      </Text>

      <ResponsiveTable
        data={activities}
        columns={columns}
        loading={loading}
        emptyText="No activities found"
      />
    </Box>
  );
};
