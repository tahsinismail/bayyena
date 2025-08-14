import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { Heading, Text, Card, Flex, Box, Spinner, Button, AlertDialog, Separator, Progress, Tabs, ScrollArea, Select, TextField, TextArea, IconButton, Badge } from '@radix-ui/themes';
import { UploadIcon, FileTextIcon, TrashIcon, CheckCircledIcon, CrossCircledIcon, ArrowLeftIcon, ImageIcon, VideoIcon, FileIcon, Pencil1Icon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import type { Case, Document, CaseType } from '../types';
import { getCaseById, getDocumentsForCase, uploadDocument, deleteCase, deleteDocument, updateCaseStatus, updateCase, autoGenerateCaseData, getDocumentDisplayName } from '../api';
import CaseChat from '../components/CaseChat';
import CaseTimeline from '../components/CaseTimeline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

export default function CaseDetail() {
  const { i18n } = useTranslation();
  const [, params] = useRoute("/cases/:id");
  const caseId = params?.id || '';
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
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [timelineKey, setTimelineKey] = useState(0); // Key to force timeline refresh
  const prevDocumentsRef = useRef<Document[]>([]); // Track previous documents for comparison
  
  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<CaseType>('Civil Dispute');
  const [editStatus, setEditStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [docDisplayNames, setDocDisplayNames] = useState<Record<number, string>>({});

  // Case types and statuses
  const caseTypes: CaseType[] = ['Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other'];
  const caseStatuses: string[] = ['Open', 'Pending', 'Closed', 'Archived'];

  // Helper function to refresh timeline when documents change
  const refreshTimeline = useCallback(() => {
    setTimelineKey(prev => prev + 1);
  }, []);

  // Inline editing functions
  const startEditingTitle = () => {
    setEditTitle(caseData?.title || '');
    setIsEditingTitle(true);
  };

  const startEditingDescription = () => {
    setEditDescription(caseData?.description || '');
    setIsEditingDescription(true);
  };

  const startEditingType = () => {
    setEditType(caseData?.type || 'Civil Dispute');
    setIsEditingType(true);
  };

  const startEditingStatus = () => {
    setEditStatus(caseData?.status || 'Open');
    setIsEditingStatus(true);
  };

  const cancelEditing = () => {
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setIsEditingType(false);
    setIsEditingStatus(false);
    setEditTitle('');
    setEditDescription('');
    setEditType('Civil Dispute');
    setEditStatus('');
  };

  const saveTitle = async () => {
    if (!caseId || editTitle.trim() === caseData?.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsSaving(true);
      const { data: updatedCase } = await updateCase(caseId, { title: editTitle.trim() });
      setCaseData(updatedCase);
      setIsEditingTitle(false);
    } catch (err: any) {
      console.error('Failed to update title:', err);
      // You could add error handling here
    } finally {
      setIsSaving(false);
    }
  };

  const saveDescription = async () => {
    if (!caseId || editDescription.trim() === caseData?.description) {
      setIsEditingDescription(false);
      return;
    }

    try {
      setIsSaving(true);
      const { data: updatedCase } = await updateCase(caseId, { description: editDescription.trim() });
      setCaseData(updatedCase);
      setIsEditingDescription(false);
    } catch (err: any) {
      console.error('Failed to update description:', err);
      // You could add error handling here
    } finally {
      setIsSaving(false);
    }
  };

  const saveType = async () => {
    if (!caseId || editType === caseData?.type) {
      setIsEditingType(false);
      return;
    }

    try {
      setIsSaving(true);
      const { data: updatedCase } = await updateCase(caseId, { type: editType });
      setCaseData(updatedCase);
      setIsEditingType(false);
    } catch (err: any) {
      console.error('Failed to update case type:', err);
      // You could add error handling here
    } finally {
      setIsSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!caseId || editStatus === caseData?.status) {
      setIsEditingStatus(false);
      return;
    }
    try {
      setIsSaving(true);
      const { data: updatedCase } = await updateCaseStatus(caseId, editStatus);
      setCaseData(updatedCase);
      setIsEditingStatus(false);
    } catch (err: any) {
      console.error('Failed to update case status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!caseId) return;

    try {
      setIsGenerating(true);
      const { data } = await autoGenerateCaseData(caseId);
      setCaseData(data.case);
    } catch (err: any) {
      console.error('Failed to auto-generate case data:', err);
      // You could add error handling here
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to categorize document types
  const getDocumentCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Documents';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'Spreadsheets';
    if (mimeType.startsWith('text/')) return 'Text Files';
    if (mimeType === 'application/rtf') return 'Rich Text';
    if (mimeType === 'application/json' || mimeType.includes('xml') || mimeType.includes('html')) return 'Structured Data';
    return 'Other';
  };

  // Helper function to get icon for document category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Images': return <ImageIcon width={14} height={14} />;
      case 'Videos': return <VideoIcon width={14} height={14} />;
      case 'PDF': return <FileTextIcon width={14} height={14} />;
      case 'Word Documents': return <FileTextIcon width={14} height={14} />;
      case 'Spreadsheets': return <FileIcon width={14} height={14} />;
      case 'Text Files': return <FileIcon width={14} height={14} />;
      case 'Rich Text': return <FileTextIcon width={14} height={14} />;
      case 'Structured Data': return <FileIcon width={14} height={14} />;
      default: return <FileIcon width={14} height={14} />;
    }
  };

  // Filter documents based on selected type
  const filteredDocuments = documentTypeFilter === 'all' 
    ? documents 
    : documents.filter(doc => getDocumentCategory(doc.fileType) === documentTypeFilter);

  // Get unique document categories from uploaded documents
  const documentCategories = ['all', ...new Set(documents.map(doc => getDocumentCategory(doc.fileType)))];

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

  // Separate effect to detect when documents finish processing and refresh timeline
  useEffect(() => {
    const prevDocuments = prevDocumentsRef.current;
    
    // Check if any documents just finished processing
    const justProcessed = prevDocuments.some(prevDoc => {
      const currentDoc = documents.find(doc => doc.id === prevDoc.id);
      return (
        (prevDoc.processingStatus === 'PENDING' || prevDoc.processingStatus === 'PROCESSING') &&
        currentDoc?.processingStatus === 'PROCESSED'
      );
    });
    
    if (justProcessed) {
      refreshTimeline();
      
      // Auto-generate title and description if case is still "Untitled" or has no description
      if (caseData && (caseData.title === 'Untitled' || !caseData.description || caseData.description.trim() === '')) {
        handleAutoGenerate();
      }
    }
    
    // Update the ref for next comparison
    prevDocumentsRef.current = documents;
  }, [documents, refreshTimeline, caseData, handleAutoGenerate]);
  // --- END OF CHANGE ---

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0 || !caseId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);

    try {
      // Upload all files concurrently; BullMQ controls processing concurrency
      const uploads = acceptedFiles.map((file) => {
        const formData = new FormData();
        formData.append('document', file);
        // Reuse a single progress setter (last upload will win visually)
        return uploadDocument(caseId, formData, setUploadProgress);
      });

      await Promise.allSettled(uploads);

      await fetchDocuments();
      refreshTimeline();
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, [caseId, fetchDocuments, refreshTimeline]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true,
    disabled: isUploading,
    maxSize: 100 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/rtf': ['.rtf'],
      'text/html': ['.html', '.htm'],
      'text/xml': ['.xml'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
      'text/yaml': ['.yml', '.yaml'],
      'text/javascript': ['.js'],
      'text/css': ['.css'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/mov': ['.mov'],
      'video/wmv': ['.wmv'],
      'video/flv': ['.flv'],
      'video/webm': ['.webm']
    },
    onDropRejected: (rejected) => {
      const messages: string[] = [];
      rejected.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            messages.push(`${file.name} is too large. Maximum size is 100MB.`);
          } else if (error.code === 'file-invalid-type') {
            messages.push(`${file.name} is not a supported file type.`);
          } else {
            messages.push(`${file.name}: ${error.message}`);
          }
        });
      });
      setUploadError(messages.join(' '));
    }
  });

  const handleDeleteDocument = async (docId: number) => {
    if (!caseId) return;
    try {
      await deleteDocument(caseId, docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      refreshTimeline(); // Refresh timeline when document is deleted
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

  const getStatusProps = (status: string | undefined) => {
    if (!status) return { color: 'gray' as const, variant: 'soft' as const };
    switch (status) {
      case 'Open': return { color: 'blue' as const, variant: 'solid' as const };
      case 'Pending': return { color: 'orange' as const, variant: 'solid' as const };
      case 'Closed': return { color: 'green' as const, variant: 'solid' as const };
      case 'Archived': return { color: 'gray' as const, variant: 'solid' as const };
      default: return { color: 'gray' as const, variant: 'soft' as const };
    }
  };

  const summarizedDocs = documents.filter(
    doc => doc.processingStatus === 'PROCESSED' && doc.summary
  );
  // --- END OF CHANGE ---

  // Fetch localized display names for documents when language changes (non-EN)
  useEffect(() => {
    if (!caseId) return;
    const lang = i18n.language || 'en';
    if (lang === 'en') {
      setDocDisplayNames({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const entries = await Promise.all(documents.map(async (doc) => {
          try {
            const { data } = await getDocumentDisplayName(caseId, doc.id, lang);
            return [doc.id, data.displayName] as const;
          } catch {
            return [doc.id, doc.fileName] as const;
          }
        }));
        if (cancelled) return;
        const map: Record<number, string> = {};
        entries.forEach(([id, name]) => { map[id] = name; });
        setDocDisplayNames(map);
      } catch {
        /* ignore */
      }
    };
    load();
    return () => { cancelled = true; };
  }, [caseId, documents, i18n.language]);

  
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

  return (
    <div className="p-4 md:p-8 min-w-screen">
      {/* Back Button */}
      <Flex mb="4">
        <Button 
          variant="soft" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeftIcon /> Back to All Cases
        </Button>
      </Flex>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="w-full lg:col-span-2 flex flex-col gap-8">
        <Card>
          <Box p={{sm: '2', md: '6'}}>
            <Flex justify="between" align="start" mb="4" className='flex-col gap-4 md:flex-row'>
              <div className="case-title-section" style={{ flex: 1, marginRight: '16px' }}>
                {/* Title Section */}
                <Flex align="center" gap="2" mb="2">
                  {isEditingTitle ? (
                    <Flex align="center" gap="2" style={{ width: '100%' }}>
                      <TextField.Root 
                        style={{ flex: 1 }}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter case title"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <IconButton 
                        size="1" 
                        onClick={saveTitle} 
                        disabled={isSaving}
                        variant="solid"
                        color="green"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton 
                        size="1" 
                        onClick={cancelEditing}
                        variant="soft"
                        color="gray"
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>
                  ) : (
                    <Flex align="center" gap="2" style={{ width: '100%' }}>
                      <Heading as="h1" size="6" className="legal-case-title" style={{ flex: 1 }}>
                        {caseData?.title}
                      </Heading>
                      <IconButton 
                        size="1" 
                        onClick={startEditingTitle}
                        variant="ghost"
                        className="edit-button"
                      >
                        <Pencil1Icon />
                      </IconButton>
                    </Flex>
                  )}
                </Flex>

                {/* Description Section */}
                <Flex align="start" gap="2">
                  {isEditingDescription ? (
                    <Flex direction="column" gap="2" style={{ width: '100%' }}>
                      <TextArea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter case description"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) saveDescription();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <Flex gap="2">
                        <Button 
                          size="1" 
                          onClick={saveDescription} 
                          disabled={isSaving}
                          variant="solid"
                          color="green"
                        >
                          <CheckIcon /> Save
                        </Button>
                        <Button 
                          size="1" 
                          onClick={cancelEditing}
                          variant="soft"
                          color="gray"
                        >
                          <Cross2Icon /> Cancel
                        </Button>
                      </Flex>
                    </Flex>
                  ) : (
                    <Flex align="start" gap="2" style={{ width: '100%' }}>
                      <Text size="3" color="gray" className="case-subtitle" style={{ flex: 1 }}>
                        {caseData?.description || 'No case description provided.'}
                      </Text>
                      <IconButton 
                        size="1" 
                        onClick={startEditingDescription}
                        variant="ghost"
                        className="edit-button"
                      >
                        <Pencil1Icon />
                      </IconButton>
                    </Flex>
                  )}
                </Flex>

                 

                {/* Auto-generation status */}
                {isGenerating && (
                  <Flex mt="3" align="center" gap="2">
                    <Spinner size="1" />
                    <Text size="2" color="blue">Generating title, description, and type from documents...</Text>
                  </Flex>
                )}
              </div>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button color="red" variant="soft" className="danger-action-button">
                    🗑️ Delete Case
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>⚠️ Delete Legal Case</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    This action will permanently delete this legal case and all associated documents. This cannot be undone.
                  </AlertDialog.Description>
                  {deleteError && <Text color="red" size="2" mt="2">{deleteError}</Text>}
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel>
                    <AlertDialog.Action><Button variant="solid" color="red" onClick={handleDeleteCase}>Yes, Delete Case</Button></AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
            <div className="legal-case-metadata">
              <Flex justify="between" my="4" className='flex-col gap-6 md:gap-2 md:flex-row'>
                <div className="metadata-item">
                  <Text size="1" color="gray" weight="medium">CASE NUMBER</Text>
                  <Text size="3" weight="bold" className="metadata-value">{caseData?.caseNumber}</Text>
                </div>
                <div className="metadata-item">
                  <Text size="1" color="gray" weight="medium">CASE TYPE</Text>
                  <Flex align="center" gap="2">
                  {isEditingType ? (
                    <Flex align="center" gap="2" style={{ width: '100%' }}>
                      <Select.Root value={editType} onValueChange={(value) => setEditType(value as CaseType)}>
                        <Select.Trigger style={{ flex: 1, maxWidth: '300px' }} />
                        <Select.Content>
                          {caseTypes.map((type) => (
                            <Select.Item key={type} value={type}>
                              {type}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      <IconButton 
                        size="1" 
                        onClick={saveType} 
                        disabled={isSaving}
                        variant="solid"
                        color="green"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton 
                        size="1" 
                        onClick={cancelEditing}
                        variant="soft"
                        color="gray"
                      >
                        <Cross2Icon />
                      </IconButton>
                    </Flex>
                  ) : (
                    <Flex align="center" gap="2">
                      <Text size="2" color="gray" weight="medium">
                        <Text size="3" weight="bold" className="metadata-value">{caseData?.type}</Text>
                      </Text>
                      <IconButton 
                        size="1" 
                        onClick={startEditingType}
                        variant="ghost"
                        className="edit-button"
                      >
                        <Pencil1Icon />
                      </IconButton>
                    </Flex>
                  )}
                </Flex>
                </div>
                <div className="metadata-item">
                  <Text size="1" color="gray" weight="medium">CASE STATUS</Text>
                  {/* Case Status Section */}
                 <Flex align="center" gap="2">
                   {isEditingStatus ? (
                     <Flex align="center" gap="2" style={{ width: '100%' }}>
                       <Select.Root value={editStatus} onValueChange={(value) => setEditStatus(value)}>
                         <Select.Trigger style={{ flex: 1, maxWidth: '200px' }} />
                         <Select.Content>
                           {caseStatuses.map((status) => (
                             <Select.Item key={status} value={status}>
                               {status}
                             </Select.Item>
                           ))}
                         </Select.Content>
                       </Select.Root>
                       <IconButton 
                         size="1" 
                         onClick={saveStatus} 
                         disabled={isSaving}
                         variant="solid"
                         color="green"
                       >
                         <CheckIcon />
                       </IconButton>
                       <IconButton 
                         size="1" 
                         onClick={cancelEditing}
                         variant="soft"
                         color="gray"
                       >
                         <Cross2Icon />
                       </IconButton>
                     </Flex>
                   ) : (
                     <Flex align="center" gap="2">
                       <Text size="3" weight="bold" className="metadata-value">
                      
                         <Badge {...getStatusProps(caseData?.status)}>
                           {caseData?.status}
                         </Badge>
                       </Text>
                       <IconButton 
                         size="1" 
                         onClick={startEditingStatus}
                         variant="ghost"
                         className="edit-button"
                       >
                         <Pencil1Icon />
                       </IconButton>
                     </Flex>
                   )}
                 </Flex>
                </div>
              </Flex>
            </div>
          </Box>
        </Card>
        <div>
          <Tabs.Root defaultValue="summary">
          <Tabs.List color='gold' >
            <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
            <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
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
                                {docDisplayNames[doc.id] || doc.fileName}
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
            <Tabs.Content value="timeline">
              {caseId && <CaseTimeline key={timelineKey} caseId={caseId} />}
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
            
            {/* Document Type Filter */}
            {documents.length > 0 && (
              <Box className="document-type-filter">
                <Flex align="center" gap="3" mb="2">
                  <Text size="2" weight="medium" color="gray">📁 Filter Documents:</Text>
                  <Select.Root value={documentTypeFilter} onValueChange={setDocumentTypeFilter} size="1">
                    <Select.Trigger className="document-filter-select" style={{ minWidth: '180px' }} />
                    <Select.Content>
                      <Select.Item value="all">
                        <Flex align="center" gap="2" className="document-category-item">
                          <FileTextIcon width={14} height={14} />
                          All Documents ({documents.length})
                        </Flex>
                      </Select.Item>
                      {documentCategories.slice(1).map(category => {
                        const count = documents.filter(doc => getDocumentCategory(doc.fileType) === category).length;
                        return (
                          <Select.Item key={category} value={category}>
                            <Flex align="center" gap="2" className="document-category-item">
                              {getCategoryIcon(category)}
                              {category} ({count})
                            </Flex>
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                </Flex>
                
                {documentTypeFilter !== 'all' && (
                  <Text size="1" className="filter-results-text">
                    ✓ Showing {filteredDocuments.length} of {documents.length} documents
                  </Text>
                )}
              </Box>
            )}
            
            <Separator my="4" size="4" />
            <Flex direction="column" gap="3">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map(doc => (
                  <Flex key={doc.id} align="center" justify="between" gap="2" className="group hover:bg-gray-100 p-2 rounded">
                    <Link href={`/documents/${doc.id}`}>
                      <span className="flex-grow flex items-center gap-3">
                        <FileTextIcon />
                        <Box>
                          <Text as="div" size="2" weight="bold">{docDisplayNames[doc.id] || doc.fileName}</Text>
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
                <Text size="2" color="gray">
                  {documents.length === 0 
                    ? "No documents for this case." 
                    : documentTypeFilter === 'all' 
                      ? "No documents for this case."
                      : `No ${documentTypeFilter.toLowerCase()} found for this case.`
                  }
                </Text>
              )}
            </Flex>
          </Box>
        </Card>
      </div>
    </div>
    </div>
  );
}
