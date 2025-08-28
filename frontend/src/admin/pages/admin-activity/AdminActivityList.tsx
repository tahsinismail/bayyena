// frontend/src/admin/pages/admin-activity/AdminActivityList.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Badge,
  Table,
  Spinner,
  Card,
  ScrollArea
} from "@radix-ui/themes";

interface AdminActivity {
  id: number;
  adminName: string;
  action: string;
  targetUserName: string;
  details: any;
  createdAt: string;
}

interface ColumnDefinition {
  title: string;
  dataIndex: keyof AdminActivity;
  key: string;
  render?: (value: any) => React.ReactNode;
}

export const AdminActivityList = () => {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/admin-activity');
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching admin activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDefinition[] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (value: number) => <Text size="2">{value}</Text>
    },
    {
      title: "Admin",
      dataIndex: "adminName",
      key: "adminName",
      render: (value: string) => <Text size="2" weight="medium">{value}</Text>
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (value: string) => (
        <Badge
          color={
            value === 'user_role_changed' ? 'red' :
            value === 'user_enabled' ? 'green' :
            value === 'user_disabled' ? 'orange' :
            value === 'feature_toggled' ? 'blue' :
            'gray'
          }
          variant="soft"
        >
          {value.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      title: "Target User",
      dataIndex: "targetUserName",
      key: "targetUserName",
      render: (value: string) => <Text size="2">{value}</Text>
    },
    {
      title: "Details",
      dataIndex: "details",
      key: "details",
      render: (value: any) => (
        <ScrollArea style={{ maxWidth: '300px', maxHeight: '100px' }}>
          <Text size="1" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(value, null, 2)}
          </Text>
        </ScrollArea>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => (
        <Text size="2">{new Date(value).toLocaleString()}</Text>
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
        Admin Activity Log
      </Text>

      <Card>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeaderCell key={col.key}>
                  {col.title}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {activities.map((activity) => (
              <Table.Row key={activity.id}>
                {columns.map((col) => (
                  <Table.Cell key={col.key}>
                    {col.render ? col.render(activity[col.dataIndex]) : String(activity[col.dataIndex] || '')}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};
