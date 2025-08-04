// frontend/src/pages/CaseDetail.tsx
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Heading, Text, Card, Flex, Box, Spinner } from '@radix-ui/themes';
import axios from 'axios';
import { type Case } from '../types';

export default function CaseDetail() {
  // useRoute hook from wouter helps extract URL parameters
  const [match, params] = useRoute("/cases/:id");
  const caseId = params?.id;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!caseId) return;

    const fetchCaseDetails = async () => {
      try {
        setError('');
        setIsLoading(true);
        const { data } = await axios.get<Case>(`/api/cases/${caseId}`);
        setCaseData(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch case details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseId]);

  if (isLoading) {
    return <Flex justify="center" align="center" p="8"><Spinner size="3" /></Flex>;
  }

  if (error) {
    return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;
  }

  return (
    <div className="p-4 md:p-8">
        {caseData && (
            <Card>
                <Box p="6">
                    <Flex direction="column" gap="4">
                        <Heading as="h1" size="7">{caseData.title}</Heading>
                        <Flex gap="6">
                            <Text size="2"><strong>Case Number:</strong> {caseData.caseNumber}</Text>
                            <Text size="2"><strong>Type:</strong> {caseData.type}</Text>
                            <Text size="2"><strong>Status:</strong> {caseData.status}</Text>
                        </Flex>
                        <Box mt="4">
                            <Heading as="h3" size="4" mb="2">Description</Heading>
                            <Text as="p" size="3" className="whitespace-pre-wrap">
                                {caseData.description || 'No description provided.'}
                            </Text>
                        </Box>
                    </Flex>
                </Box>
            </Card>
        )}
    </div>
  );
}
