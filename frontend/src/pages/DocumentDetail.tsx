import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Box, Button, Card, Flex, Heading, Text, Tabs, Spinner, AlertDialog, Badge } from '@radix-ui/themes';
import { DownloadIcon, TrashIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
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

  // Polling for document status updates
  useEffect(() => {
    if (!docId) return;
    
    const fetchDocument = async () => {
      try {
        const { data } = await getDocumentById(docId);
        setDocument(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch document details.');
      }
    };

    // Initial fetch
    fetchDocument();
    setIsLoading(false);

    // Set up polling if document is still processing
    const intervalId = setInterval(() => {
      if (document?.processingStatus === 'PENDING' || document?.processingStatus === 'PROCESSING') {
        fetchDocument();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [docId, document?.processingStatus]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <Badge color="green">✓ Processed</Badge>;
      case 'PROCESSING':
        return <Badge color="blue">⚙️ Processing...</Badge>;
      case 'PENDING':
        return <Badge color="orange">⏳ Queued</Badge>;
      case 'FAILED':
        return <Badge color="red">✗ Failed</Badge>;
      default:
        return <Badge color="gray">Unknown</Badge>;
    }
  };

  if (isLoading) return <Flex justify="center" p="8"><Spinner size="3" /></Flex>;
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;
  if (!document) return <Flex justify="center" p="8"><Text>Document not found.</Text></Flex>;

  // Modern Timeline UI
  const TimelineItem = ({ item }: { item: TimelineEvent }) => (
    <Flex align="start" gap="3" mb="4" style={{ position: "relative" }}>
      {/* Timeline Dot */}
      <Box
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "32px",
        }}
      >
        {/* Vertical Line (before dot) */}
        <Box
          style={{
            width: "4px",
            height: "16px",
            background: "linear-gradient(to bottom, #e0e0e0, #ffe066)",
            borderRadius: "2px",
            marginBottom: "2px",
            marginTop: "-2px",
            opacity: 1,
          }}
        />
        {/* Dot */}
        <Box
          style={{
            width: "16px",
            height: "16px",
            background: "#ffe066",
            border: "3px solid #856A00",
            borderRadius: "50%",
            boxShadow: "0 0 0 2px #fff",
            zIndex: 1,
          }}
        />
        {/* Vertical Line (after dot) */}
        <Box
          style={{
            width: "4px",
            height: "100%",
            background: "linear-gradient(to bottom, #ffe066, #e0e0e0)",
            borderRadius: "2px",
            marginTop: "2px",
            opacity: 1,
            flex: 1,
          }}
        />
      </Box>
      {/* Timeline Content */}
      <Box>
        <Text size="2" color="gray" mb="1" as="div" style={{ fontWeight: 500 }}>
          {item.date}
        </Text>
        <Box
          p="3"
          style={{
            background: "#fffbe6",
            borderRadius: "8px",
            boxShadow: "0 1px 4px rgba(133, 106, 0, 0.07)",
            border: "1px solid #ffe066",
            minWidth: "220px",
            maxWidth: "420px",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {item.event}
          </ReactMarkdown>
        </Box>
      </Box>
    </Flex>
  );

  return (
    <div className="p-4 md:p-8 min-w-screen">
      <Card>
        <Box p="4">
          {/* Back Button */}
          {document && (
            <Flex mb="4">
              <Button 
                variant="soft" 
                onClick={() => navigate(`/cases/${document.caseId}`)}
                className="mb-4"
              >
                <ArrowLeftIcon /> Back to Case
              </Button>
            </Flex>
          )}

          <Flex justify="between" align="center" mb="4">
            <Flex direction="column" gap="2">
              <Heading>{document.fileName}</Heading>
              <Flex align="center" gap="3">
                {getStatusBadge(document.processingStatus)}
                {document.processingStatus === 'PENDING' && <Spinner size="2" />}
              </Flex>
            </Flex>
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

          {document.processingStatus === 'PENDING' && (
            <Card className="bg-orange-50 border-orange-200 mb-4">
              <Box p="3">
                <Flex align="center" gap="2">
                  <Spinner size="2" />
                  <Text size="2" color="orange">
                    This document is queued for processing. It will begin processing shortly.
                  </Text>
                </Flex>
              </Box>
            </Card>
          )}

          {document.processingStatus === 'PROCESSING' && (
            <Card className="bg-blue-50 border-blue-200 mb-4">
              <Box p="3">
                <Flex align="center" gap="2">
                  <Spinner size="2" />
                  <Text size="2" color="blue">
                    This document is currently being processed. AI features will be available once processing is complete.
                  </Text>
                </Flex>
              </Box>
            </Card>
          )}

          {document.processingStatus === 'FAILED' && (
            <Card className="bg-red-50 border-red-200 mb-4">
              <Box p="3">
                <Text size="2" color="red">
                  Document processing failed. Please try uploading the document again or contact support.
                </Text>
              </Box>
            </Card>
          )}
          
          <Tabs.Root defaultValue="summary" mt="4">
            <Tabs.List>
              <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
              <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
              <Tabs.Trigger value="translation">Analysis & Translation</Tabs.Trigger>
            </Tabs.List>
            <Box pt="4">
              <Tabs.Content value="summary">
                {document.processingStatus === 'PROCESSED' ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {document.summary || 'No summary available.'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Text color="gray">Summary will be available once processing is complete.</Text>
                )}
              </Tabs.Content>
              <Tabs.Content value="timeline">
               <div className="markdown-content">
                  {document.processingStatus === 'PROCESSED' ? (
                    document.timeline && document.timeline.length > 0 ? (
                      document.timeline.map((item, index) => <TimelineItem key={index} item={item} />)
                    ) : (
                      <Text>No timeline could be extracted from this document.</Text>
                    )
                  ) : (
                    <Text color="gray">Timeline will be available once processing is complete.</Text>
                  )}
                </div>
              </Tabs.Content>
              <Tabs.Content value="translation">
                {document.processingStatus === 'PROCESSED' ? (
                  <>
                    <Flex gap="3" mb="4">
                      <Button variant={activeTranslation === 'en' ? 'solid' : 'soft'} onClick={() => setActiveTranslation('en')}>English</Button>
                      <Button variant={activeTranslation === 'ar' ? 'solid' : 'soft'} onClick={() => setActiveTranslation('ar')}>العربية</Button>
                    </Flex>
                    <Box p="4" className="bg-gray-50 rounded">
                      {activeTranslation === 'en' ? (
                        <div className="markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {document.translationEn || 'No English translation available.'}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {document.translationAr || 'No Arabic translation available.'}
                          </ReactMarkdown>
                        </div>
                      )}
                    </Box>
                  </>
                ) : (
                  <Text color="gray">Translation will be available once processing is complete.</Text>
                )}
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </Box>
      </Card>
    </div>
  );
}
