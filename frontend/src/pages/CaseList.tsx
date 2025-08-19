import { useState, useEffect } from 'react';
import { Flex, Heading, Card, Text, TextField, TextArea, Select, IconButton, AlertDialog, Button, Badge, Box, Spinner, Grid } from '@radix-ui/themes';
import { PlusIcon, CalendarIcon, FileTextIcon, ClockIcon, Pencil1Icon, CheckIcon, Cross2Icon, TrashIcon } from '@radix-ui/react-icons';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { type Case, type CaseType, type CaseStatus } from '../types';
import { getCases, createCase, updateCase, updateCaseStatus, deleteCase } from '../api';
import { format } from 'date-fns';

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  // Editing states for inline editing
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | 'type' | 'status' | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<CaseType>('Civil Dispute');
  const [editStatus, setEditStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Case types and statuses
  const caseTypes: CaseType[] = ['Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other'];
  const caseStatuses: string[] = ['Open', 'Pending', 'Closed', 'Archived'];

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

  // Inline editing functions
  const startEditing = (caseId: number, field: 'title' | 'description' | 'type' | 'status', currentValue: string) => {
    setEditingCaseId(caseId);
    setEditingField(field);
    switch (field) {
      case 'title':
        setEditTitle(currentValue);
        break;
      case 'description':
        setEditDescription(currentValue);
        break;
      case 'type':
        setEditType(currentValue as CaseType);
        break;
      case 'status':
        setEditStatus(currentValue);
        break;
    }
  };

  const cancelEditing = () => {
    setEditingCaseId(null);
    setEditingField(null);
    setEditTitle('');
    setEditDescription('');
    setEditType('Civil Dispute');
    setEditStatus('');
  };

  const saveEdit = async (caseId: number, field: 'title' | 'description' | 'type' | 'status') => {
    try {
      setIsSaving(true);
      let updateData: any = {};
      
      switch (field) {
        case 'title':
          updateData = { title: editTitle.trim() };
          break;
        case 'description':
          updateData = { description: editDescription.trim() };
          break;
        case 'type':
          updateData = { type: editType };
          break;
        case 'status':
          // Use separate API for status updates
          await updateCaseStatus(caseId.toString(), editStatus);
          setCases(prevCases => 
            prevCases.map(c => 
              c.id === caseId ? { ...c, status: editStatus as CaseStatus } : c
            )
          );
          cancelEditing();
          return;
      }

      const { data: updatedCase } = await updateCase(caseId.toString(), updateData);
      setCases(prevCases => 
        prevCases.map(c => 
          c.id === caseId ? updatedCase : c
        )
      );
      cancelEditing();
    } catch (err: any) {
      console.error(`Failed to update ${field}:`, err);
      // Could add error handling here
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = async (caseId: number) => {
    try {
      setDeleteError('');
      await deleteCase(caseId.toString());
      setCases(prevCases => prevCases.filter(c => c.id !== caseId));
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete the case.');
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
                 const isEditingTitle = editingCaseId === caseItem.id && editingField === 'title';
                 const isEditingDescription = editingCaseId === caseItem.id && editingField === 'description';
                 const isEditingType = editingCaseId === caseItem.id && editingField === 'type';
                 const isEditingStatus = editingCaseId === caseItem.id && editingField === 'status';
                 
                 return (
                  <Card 
                    key={caseItem.id} 
                    className="case-card w-full h-full hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-full h-full p-4 relative flex flex-col justify-between">
                      {/* Case Header with Inline Title Editing */}
                      <Flex justify="between" align="start" mb="4" gap="3">
                        <Flex direction="column" gap="2" className="flex-1 min-w-0">
                          {isEditingTitle ? (
                            <Flex direction="column" gap="2" style={{ width: '100%' }}>
                              <TextField.Root 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Enter matter title"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(caseItem.id, 'title');
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                              />
                              <Flex gap="2">
                                <Button 
                                  size="1" 
                                  onClick={() => saveEdit(caseItem.id, 'title')} 
                                  disabled={isSaving}
                                  variant="solid"
                                  color="green"
                                >
                                  <CheckIcon />
                                </Button>
                                <Button 
                                  size="1" 
                                  onClick={cancelEditing}
                                  variant="soft"
                                  color="gray"
                                >
                                  <Cross2Icon />
                                </Button>
                              </Flex>
                            </Flex>
                          ) : (
                            <Flex align="center" gap="2" style={{ width: '100%' }}>
                              <Text 
                                size="3" 
                                weight="bold" 
                                className="text-gray-900 line-clamp-2 hover:text-[#856A00] transition-colors cursor-pointer flex-1"
                                onClick={() => navigate(`/cases/${caseItem.id}`)}
                              >
                                {caseItem.title || 'Untitled Matter'}
                              </Text>
                              <IconButton 
                                size="1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(caseItem.id, 'title', caseItem.title);
                                }}
                                variant="ghost"
                                className="edit-button opacity-0 group-hover:opacity-100"
                              >
                                <Pencil1Icon />
                              </IconButton>
                            </Flex>
                          )}
                          <Text size="1" color="gray" className="text-gray-500 font-mono">
                            #{caseItem.caseNumber}
                          </Text>
                        </Flex>
                        
                        {/* Status Badge with Inline Editing */}
                        {isEditingStatus ? (
                          <Flex direction="column" gap="2" className="flex-shrink-0">
                            <Select.Root value={editStatus} onValueChange={(value) => setEditStatus(value)}>
                              <Select.Trigger style={{ minWidth: '120px' }} />
                              <Select.Content>
                                {caseStatuses.map((status) => (
                                  <Select.Item key={status} value={status}>
                                    {status}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                            <Flex gap="1">
                              <IconButton 
                                size="1" 
                                onClick={() => saveEdit(caseItem.id, 'status')} 
                                disabled={isSaving}
                                variant="solid"
                                color="green"
                              >
                                <CheckIcon />
                              </IconButton>
                              <IconButton 
                                size="1" 
                                onClick={cancelEditing}
                                variant="soft"
                                color="gray"
                              >
                                <Cross2Icon />
                              </IconButton>
                            </Flex>
                          </Flex>
                        ) : (
                          <Flex align="center" gap="1" className="flex-shrink-0 group">
                            <Badge {...statusProps} size="1">
                              {t(`status${caseItem.status}` as any) || caseItem.status}
                            </Badge>
                            <IconButton 
                              size="1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(caseItem.id, 'status', caseItem.status);
                              }}
                              variant="ghost"
                              className="edit-button opacity-0 group-hover:opacity-100"
                            >
                              <Pencil1Icon />
                            </IconButton>
                          </Flex>
                        )}
                      </Flex>

                      {/* Case Type with Inline Editing */}
                      <Flex align="center" gap="2" mb="4">
                        <Text size="1" className="text-2xl">{typeProps.icon}</Text>
                        {isEditingType ? (
                          <Flex direction="column" gap="2" style={{ width: '100%' }}>
                            <Select.Root value={editType} onValueChange={(value) => setEditType(value as CaseType)}>
                              <Select.Trigger style={{ flex: 1 }} />
                              <Select.Content>
                                {caseTypes.map((type) => (
                                  <Select.Item key={type} value={type}>
                                    {type}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                            <Flex gap="2">
                              <Button 
                                size="1" 
                                onClick={() => saveEdit(caseItem.id, 'type')} 
                                disabled={isSaving}
                                variant="solid"
                                color="green"
                              >
                                <CheckIcon />
                              </Button>
                              <Button 
                                size="1" 
                                onClick={cancelEditing}
                                variant="soft"
                                color="gray"
                              >
                                <Cross2Icon />
                              </Button>
                            </Flex>
                          </Flex>
                        ) : (
                          <Flex align="center" gap="2" className="group" style={{ width: '100%' }}>
                            <Text size="2" color="gray" className="text-gray-600 flex-1">
                              {caseItem.type}
                            </Text>
                            <IconButton 
                              size="1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(caseItem.id, 'type', caseItem.type);
                              }}
                              variant="ghost"
                              className="edit-button opacity-0 group-hover:opacity-100"
                            >
                              <Pencil1Icon />
                            </IconButton>
                          </Flex>
                        )}
                      </Flex>

                      {/* Case Description with Inline Editing */}
                      {isEditingDescription ? (
                        <Box mb="4">
                          <TextArea 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Enter case description"
                            rows={3}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) saveEdit(caseItem.id, 'description');
                              if (e.key === 'Escape') cancelEditing();
                            }}
                          />
                          <Flex gap="2" mt="2">
                            <Button 
                              size="1" 
                              onClick={() => saveEdit(caseItem.id, 'description')} 
                              disabled={isSaving}
                              variant="solid"
                              color="green"
                            >
                              <CheckIcon /> Save
                            </Button>
                            <Button 
                              size="1" 
                              onClick={cancelEditing}
                              variant="soft"
                              color="gray"
                            >
                              <Cross2Icon /> Cancel
                            </Button>
                          </Flex>
                        </Box>
                      ) : (
                        <Box mb="4" className="group">
                          {caseItem.description ? (
                            <Flex align="start" gap="2">
                              <Text 
                                size="2" 
                                color="gray" 
                                className="text-gray-600 line-clamp-2 flex-1"
                              >
                                {caseItem.description}
                              </Text>
                              <IconButton 
                                size="1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(caseItem.id, 'description', caseItem.description || '');
                                }}
                                variant="ghost"
                                className="edit-button opacity-0 group-hover:opacity-100"
                              >
                                <Pencil1Icon />
                              </IconButton>
                            </Flex>
                          ) : (
                            <Flex align="center" gap="2">
                              <Text 
                                size="2" 
                                color="gray" 
                                className="text-gray-400 italic flex-1"
                              >
                                No description provided
                              </Text>
                              <IconButton 
                                size="1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(caseItem.id, 'description', '');
                                }}
                                variant="ghost"
                                className="edit-button opacity-0 group-hover:opacity-100"
                              >
                                <Pencil1Icon />
                              </IconButton>
                            </Flex>
                          )}
                        </Box>
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
                      </Flex>

                      {/* Action Buttons */}
                      <Flex gap="2" mt="4" className="w-full">
                        <Button 
                          variant="soft" 
                          className="flex-1 case-view-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cases/${caseItem.id}`);
                          }}
                        >
                          <FileTextIcon />
                          View Details
                        </Button>
                        
                        {/* Delete Button */}
                        <AlertDialog.Root>
                          <AlertDialog.Trigger>
                            <IconButton 
                              variant="soft" 
                              color="red"
                              className="flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TrashIcon />
                            </IconButton>
                          </AlertDialog.Trigger>
                          <AlertDialog.Content style={{ maxWidth: 450 }}>
                            <AlertDialog.Title>⚠️ Delete Legal Matter</AlertDialog.Title>
                            <AlertDialog.Description size="2">
                              This action will permanently delete "{caseItem.title}" and all associated documents. This cannot be undone.
                            </AlertDialog.Description>
                            {deleteError && <Text color="red" size="2" mt="2">{deleteError}</Text>}
                            <Flex gap="3" mt="4" justify="end">
                              <AlertDialog.Cancel>
                                <Button variant="soft" color="gray">Cancel</Button>
                              </AlertDialog.Cancel>
                              <AlertDialog.Action>
                                <Button variant="solid" color="red" onClick={() => handleDeleteCase(caseItem.id)}>
                                  Yes, Delete Matter
                                </Button>
                              </AlertDialog.Action>
                            </Flex>
                          </AlertDialog.Content>
                        </AlertDialog.Root>
                      </Flex>
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
