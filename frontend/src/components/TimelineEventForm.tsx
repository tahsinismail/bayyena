import { useState, useEffect } from 'react';
import { Flex, Box, Text, Button, TextField, TextArea, Dialog } from '@radix-ui/themes';
import { CalendarIcon, PlusIcon } from '@radix-ui/react-icons';
import type { CaseTimelineEvent, CreateTimelineEventRequest, UpdateTimelineEventRequest } from '../types';

interface TimelineEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimelineEventRequest | UpdateTimelineEventRequest) => Promise<void>;
  editingEvent?: CaseTimelineEvent | null;
  isLoading?: boolean;
}

export default function TimelineEventForm({
  isOpen,
  onClose,
  onSubmit,
  editingEvent,
  isLoading = false
}: TimelineEventFormProps) {
  const [formData, setFormData] = useState({
    eventDate: '',
    eventDescription: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens/closes or editing event changes
  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        // Format date for input (YYYY-MM-DD)
        const date = new Date(editingEvent.eventDate);
        const formattedDate = date.toISOString().split('T')[0];
        
        setFormData({
          eventDate: formattedDate,
          eventDescription: editingEvent.eventDescription
        });
      } else {
        setFormData({
          eventDate: '',
          eventDescription: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, editingEvent]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.eventDate.trim()) {
      newErrors.eventDate = 'Event date is required';
    }
    
    if (!formData.eventDescription.trim()) {
      newErrors.eventDescription = 'Event description is required';
    } else if (formData.eventDescription.trim().length < 3) {
      newErrors.eventDescription = 'Event description must be at least 3 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        eventDate: formData.eventDate,
        eventDescription: formData.eventDescription.trim()
      });
      
      // Reset form and close dialog
      setFormData({ eventDate: '', eventDescription: '' });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error submitting timeline event:', error);
      setErrors({ submit: 'Failed to save timeline event. Please try again.' });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            {editingEvent ? <CalendarIcon /> : <PlusIcon />}
            {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
          </Flex>
        </Dialog.Title>
        
        <Dialog.Description size="2" mb="4">
          {editingEvent 
            ? 'Update the details of this timeline event.'
            : 'Add a new event to the case timeline.'
          }
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            {/* Date Input */}
            <Box>
              <Text as="label" size="2" weight="medium" mb="2" color="gray">
                Event Date *
              </Text>
              <TextField.Root
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                placeholder="Select event date"
                className={errors.eventDate ? 'error' : ''}
              />
              {errors.eventDate && (
                <Text size="1" color="red" mt="1">
                  {errors.eventDate}
                </Text>
              )}
            </Box>

            {/* Description Input */}
            <Box>
              <Text as="label" size="2" weight="medium" mb="2" color="gray">
                Event Description *
              </Text>
              <TextArea
                value={formData.eventDescription}
                onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                placeholder="Describe what happened on this date..."
                rows={4}
                className={errors.eventDescription ? 'error' : ''}
              />
              {errors.eventDescription && (
                <Text size="1" color="red" mt="1">
                  {errors.eventDescription}
                </Text>
              )}
            </Box>

            {/* Submit Error */}
            {errors.submit && (
              <Text size="2" color="red">
                {errors.submit}
              </Text>
            )}

            {/* Action Buttons */}
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={isLoading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button 
                type="submit" 
                disabled={isLoading}
                color="blue"
              >
                {isLoading 
                  ? (editingEvent ? 'Updating...' : 'Adding...') 
                  : (editingEvent ? 'Update Event' : 'Add Event')
                }
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
