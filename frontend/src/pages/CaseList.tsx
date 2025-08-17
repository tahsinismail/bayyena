import { useState, useEffect } from 'react';
import { Button, Flex, Heading, Text, Card, Badge, Grid, Box, Spinner } from '@radix-ui/themes';
import { PlusIcon, CalendarIcon, FileTextIcon, ClockIcon } from '@radix-ui/react-icons';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { type Case } from '../types';
import { getCases, createCase } from '../api';
import { format } from 'date-fns';

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [, navigate] = useLocation();
  const { t } = useTranslation();

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

  // Helper function to get case type icon and color
  const getCaseTypeProps = (type: string) => {
    switch (type) {
      case 'Civil Dispute':
        return { color: 'blue', icon: '⚖️' };
      case 'Criminal Defense':
        return { color: 'red', icon: '🚨' };
      case 'Family Law':
        return { color: 'pink', icon: '👨‍👩‍👧‍👦' };
      case 'Intellectual Property':
        return { color: 'purple', icon: '💡' };
      case 'Corporate Law':
        return { color: 'indigo', icon: '🏢' };
      default:
        return { color: 'gray', icon: '📋' };
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to get relative time
  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
      return `${Math.floor(diffInDays / 365)} years ago`;
    } catch {
      return 'Unknown';
    }
  };

  const fetchCases = async () => {
    try {
      setError('');
      setIsLoading(true);
      const { data } = await getCases();
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

  const handleCreateCase = async () => {
    try {
      setIsCreating(true);
      setError('');
      const { data: newCase } = await createCase({ type: 'Civil Dispute' });
      navigate(`/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create case');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-w-screen">
        <Flex justify="center" align="center" className="min-h-[400px]">
          <Flex direction="column" align="center" gap="4">
            <Spinner size="3" />
            <Text size="3" color="gray">Loading cases...</Text>
          </Flex>
        </Flex>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-w-screen">
      {/* Header Section */}
      <Card className="mb-6">
        <Box p="6">
          <Flex 
            direction={{ initial: 'column', sm: 'row' }} 
            justify="between" 
            align={{ initial: 'start', sm: 'center' }} 
            gap="4"
          >
            <Flex direction="column" gap="2">
              <Heading size="6" className="text-gray-900">{t('myCases')}</Heading>
              <Text size="2" color="gray" className="text-gray-600">
                {cases.length > 0 ? `${cases.length} case${cases.length !== 1 ? 's' : ''} found` : 'No matter yet'}
              </Text>
            </Flex>
            <Button 
              onClick={handleCreateCase} 
              disabled={isCreating}
              size="3"
              className="case-create-button"
            >
              <PlusIcon />
              {isCreating ? 'Creating...' : t('createCase')}
            </Button>
          </Flex>
        </Box>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <Box p="4">
            <Text color="red" size="2">{error}</Text>
          </Box>
        </Card>
      )}

      {/* Cases Grid */}
      {!isLoading && !error && (
        <>
          {cases.length > 0 ? (
            <Grid 
              columns={{ initial: '1', sm: '2', lg: '3', xl: '4' }} 
              gap="4"
              className="case-grid"
            >
                             {cases.map(caseItem => {
                 const statusProps = getStatusProps(caseItem.status);
                 const typeProps = getCaseTypeProps(caseItem.type);
                 
                 return (
                  <Card 
                    key={caseItem.id} 
                    className="case-card w-full h-full hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                  >
                    <div className="w-full h-full p-4 relative flex flex-col justify-between">
                      {/* Case Header */}
                      <Flex justify="between" align="start" mb="4" gap="3">
                        <Flex direction="column" gap="2" className="flex-1 min-w-0">
                          <Text 
                            size="3" 
                            weight="bold" 
                            className="text-gray-900 line-clamp-2 hover:text-[#856A00] transition-colors"
                          >
                            {caseItem.title || 'Untitled Matter'}
                          </Text>
                          <Text size="1" color="gray" className="text-gray-500 font-mono">
                            #{caseItem.caseNumber}
                          </Text>
                        </Flex>
                        <Badge {...statusProps} size="1" className="flex-shrink-0">
                          {t(`status${caseItem.status}` as any) || caseItem.status}
                        </Badge>
                      </Flex>

                      {/* Case Type */}
                      <Flex align="center" gap="2" mb="4">
                        <Text size="1" className="text-2xl">{typeProps.icon}</Text>
                        <Text size="2" color="gray" className="text-gray-600">
                          {caseItem.type}
                        </Text>
                      </Flex>

                      {/* Case Description */}
                      {caseItem.description && (
                        <Text 
                          size="2" 
                          color="gray" 
                          className="text-gray-600 line-clamp-2"
                        >
                          {caseItem.description}
                        </Text>
                      )}

                      {/* Case Metadata */}
                      <Flex 
                        direction="column" 
                        gap="2" 
                        className="case-metadata"
                      >
                        {/* Created Date */}
                        <Flex align="center" gap="2">
                          <CalendarIcon className="text-gray-400" />
                          <Text size="1" color="gray" className="text-gray-500">
                            Created {formatDate(caseItem.createdAt)}
                          </Text>
                        </Flex>

                        {/* Last Updated */}
                        <Flex align="center" gap="2">
                          <ClockIcon className="text-gray-400" />
                          <Text size="1" color="gray" className="text-gray-500">
                            Updated {getRelativeTime(caseItem.updatedAt)}
                          </Text>
                        </Flex>

                        {/* User Info */}
                        {/* <Flex align="center" gap="2">
                          <PersonIcon className="text-gray-400" />
                          <Text size="1" color="gray" className="text-gray-500">
                            Case ID: {caseItem.id}
                          </Text>
                        </Flex> */}
                      </Flex>

                      {/* Action Button */}
                      <div className="flex-1 min-w-full min-h-full justify-self-end self-end mt-4">
                        <Button 
                          variant="soft" 
                          className="w-full case-view-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${caseItem.id}`);
                          }}
                        >
                          <FileTextIcon />
                          View Case Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </Grid>
          ) : (
            /* Empty State */
            <Card className="empty-state-card">
              <Box p="8" className="text-center">
                <div className="text-6xl mb-4">📋</div>
                <Heading size="4" className="text-gray-700 mb-2">
                  {t('noCasesFound')}
                </Heading>
                <Text size="2" color="gray" className="text-gray-500 mb-6">
                  Start building your legal matter portfolio by creating your first matter.
                </Text>
              </Box>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
