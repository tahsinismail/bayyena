import { useState } from 'react';
import { Card, Flex, Box, Text, Button, Badge, AlertDialog, IconButton } from '@radix-ui/themes';
import { Pencil1Icon, TrashIcon, FileTextIcon, PersonIcon, CalendarIcon } from '@radix-ui/react-icons';
import type { CaseTimelineEvent } from '../types';
import { format } from 'date-fns';

interface TimelineEventProps {
  event: CaseTimelineEvent;
  onEdit?: (event: CaseTimelineEvent) => void;
  onDelete?: (eventId: number | string) => void;
  canEdit?: boolean;
}

export default function TimelineEvent({ event, onEdit, onDelete, canEdit = false }: TimelineEventProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(event.id);
    } catch (error) {
      console.error('Error deleting timeline event:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getSourceIcon = () => {
    return event.sourceType === 'document' ? (
      <FileTextIcon className="w-4 h-4" />
    ) : (
      <PersonIcon className="w-4 h-4" />
    );
  };

  const getSourceColor = () => {
    return event.sourceType === 'document' ? 'blue' : 'green';
  };

  return (
    <Card className="timeline-event">
      <Box p="4">
        <Flex justify="between" align="start" gap="3">
          <Flex direction="column" gap="2" className="flex-1">
            {/* Date and Source Info */}
            <Flex align="center" gap="3" mb="2">
              <Flex align="center" gap="2">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <Text size="2" weight="medium" color="gray">
                  {formatDate(event.eventDate)}
                </Text>
              </Flex>
              <Badge color={getSourceColor()} variant="soft" size="1" className="source-badge">
                <Flex align="center" gap="1">
                  {getSourceIcon()}
                  <Text size="1">
                    {event.sourceType === 'document' ? 'From Document' : 'User Added'}
                  </Text>
                </Flex>
              </Badge>
            </Flex>

            {/* Event Description */}
            <Text size="3" className="event-description">
              {event.eventDescription}
            </Text>

            {/* Source Attribution */}
            <Flex align="center" gap="2" mt="2">
              <Text size="1" color="gray">
                {event.sourceType === 'document' ? 'Extracted from:' : 'Added by:'}
              </Text>
              <Text size="1" weight="medium" color="gray">
                {event.sourceName}
              </Text>
            </Flex>
          </Flex>

          {/* Action Buttons */}
          {canEdit && event.sourceType === 'user' && (
            <Flex gap="2">
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => onEdit && onEdit(event)}
                className="timeline-action-button"
              >
                <Pencil1Icon />
              </IconButton>
              
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="red"
                    disabled={isDeleting}
                    className="timeline-action-button"
                  >
                    <TrashIcon />
                  </IconButton>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Delete Timeline Event</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete this timeline event? This action cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button 
                        variant="solid" 
                        color="red" 
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Event'}
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          )}
        </Flex>
      </Box>
    </Card>
  );
}
