import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Box, Button, Card, Flex, Heading, Text, Tabs, Spinner, AlertDialog, Badge } from '@radix-ui/themes';
import { DownloadIcon, TrashIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import { getDocumentById, deleteDocument, getDocumentDisplayName } from '../api';
import type { Document as DocumentType } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DocumentTimeline from '../components/DocumentTimeline';
import { useTranslation } from 'react-i18next';

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const docId = params?.id;
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();

  const [document, setDocument] = useState<DocumentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTranslation, setActiveTranslation] = useState<'en' | 'ar'>('en');
  const [displayName, setDisplayName] = useState<string>('');

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

  // Localized display name
  useEffect(() => {
    const loadDisplayName = async () => {
      if (!document) return;
      const lang = i18n.language || 'en';
      try {
        const { data } = await getDocumentDisplayName(String(document.caseId), document.id, lang);
        setDisplayName(data.displayName);
      } catch {
        setDisplayName('');
      }
    };
    loadDisplayName();
  }, [document?.id, document?.caseId, i18n.language, document]);

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

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-w-screen">
        <Flex justify="center" align="center" className="min-h-[400px]">
          <Flex direction="column" align="center" gap="4">
            <Spinner size="3" />
            <Text size="3" color="gray">Loading...</Text>
          </Flex>
        </Flex>
      </div>
    );
  }
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;
  if (!document) {
    return (
      <div className="p-4 md:p-8 min-w-screen">
        <Flex justify="center" align="center" className="min-h-[400px]">
          <Flex direction="column" align="center" gap="4">
            <Spinner size="3" />
            <Text size="3" color="gray">Checking document status...</Text>
          </Flex>
        </Flex>
      </div>
    );
  }



  return (
    <div className="p-4 md:p-8 min-w-screen max-w-screen">
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
                <ArrowLeftIcon /> Back to Matter
              </Button>
            </Flex>
          )}

          <Flex justify="between" align="center" mb="4" gap="4" wrap="wrap">
            <Flex direction="column" gap="2">
              <Heading>{displayName || document.fileName}</Heading>
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
                {document.caseId && docId && (
                  <DocumentTimeline 
                    caseId={document.caseId.toString()} 
                    documentId={docId} 
                    documentName={document.fileName}
                  />
                )}
              </Tabs.Content>
              <Tabs.Content value="translation">
                {document.processingStatus === 'PROCESSED' ? (
                  <>
                    <Flex gap="3" mb="4" justify="start">
                      <Button 
                        variant={activeTranslation === 'en' ? 'solid' : 'soft'} 
                        onClick={() => setActiveTranslation('en')}
                        className="professional-translation-button"
                      >
                        English
                      </Button>
                      <Button 
                        variant={activeTranslation === 'ar' ? 'solid' : 'soft'} 
                        onClick={() => setActiveTranslation('ar')}
                        className="professional-translation-button"
                      >
                       العربية
                      </Button>
                    </Flex>
                    
                    <Card className='max-w-screen flex flex-wrap'>
                      <Box p="6" className={`legal-translation-container translation-tab-content ${activeTranslation === 'ar' ? 'rtl-content' : 'ltr-content'}`}>
                        {activeTranslation === 'en' ? (
                          <div className="legal-document-translation" dir="ltr">
                            <div className="markdown-content legal-english-content">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {document.translationEn || 'English content will be available once document processing is complete.'}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div className="legal-document-translation" dir="rtl">
                            <div className="markdown-content legal-arabic-content">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {document.translationAr || 'المحتوى العربي سيكون متاحاً بمجرد اكتمال معالجة الوثيقة.'}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </Box>
                    </Card>
                    
                    {/* Language Information */}
                    <Card className="mt-4 bg-blue-50 border-blue-200">
                      <Flex p="4" align="center" gap="2">
                        <Text size="2" color="blue" weight="medium">
                          ℹ️ Translation Information 
                        </Text>
                        <Text size="2" color="gray">
                          {activeTranslation === 'en' 
                            ? 'English tab shows: ' + (document.translationEn?.includes('ARABIC DOCUMENT TEXT') ? 'English translation of Arabic document' : 'Original English content (formatted)')
                            : 'Arabic tab shows: ' + (document.translationAr?.includes('النص العربي المحرر') ? 'Original Arabic content (formatted)' : 'Arabic translation of English document')
                          }
                        </Text>
                      </Flex>
                    </Card>
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
