import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Box, Button, Card, Flex, Heading, Text, Tabs, Spinner, AlertDialog } from '@radix-ui/themes';
import { DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { getDocumentById, deleteDocument } from '../api';
import type { Document as DocumentType, TimelineEvent } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const docId = params?.id;
  const [, navigate] = useLocation();

  const [document, setDocument] = useState<DocumentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTranslation, setActiveTranslation] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    if (!docId) return;
    const fetchDocument = async () => {
      setIsLoading(true);
      try {
        const { data } = await getDocumentById(docId);
        setDocument(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch document details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocument();
  }, [docId]);

  // --- CHANGE: Added Delete Functionality ---
  // REASON: To allow users to delete a document directly from its detail page,
  // improving the user experience and workflow.
  const handleDelete = async () => {
    if (!document) return;
    try {
      await deleteDocument(String(document.caseId), document.id);
      // On success, navigate the user back to the case detail page.
      navigate(`/cases/${document.caseId}`);
    } catch (err) {
      alert("Failed to delete the document. Please try again.");
    }
  };
  // --- END OF CHANGE ---

  if (isLoading) return <Flex justify="center" p="8"><Spinner size="3" /></Flex>;
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;
  if (!document) return <Flex justify="center" p="8"><Text>Document not found.</Text></Flex>;

  const TimelineItem = ({ item }: { item: TimelineEvent }) => (
    <Flex gap="4" py="2" className="border-b last:border-b-0">
      <Text as="div" size="2" weight="bold" className="w-1/4">{item.date}</Text>
      <Text as="div" size="2" className="w-3/4">{item.event}</Text>
    </Flex>
  );

  return (
    <div className="p-4 md:p-8 min-w-screen">
      <Card>
        <Box p="4">
          <Flex justify="between" align="center" mb="4">
            <Heading>{document.fileName}</Heading>
            <Flex gap="3">
              <Button asChild variant="soft">
                <a href={`/${document.storagePath}`} target="_blank" rel="noopener noreferrer" download={document.fileName}>
                  <DownloadIcon /> Download Original
                </a>
              </Button>
              {/* --- CHANGE: Added Delete Button with Confirmation Dialog --- */}
              {/* REASON: Provides the UI for the new delete functionality. */}
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button color="red" variant="soft"><TrashIcon /> Delete</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Delete Document</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete the file "{document.fileName}"? This action is permanent.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel>
                    {/* The onClick handler calls our new handleDelete function */}
                    <AlertDialog.Action><Button variant="solid" color="red" onClick={handleDelete}>Yes, Delete File</Button></AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
              {/* --- END OF CHANGE --- */}
            </Flex>
          </Flex>

          {document.processingStatus !== 'PROCESSED' && (
            <Text color="orange">This document is still being processed. AI features may not be available yet. Please refresh in a moment.</Text>
          )}
          
          <Tabs.Root defaultValue="summary" mt="4">
            <Tabs.List>
              <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
              <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
              <Tabs.Trigger value="translation">Analysis & Translation</Tabs.Trigger>
            </Tabs.List>
            <Box pt="4">
              <Tabs.Content value="summary">
                <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{document.summary || 'No summary available.'}</ReactMarkdown></div>
              </Tabs.Content>
              <Tabs.Content value="timeline">
                {document.timeline && document.timeline.length > 0 ? (
                  document.timeline.map((item, index) => <TimelineItem key={index} item={item} />)
                ) : (
                  <Text>No timeline could be extracted from this document.</Text>
                )}
              </Tabs.Content>
              <Tabs.Content value="translation">
                <Flex gap="3" mb="4">
                  <Button variant={activeTranslation === 'en' ? 'solid' : 'soft'} onClick={() => setActiveTranslation('en')}>English</Button>
                  <Button variant={activeTranslation === 'ar' ? 'solid' : 'soft'} onClick={() => setActiveTranslation('ar')}>العربية</Button>
                </Flex>
                <Box p="4" className="bg-gray-50 rounded">
                
                    {activeTranslation === 'en' ? <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{document.translationEn || 'No English translation available.'}</ReactMarkdown></div> : <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{document.translationAr || 'No Arabic translation available.'}</ReactMarkdown></div>}
                  
                </Box>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </Box>
      </Card>
    </div>
  );
}
