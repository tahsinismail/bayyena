import { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { Heading, Text, Card, Flex, Box, Spinner, Button, AlertDialog, Separator, Progress, Tabs, ScrollArea, Select } from '@radix-ui/themes';
import { UploadIcon, FileTextIcon, TrashIcon, CheckCircledIcon, CrossCircledIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import type { Case, Document } from '../types';
import { getCaseById, getDocumentsForCase, uploadDocument, deleteCase, deleteDocument, updateCaseStatus } from '../api';
import CaseChat from '../components/CaseChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

export default function CaseDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/cases/:id");
  const caseId = params?.id;
  const [, navigate] = useLocation();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!caseId) return;
    try {
      const { data } = await getDocumentsForCase(caseId);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [{ data: caseDetails }, { data: documentList }] = await Promise.all([
          getCaseById(caseId),
          getDocumentsForCase(caseId),
        ]);
        setCaseData(caseDetails);
        setDocuments(documentList);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch case data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [caseId]);

  // --- CHANGE: Added Polling Logic for Document Status ---
  // REASON: To automatically update the status icons from "pending" to "processed"
  // without requiring the user to manually refresh the page.
  useEffect(() => {
    // Check if there are any documents currently being processed.
    const hasProcessingDocuments = documents.some(doc => 
      doc.processingStatus === 'PENDING' || doc.processingStatus === 'PROCESSING'
    );

    // Only set up the polling if there's a document being processed.
    if (hasProcessingDocuments) {
      // Set up an interval to re-fetch the document list every 5 seconds.
      const intervalId = setInterval(() => {
        fetchDocuments();
      }, 5000);

      // This is a cleanup function. It runs when the component unmounts or
      // when the 'documents' state changes, preventing memory leaks by stopping the interval.
      return () => clearInterval(intervalId);
    }
  }, [documents, fetchDocuments]);
  // --- END OF CHANGE ---

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !caseId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);
    const formData = new FormData();
    formData.append('document', file);
    try {
      await uploadDocument(caseId, formData, setUploadProgress);
      await fetchDocuments();
      setUploadSuccess(true);
      // Clear success message after 5 seconds
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, [caseId, fetchDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, disabled: isUploading });

  const handleDeleteDocument = async (docId: number) => {
    if (!caseId) return;
    try {
      await deleteDocument(caseId, docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (err) {
      alert("Failed to delete document.");
    }
  };

  const handleDeleteCase = async () => {
    if (!caseId) return;
    setDeleteError('');
    try {
      await deleteCase(caseId);
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete the case.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!caseId || !caseData) return;
    
    setIsUpdatingStatus(true);
    try {
      const { data: updatedCase } = await updateCaseStatus(caseId, newStatus);
      setCaseData(updatedCase);
    } catch (err: any) {
      console.error('Failed to update case status:', err);
      // You could add a toast notification here if you want
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return { bg: '#f0f9ff', text: '#0369a1', border: '#0ea5e9' };
      case 'Pending':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      case 'Closed':
        return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
      case 'Archived':
        return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
      default:
        return { bg: '#f0f9ff', text: '#0369a1', border: '#0ea5e9' };
    }
  };

  const summarizedDocs = documents.filter(
    doc => doc.processingStatus === 'PROCESSED' && doc.summary
  );
  // --- END OF CHANGE ---

  if (isLoading) return <Flex justify="center" p="8"><Spinner size="3" /></Flex>;
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;

  return (
    <div className="p-4 md:p-8 min-w-screen">
      {/* Back Button */}
      <Flex mb="4">
        <Button 
          variant="soft" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeftIcon /> Back to Cases
        </Button>
      </Flex>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="w-full lg:col-span-2 flex flex-col gap-8">
        <Card>
          <Box p="4">
            <Flex justify="between" align="start">
              <Heading as="h1" size="7">{caseData?.title}</Heading>
              <AlertDialog.Root>
                <AlertDialog.Trigger><Button color="red" variant="soft">Delete Case</Button></AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Delete Case</AlertDialog.Title>
                  <AlertDialog.Description size="2">Are you sure you want to delete this case and all its documents?</AlertDialog.Description>
                  {deleteError && <Text color="red" size="2" mt="2">{deleteError}</Text>}
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel>
                    <AlertDialog.Action><Button variant="solid" color="red" onClick={handleDeleteCase}>Yes, Delete</Button></AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
            <Flex gap="6" my="4">
              <Text size="2"><strong>Case Number:</strong> {caseData?.caseNumber}</Text>
              <Text size="2"><strong>Type:</strong> {caseData?.type}</Text>
              <Flex align="center" gap="2">
                <Text size="2"><strong>{t('caseStatus')}:</strong></Text>
                <Select.Root 
                  value={caseData?.status || 'Open'} 
                  onValueChange={handleStatusChange}
                  size="1"
                  disabled={isUpdatingStatus}
                >
                  <Select.Trigger 
                    style={{
                      minWidth: '120px',
                      backgroundColor: getStatusColor(caseData?.status || 'Open').bg,
                      color: getStatusColor(caseData?.status || 'Open').text,
                      border: `1px solid ${getStatusColor(caseData?.status || 'Open').border}`,
                      fontWeight: '500',
                      opacity: isUpdatingStatus ? 0.6 : 1
                    }}
                  >
                    {isUpdatingStatus && <Spinner size="1" />}
                    {(() => {
                      switch (caseData?.status) {
                        case 'Open':
                          return t('statusOpen');
                        case 'Pending':
                          return t('statusPending');
                        case 'Closed':
                          return t('statusClosed');
                        case 'Archived':
                          return t('statusArchived');
                        default:
                          return t('statusOpen');
                      }
                    })()}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="Open">{t('statusOpen')}</Select.Item>
                    <Select.Item value="Pending">{t('statusPending')}</Select.Item>
                    <Select.Item value="Closed">{t('statusClosed')}</Select.Item>
                    <Select.Item value="Archived">{t('statusArchived')}</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
            <Heading as="h3" size="4" mb="2">Description</Heading>
            <Text as="p" size="3" className="whitespace-pre-wrap">{caseData?.description || 'No description provided.'}</Text>
          </Box>
        </Card>
        <div>
          <Tabs.Root defaultValue="summary">
          <Tabs.List color='gold' >
            <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
            <Tabs.Trigger value="chat">Chat</Tabs.Trigger>
          </Tabs.List>
          <Box pt="3">
            <Tabs.Content value="summary">
              <Card>
                <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '60vh' }}>
                  <Box p="4">
                    {summarizedDocs.length > 0 ? (
                      <Flex direction="column" gap="5">
                        {summarizedDocs.map(doc => (
                          <Box key={doc.id}>
                            <Heading as="h3" size="4" mb="2">
                              <Flex align="center" gap="2">
                                <FileTextIcon />
                                {doc.fileName}
                              </Flex>
                            </Heading>
                            <Box pl="4" className="border-l-2 border-gray-200">
                                <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.summary}</ReactMarkdown>
                                </div>
                            </Box>
                          </Box>
                        ))}
                      </Flex>
                    ) : (
                      <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
                        <Text color="gray">No document summaries available. Please upload and process documents.</Text>
                      </Flex>
                    )}
                  </Box>
                </ScrollArea>
              </Card>
            </Tabs.Content>
            <Tabs.Content value="chat">
                {caseId && <CaseChat caseId={caseId} />}  
            </Tabs.Content>
          </Box>
        </Tabs.Root>
        {/* --- END OF CHANGE --- */}
   
        </div>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <Box p="4">
            <Flex justify="start" align="center" mb="4">
              <Heading size="5">Case Documents</Heading>
            </Flex>
            
            {/* Processing Status Summary */}
            {documents.length > 0 && (
              <Flex gap="3" mb="4" p="3" className="bg-gray-50 rounded">
                <Text size="2" color="gray">Processing Status:</Text>
                <Flex gap="2">
                  {documents.filter(d => d.processingStatus === 'PROCESSED').length > 0 && (
                    <Flex align="center" gap="1">
                      <CheckCircledIcon className="text-green-500" width={14} height={14} />
                      <Text size="1" color="green">
                        {documents.filter(d => d.processingStatus === 'PROCESSED').length} Ready
                      </Text>
                    </Flex>
                  )}
                  
                  {documents.filter(d => d.processingStatus === 'PENDING').length > 0 && (
                    <Flex align="center" gap="1">
                      <Spinner size="2" />
                      <Text size="1" color="orange">
                        {documents.filter(d => d.processingStatus === 'PENDING').length} Queued
                      </Text>
                    </Flex>
                  )}
                  
                  {documents.filter(d => d.processingStatus === 'PROCESSING').length > 0 && (
                    <Flex align="center" gap="1">
                      <Spinner size="2" />
                      <Text size="1" color="blue">
                        {documents.filter(d => d.processingStatus === 'PROCESSING').length} Processing
                      </Text>
                    </Flex>
                  )}
                  {documents.filter(d => d.processingStatus === 'FAILED').length > 0 && (
                    <Flex align="center" gap="1">
                      <CrossCircledIcon className="text-red-500" width={14} height={14} />
                      <Text size="1" color="red">
                        {documents.filter(d => d.processingStatus === 'FAILED').length} Failed
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            )}
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-[#856A00] bg-blue-50' : 'border-gray-300'} ${isUploading ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              <Flex direction="column" align="center" gap="2">
                <UploadIcon width="24" height="24" />
                <Text>{isDragActive ? "Drop file here..." : "Drag 'n' drop or click"}</Text>
              </Flex>
            </div>
            {isUploading && (
              <Box mt="3" p="3" className="bg-blue-50 border border-blue-200 rounded">
                <Flex align="center" gap="2" mb="2">
                  <Spinner size="2" />
                  <Text size="2" color="blue">Uploading document...</Text>
                </Flex>
                <Progress value={uploadProgress} size="2" />
                <Text size="1" color="blue" mt="1">{uploadProgress}% complete</Text>
              </Box>
            )}
            {uploadSuccess && (
              <Box mt="3" p="3" className="bg-green-50 border border-green-200 rounded">
                <Flex align="center" gap="2">
                  <CheckCircledIcon className="text-green-500" />
                  <Text size="2" color="green">Document uploaded successfully! Processing has begun.</Text>
                </Flex>
              </Box>
            )}
            {uploadError && (
              <Box mt="3" p="3" className="bg-red-50 border border-red-200 rounded">
                <Text size="2" color="red">Upload failed: {uploadError}</Text>
              </Box>
            )}
            <Separator my="4" size="4" />
            <Flex direction="column" gap="3">
              {documents.length > 0 ? (
                documents.map(doc => (
                  <Flex key={doc.id} align="center" justify="between" gap="2" className="group hover:bg-gray-100 p-2 rounded">
                    <Link href={`/documents/${doc.id}`}>
                      <span className="flex-grow flex items-center gap-3">
                        <FileTextIcon />
                        <Box>
                          <Text as="div" size="2" weight="bold">{doc.fileName}</Text>
                          <Flex justify="between" align="center" gap="1">
                            <Text as="div" size="1" color="gray">{(doc.fileSize / 1024).toFixed(2)} KB</Text>
                          </Flex>
                        </Box>
                      </span>
                    </Link>
                    <Flex align="center" gap="3">
                      {/* Enhanced Status Display */}
                      <Flex align="center" gap="1">
                        {doc.processingStatus === 'PROCESSED' && (
                          <Flex align="center" gap="1">
                            <CheckCircledIcon className="text-green-500" />
                            <Text size="1" color="green">Ready</Text>
                          </Flex>
                        )}
                        {doc.processingStatus === 'FAILED' && (
                          <Flex align="center" gap="1">
                            <CrossCircledIcon className="text-red-500" />
                            <Text size="1" color="red">Failed</Text>
                          </Flex>
                        )}
                        {doc.processingStatus === 'PENDING' && (
                          <Flex align="center" gap="1">
                            <Spinner size="2" />
                            <Text size="1" color="orange">Queued</Text>
                          </Flex>
                        )}
                        
                        {doc.processingStatus === 'PROCESSING' && (
                          <Flex align="center" gap="1">
                            <Spinner size="2" />
                            <Text size="1" color="blue">Processing...</Text>
                          </Flex>
                        )}
                      </Flex>
                      
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <Button size="1" color="red" variant="ghost" className="opacity-0 group-hover:opacity-100">
                            <TrashIcon />
                          </Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content style={{ maxWidth: 450 }}>
                          <AlertDialog.Title>Delete Document</AlertDialog.Title>
                          <AlertDialog.Description>
                            Are you sure you want to delete "{doc.fileName}"?
                          </AlertDialog.Description>
                          <Flex gap="3" mt="4" justify="end">
                            <AlertDialog.Cancel>
                              <Button variant="soft" color="gray">Cancel</Button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action>
                              <Button color="red" onClick={() => handleDeleteDocument(doc.id)}>
                                Yes, Delete
                              </Button>
                            </AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    </Flex>
                  </Flex>
                ))
              ) : (
                <Text size="2" color="gray">No documents for this case.</Text>
              )}
            </Flex>
          </Box>
        </Card>
      </div>
    </div>
    </div>
  );
}
