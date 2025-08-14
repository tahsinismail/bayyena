import { useState, useEffect, useCallback } from 'react';
import { Card, Flex, Box, Text, Button, Spinner, ScrollArea, Separator, Select } from '@radix-ui/themes';
import { PlusIcon, CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';
import type { CaseTimelineEvent, CreateTimelineEventRequest, UpdateTimelineEventRequest } from '../types';
import { getDocumentTimelineEvents, createDocumentTimelineEvent, updateDocumentTimelineEvent, deleteDocumentTimelineEvent } from '../api';
import TimelineEvent from './TimelineEvent';
import TimelineEventForm from './TimelineEventForm';
import { useTranslation } from 'react-i18next';

interface DocumentTimelineProps {
  caseId: string;
  documentId: string;
  documentName: string;
}

export default function DocumentTimeline({ caseId, documentId, documentName }: DocumentTimelineProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CaseTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CaseTimelineEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest-first' | 'oldest-first'>('latest-first');

  // Helper function to sort events based on selected order
  const sortEvents = useCallback((eventsToSort: CaseTimelineEvent[]) => {
    return [...eventsToSort].sort((a, b) => {
      const dateA = new Date(a.eventDate).getTime();
      const dateB = new Date(b.eventDate).getTime();
      
      if (sortOrder === 'latest-first') {
        return dateB - dateA; // Latest first (descending)
      } else {
        return dateA - dateB; // Oldest first (ascending)
      }
    });
  }, [sortOrder]);

  // Computed sorted events
  const sortedEvents = sortEvents(events);

  const fetchTimelineEvents = useCallback(async () => {
    if (!caseId || !documentId) return;
    
    try {
      setIsLoading(true);
      const { data } = await getDocumentTimelineEvents(caseId, documentId);
      setEvents(data || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching document timeline events:', err);
      setError('Failed to load timeline events.');
    } finally {
      setIsLoading(false);
    }
  }, [caseId, documentId]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  const handleCreateEvent = async (data: CreateTimelineEventRequest) => {
    if (!caseId || !documentId) return;
    
    try {
      setIsSubmitting(true);
      const response = await createDocumentTimelineEvent(caseId, documentId, data);
      
      // Add the new event to the list and sort
      setEvents(prevEvents => [...prevEvents, response.data]);
      setIsFormOpen(false);
      setError('');
    } catch (err: any) {
      console.error('Error creating timeline event:', err);
      setError(err.response?.data?.message || 'Failed to create timeline event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async (eventId: number, data: UpdateTimelineEventRequest) => {
    if (!caseId || !documentId) return;
    
    try {
      setIsSubmitting(true);
      const response = await updateDocumentTimelineEvent(caseId, documentId, eventId, data);
      
      // Update the event in the list and sort
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? response.data : event
        )
      );
      setEditingEvent(null);
      setError('');
    } catch (err: any) {
      console.error('Error updating timeline event:', err);
      setError(err.response?.data?.message || 'Failed to update timeline event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: number | string) => {
    if (!caseId || !documentId) return;
    
    try {
      await deleteDocumentTimelineEvent(caseId, documentId, Number(eventId));
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      setError('');
    } catch (err: any) {
      console.error('Error deleting timeline event:', err);
      setError(err.response?.data?.message || 'Failed to delete timeline event.');
    }
  };

  const handleEditEvent = (event: CaseTimelineEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  // Get timeline statistics
  const userEventsCount = sortedEvents.filter(event => event.sourceType === 'user').length;
  const documentEventsCount = sortedEvents.filter(event => event.sourceType === 'document').length;

  return (
    <Card>
      <Box p="4">
        <Flex justify="between" align="center" mb="4" gap="4" wrap="wrap">
          <Flex align="center" gap="2">
            <CalendarIcon />
            <Text size="4" weight="bold">{t('timeline')} - {documentName}</Text>
          </Flex>
          <Flex align="center" gap="3">
            {/* Timeline Ordering */}
            <div className="timeline-sort-container align-center gap-2 hidden md:flex">
              <Text size="2" color="gray">📅 Sort:</Text>
              <Select.Root value={sortOrder} onValueChange={(value: 'latest-first' | 'oldest-first') => setSortOrder(value)} size="1">
                <Select.Trigger className="timeline-sort-select" style={{ minWidth: '140px' }} />
                <Select.Content>
                  <Select.Item value="latest-first">
                    <Flex align="center" gap="2" className="timeline-sort-item">
                      <ArrowDownIcon width={14} height={14} className="timeline-sort-icon" />
                      Latest First
                    </Flex>
                  </Select.Item>
                  <Select.Item value="oldest-first">
                    <Flex align="center" gap="2" className="timeline-sort-item">
                      <ArrowUpIcon width={14} height={14} className="timeline-sort-icon" />
                      Oldest First
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
            <Button onClick={() => setIsFormOpen(true)} size="2">
              <PlusIcon />
              {t('addEvent')}
            </Button>
          </Flex>
        </Flex>

        <div className="timeline-sort-container align-center gap-2 my-4 flex md:hidden">
              <Text size="2" color="gray">📅 Sort:</Text>
              <Select.Root value={sortOrder} onValueChange={(value: 'latest-first' | 'oldest-first') => setSortOrder(value)} size="1">
                <Select.Trigger className="timeline-sort-select" style={{ minWidth: '140px' }} />
                <Select.Content>
                  <Select.Item value="latest-first">
                    <Flex align="center" gap="2" className="timeline-sort-item">
                      <ArrowDownIcon width={14} height={14} className="timeline-sort-icon" />
                      Latest First
                    </Flex>
                  </Select.Item>
                  <Select.Item value="oldest-first">
                    <Flex align="center" gap="2" className="timeline-sort-item">
                      <ArrowUpIcon width={14} height={14} className="timeline-sort-icon" />
                      Oldest First
                    </Flex>
                  </Select.Item>
                </Select.Content>
              </Select.Root>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200 mb-4">
            <Box p="3">
              <Text size="2" color="red">{error}</Text>
            </Box>
          </Card>
        )}

        {/* Timeline Stats */}
        {sortedEvents.length > 0 && (
          <Card className="bg-blue-50 border-blue-200 mb-4">
            <Box p="3">
              <Flex justify="between" align="center" wrap="wrap">
                <Text size="2" weight="medium" color="blue">
                  📊 {t('totalEvents')}: {sortedEvents.length}
                </Text>
                <Flex gap="4">
                  <Text size="1" color="gray">
                    📄 {t('extractedFrom')} Document: {documentEventsCount}
                  </Text>
                  <Text size="1" color="gray">
                    👤 {t('userAdded')}: {userEventsCount}
                  </Text>
                </Flex>
              </Flex>
            </Box>
          </Card>
        )}

        <Separator my="4" size="4" />

        {/* Timeline Form */}
        <TimelineEventForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingEvent ? (data) => handleUpdateEvent(Number(editingEvent.id), data) : handleCreateEvent}
          editingEvent={editingEvent}
          isLoading={isSubmitting}
        />

        {/* Timeline Events */}
        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '70vh' }}>
          {isLoading ? (
            <Flex justify="center" align="center" py="8">
              <Spinner size="3" />
              <Text ml="3" color="gray">Loading timeline events...</Text>
            </Flex>
          ) : sortedEvents.length > 0 ? (
            <Flex direction="column" gap="3">
              {sortedEvents.map((event) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  onEdit={handleEditEvent}
                  onDelete={handleDeleteEvent}
                  canEdit={event.sourceType === 'user'}
                />
              ))}
            </Flex>
          ) : (
            <Box py="8" className="text-center">
              <Text size="3" color="gray" mb="3" className="block">
                📅 {t('noTimelineEvents')}
              </Text>
              <Text size="2" color="gray" mb="4" className="block">
                {t('timelineDescription')}
              </Text>
              <Button onClick={() => setIsFormOpen(true)} variant="soft">
                <PlusIcon />
                {t('addFirstEvent')}
              </Button>
            </Box>
          )}
        </ScrollArea>
      </Box>
    </Card>
  );
}
