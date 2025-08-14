// frontend/src/components/CaseForm.tsx
import { useState } from 'react';
import { Button, TextField, Flex, Select, Card, Text, TextArea, Badge } from '@radix-ui/themes';
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

            {/* Supported File Types Info */}
            <div className="mt-4">
                <Text as="div" size="2" mb="2" weight="bold">Supported Document Types:</Text>
                <div className="space-y-2">
                    <div>
                        <Text size="1" weight="bold" color="blue">📄 Documents:</Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="soft" size="1">PDF</Badge>
                            <Badge variant="soft" size="1">Word (.docx)</Badge>
                            <Badge variant="soft" size="1">Text (.txt)</Badge>
                        </div>
                    </div>
                    <div>
                        <Text size="1" weight="bold" color="green">🖼️ Images:</Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="soft" size="1">JPEG</Badge>
                            <Badge variant="soft" size="1">PNG</Badge>
                            <Badge variant="soft" size="1">BMP</Badge>
                            <Badge variant="soft" size="1">TIFF</Badge>
                            <Badge variant="soft" size="1">WebP</Badge>
                        </div>
                    </div>
                    <div>
                        <Text size="1" weight="bold" color="purple">🎥 Videos:</Text>
                        <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="soft" size="1">MP4</Badge>
                            <Badge variant="soft" size="1">AVI</Badge>
                            <Badge variant="soft" size="1">MOV</Badge>
                            <Badge variant="soft" size="1">WebM</Badge>
                        </div>
                    </div>
                    <Text size="1" color="gray">💡 All files will be processed with AI for text extraction, summary, and translation.</Text>
                </div>
            </div>
            
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
