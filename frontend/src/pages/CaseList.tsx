import { useState, useEffect } from 'react';
import { Button, Flex, Heading, Text, Table, Card, Badge } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next'; // Import the hook
import { type Case } from '../types';
import { getCases } from '../api';
import CaseForm from '../components/CaseForm';

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { t } = useTranslation(); // Use the hook

  // Helper function to get status color and variant
  const getStatusProps = (status: string) => {
    switch (status) {
      case 'Open':
        return { color: 'blue' as const, variant: 'solid' as const };
      case 'Pending':
        return { color: 'orange' as const, variant: 'solid' as const };
      case 'Closed':
        return { color: 'green' as const, variant: 'solid' as const };
      case 'Archived':
        return { color: 'gray' as const, variant: 'solid' as const };
      default:
        return { color: 'gray' as const, variant: 'soft' as const };
    }
  };

  const fetchCases = async () => {
    try {
      setError('');
      setIsLoading(true);
      const { data } = await getCases();
      setCases(data);
    } catch (err) {
      setError('Failed to fetch cases.'); // This error message could also be translated
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchCases();
  };

  return (
    <div className="p-4 md:p-8 min-w-screen">
      {/* The CaseForm component should also be refactored internally */}
      {showForm && (
          <CaseForm onSuccess={handleCreateSuccess} onCancel={() => setShowForm(false)} />
      )}
      <Card>
        <Flex justify="between" align="center" mb="6" p="4">
          <Heading>{t('myCases')}</Heading>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon /> {t('createCase')}
          </Button>
        </Flex>
        {isLoading && <Text className="p-4">Loading cases...</Text>}
        {error && <Text color="red" className="p-4">{error}</Text>}
        {!isLoading && !error && (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>{t('caseTitle')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('caseNumber')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('caseType')}</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>{t('caseStatus')}</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {cases.length > 0 ? (
                cases.map(c => (
                  <Table.Row key={c.id}>
                    <Table.RowHeaderCell>
                      <Link href={`/cases/${c.id}`}><a className="text-[#856A00] hover:underline">{c.title}</a></Link>
                    </Table.RowHeaderCell>
                    <Table.Cell>{c.caseNumber}</Table.Cell>
                    <Table.Cell>{c.type}</Table.Cell>
                    <Table.Cell>
                      <Badge {...getStatusProps(c.status)}>
                        {t(`status${c.status}` as any) || c.status}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : (
                <Table.Row>
                  <Table.Cell colSpan={4} align="center" className="p-6">
                    <Text>{t('noCasesFound')}</Text>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        )}
      </Card>
    </div>
  );
}
