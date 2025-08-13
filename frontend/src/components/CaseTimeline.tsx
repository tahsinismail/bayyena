import { useState, useEffect, useCallback } from 'react';
import { Card, Flex, Box, Text, Button, Spinner, ScrollArea, Separator, Select } from '@radix-ui/themes';
import { PlusIcon, CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';
import type { CaseTimelineEvent, CreateTimelineEventRequest, UpdateTimelineEventRequest } from '../types';
import { getTimelineEvents, createTimelineEvent, updateTimelineEvent, deleteTimelineEvent } from '../api';
import TimelineEvent from './TimelineEvent';
import TimelineEventForm from './TimelineEventForm';
import { useTranslation } from 'react-i18next';

interface CaseTimelineProps {
  caseId: string;
}

export default function CaseTimeline({ caseId }: CaseTimelineProps) {
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
    if (!caseId) return;
    
    try {
      setIsLoading(true);
      const { data } = await getTimelineEvents(caseId);
      setEvents(data || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching timeline events:', err);
      setError(err.response?.data?.message || 'Failed to load timeline events');
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  const handleCreateEvent = async (data: CreateTimelineEventRequest) => {
    setIsSubmitting(true);
    try {
      const { data: response } = await createTimelineEvent(caseId, data);
      setEvents(prev => [...prev, response]);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Error creating timeline event:', error);
      throw new Error(error.response?.data?.message || 'Failed to create timeline event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async (data: UpdateTimelineEventRequest) => {
    if (!editingEvent || typeof editingEvent.id !== 'number') return;
    
    setIsSubmitting(true);
    try {
      const { data: response } = await updateTimelineEvent(caseId, editingEvent.id as number, data);
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id ? response : event
      ));
      setEditingEvent(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Error updating timeline event:', error);
      throw new Error(error.response?.data?.message || 'Failed to update timeline event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: number | string) => {
    if (typeof eventId !== 'number') return; // Can't delete document-extracted events
    
    try {
      await deleteTimelineEvent(caseId, eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error: any) {
      console.error('Error deleting timeline event:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete timeline event');
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

  const userEvents = sortedEvents.filter(event => event.sourceType === 'user');
  const documentEvents = sortedEvents.filter(event => event.sourceType === 'document');

  if (isLoading) {
    return (
      <Card>
        <Flex justify="center" align="center" p="8">
          <Spinner size="3" />
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Box p="6">
          <Flex direction="column" align="center" gap="3">
            <Text color="red" size="3">{error}</Text>
            <Button onClick={fetchTimelineEvents} variant="soft">
              Try Again
            </Button>
          </Flex>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Box p="4">
          {/* Header */}
          <Flex justify="between" align="center" mb="4">
            <Flex align="center" gap="2">
              <CalendarIcon />
              <Text size="4" weight="bold">{t('timeline')}</Text>
            </Flex>
            <Flex align="center" gap="3">
              {/* Timeline Ordering */}
              <Flex align="center" gap="2" className="timeline-sort-container">
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
              </Flex>
              <Button onClick={() => setIsFormOpen(true)} size="2">
                <PlusIcon />
                {t('addEvent')}
              </Button>
            </Flex>
          </Flex>

          {/* Timeline Stats */}
          {sortedEvents.length > 0 && (
            <Flex gap="4" mb="4" p="3" className="timeline-stats">
              <Flex align="center" gap="2">
                <Text size="2" color="gray">{t('totalEvents')}:</Text>
                <Text size="2" weight="medium">{sortedEvents.length}</Text>
              </Flex>
              <Separator orientation="vertical" size="1" />
              <Flex align="center" gap="2">
                <Text size="2" color="gray">{t('userAdded')}:</Text>
                <Text size="2" weight="medium" color="green">{userEvents.length}</Text>
              </Flex>
              <Separator orientation="vertical" size="1" />
              <Flex align="center" gap="2">
                <Text size="2" color="gray">{t('fromDocument')}:</Text>
                <Text size="2" weight="medium" color="blue">{documentEvents.length}</Text>
              </Flex>
            </Flex>
          )}

          {/* Timeline Events */}
          <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '70vh' }}>
            {sortedEvents.length > 0 ? (
              <Flex direction="column" gap="3">
                {sortedEvents.map((event, index) => (
                  <Box key={`${event.sourceType}-${event.id}`} className="relative">
                    {/* Timeline connector line */}
                    {index < sortedEvents.length - 1 && (
                      <Box 
                        className="timeline-connector"
                        style={{ height: '40px' }}
                      />
                    )}
                    
                    <TimelineEvent
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      canEdit={event.sourceType === 'user'}
                    />
                  </Box>
                ))}
              </Flex>
            ) : (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                gap="3" 
                style={{ minHeight: '300px' }}
              >
                <CalendarIcon width="48" height="48" className="text-gray-400" />
                <Text size="3" color="gray" align="center">
                  {t('noTimelineEvents')}
                </Text>
                <Text size="2" color="gray" align="center">
                  {t('timelineDescription')}
                </Text>
                <Button onClick={() => setIsFormOpen(true)} variant="soft" size="2">
                  <PlusIcon />
                  {t('addFirstEvent')}
                </Button>
              </Flex>
            )}
          </ScrollArea>
        </Box>
      </Card>

      {/* Timeline Event Form */}
      <TimelineEventForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
        editingEvent={editingEvent}
        isLoading={isSubmitting}
      />
    </>
  );
}
