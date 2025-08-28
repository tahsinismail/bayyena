// frontend/src/admin/components/ResponsiveTable.tsx
import { useState, useEffect } from "react";
import {
  Flex,
  Box,
  Text,
  Card,
  ScrollArea,
  Button,
} from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

interface ColumnDefinition<T = any> {
  title: string;
  dataIndex: keyof T;
  key: string;
  render?: (value: any, record?: T) => React.ReactNode;
  width?: string;
  hiddenOnMobile?: boolean;
}

interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: ColumnDefinition<T>[];
  loading?: boolean;
  emptyText?: string;
}

export function ResponsiveTable<T = any>({
  data,
  columns,
  loading = false,
  emptyText = "No data available"
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check immediately in case the initial state was wrong
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const visibleColumns = columns.filter(col => !col.hiddenOnMobile || !isMobile);
  const hiddenColumns = columns.filter(col => col.hiddenOnMobile && isMobile);

  if (loading) {
    return (
      <Card>
        <Flex justify="center" align="center" p="6">
          <Text size="2">Loading...</Text>
        </Flex>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <Flex justify="center" align="center" p="6">
          <Text size="2" color="gray">{emptyText}</Text>
        </Flex>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Flex direction="column" gap="3">
        {data.map((record, index) => (
          <Card key={index}>
            <Box p="4">
              <Flex direction="column" gap="3">
                {/* Primary columns always visible */}
                {visibleColumns.map((col) => (
                  <Flex key={col.key} justify="between" align="center" wrap="wrap" gap="2">
                    <Text size="2" weight="medium" color="gray" style={{ minWidth: 'fit-content' }}>
                      {col.title}:
                    </Text>
                    <Box style={{ flex: 1, minWidth: '120px' }}>
                      {col.render ? col.render(record[col.dataIndex], record) : String(record[col.dataIndex] || '')}
                    </Box>
                  </Flex>
                ))}

                {/* Show expand button if there are hidden columns */}
                {hiddenColumns.length > 0 && (
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => toggleRowExpansion(index)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {expandedRows.has(index) ? (
                      <>
                        <ChevronUpIcon />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon />
                        Show More
                      </>
                    )}
                  </Button>
                )}

                {/* Expanded content */}
                {expandedRows.has(index) && hiddenColumns.length > 0 && (
                  <Box
                    style={{
                      borderTop: '1px solid var(--gray-6)',
                      paddingTop: '1rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    <Flex direction="column" gap="3">
                      {hiddenColumns.map((col) => (
                        <Flex key={col.key} justify="between" align="center">
                          <Text size="2" weight="medium" color="gray">
                            {col.title}:
                          </Text>
                          <Box style={{ flex: 1, marginLeft: '1rem' }}>
                            {col.render ? col.render(record[col.dataIndex], record) : String(record[col.dataIndex] || '')}
                          </Box>
                        </Flex>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Flex>
            </Box>
          </Card>
        ))}
      </Flex>
    );
  }

  // Desktop table view
  return (
    <Card>
      <ScrollArea style={{ width: '100%' }}>
        <Box style={{
          minWidth: '100%',
          display: 'table',
          tableLayout: 'auto'
        }}>
          <Box style={{
            display: 'table-header-group',
            backgroundColor: 'var(--gray-2)',
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            <Box style={{ display: 'table-row' }}>
              {visibleColumns.map((col) => (
                <Box
                  key={col.key}
                  style={{
                    display: 'table-cell',
                    padding: '0.75rem 1rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    borderBottom: '1px solid var(--gray-6)',
                    whiteSpace: 'nowrap',
                    minWidth: col.width || '120px'
                  }}
                >
                  {col.title}
                </Box>
              ))}
            </Box>
          </Box>
          <Box style={{ display: 'table-row-group' }}>
            {data.map((record, index) => (
              <Box key={index} style={{ display: 'table-row' }}>
                {visibleColumns.map((col) => (
                  <Box
                    key={col.key}
                    style={{
                      display: 'table-cell',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid var(--gray-6)',
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '200px'
                    }}
                  >
                    {col.render ? col.render(record[col.dataIndex], record) : String(record[col.dataIndex] || '')}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </ScrollArea>
    </Card>
  );
}
