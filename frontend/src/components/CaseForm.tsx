// frontend/src/components/CaseForm.tsx
import { useState } from 'react';
import { Button, TextField, Flex, Select, Card, Text, TextArea } from '@radix-ui/themes';
import axios from 'axios';
import { type CaseType } from '../types';
import { createCase } from '../api';

interface CaseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Get the case types from our backend schema definition for consistency
const caseTypes: CaseType[] = ['Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other'];

export default function CaseForm({ onSuccess, onCancel }: CaseFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CaseType>('Civil Dispute');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCase({ title, description, type }); // Use the new function
      onSuccess(); // Trigger the success callback
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
        <Card className="p-6 max-w-lg w-full">
        <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
            <Text as="label" size="5" weight="bold">Create New Case</Text>
            <label>
                <Text as="div" size="2" mb="1" weight="bold">Title</Text>
                <TextField.Root
                    placeholder="e.g., Smith v. Johnson Contract Dispute"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </label>
            <label>
                <Text as="div" size="2" mb="1" weight="bold">Description</Text>
                <TextArea
                    placeholder="Brief summary of the case (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                />
            </label>
            <label>
                <Text as="div" size="2" mb="1" weight="bold">Case Type</Text>
                <Select.Root value={type} onValueChange={(v) => setType(v as CaseType)}>
                    <Select.Trigger />
                    <Select.Content>
                        {caseTypes.map((ct) => (
                            <Select.Item key={ct} value={ct}>{ct}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            </label>
            
            {error && <Text color="red" size="2">{error}</Text>}

            <Flex gap="3" mt="4" justify="end">
                <Button variant="soft" color="gray" onClick={onCancel} disabled={isSubmitting} type="button">
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Case'}
                </Button>
            </Flex>
            </Flex>
        </form>
        </Card>
    </div>
  );
}
