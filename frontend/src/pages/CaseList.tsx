// frontend/src/pages/CaseList.tsx
import { useState, useEffect } from 'react';
import { Button, Flex, Heading, Table, Card, Text } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { Link } from 'wouter'; // Import the Link component
import axios from 'axios';
import {type Case } from '../types';
import CaseForm from '../components/CaseForm';

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchCases = async () => {
    try {
      setError('');
      setIsLoading(true);
      const { data } = await axios.get<Case[]>('/api/cases');
      setCases(data);
    } catch (err) {
      setError('Failed to fetch cases.');
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
    <div className="p-4 md:p-8">
        <Card>
            <Flex justify="between" align="center" mb="6" p="4">
                <Heading>My Cases</Heading>
                <Button onClick={() => setShowForm(true)}>
                    <PlusIcon /> Create New Case
                </Button>
            </Flex>

            {/* ... loading and error states remain the same ... */}

            {!isLoading && !error && (
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Case Title</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Case Number</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {cases.length > 0 ? (
                            cases.map(c => (
                                <Table.Row key={c.id}>
                                    <Table.RowHeaderCell>
                                        {/* Use Link to navigate to the detail page */}
                                        <Link href={`/cases/${c.id}`}>
                                            {c.title}
                                        </Link>
                                    </Table.RowHeaderCell>
                                    <Table.Cell>{c.caseNumber}</Table.Cell>
                                    <Table.Cell>{c.type}</Table.Cell>
                                    <Table.Cell>{c.status}</Table.Cell>
                                </Table.Row>
                            ))
                        ) : (
                            <Table.Row>
                                <Table.Cell colSpan={4} align="center" className="p-6">
                                    <Text>No cases found. Get started by creating one!</Text>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            )}
        </Card>

        {showForm && (
            <CaseForm 
                onSuccess={handleCreateSuccess} 
                onCancel={() => setShowForm(false)} 
            />
        )}
    </div>
  );
}
