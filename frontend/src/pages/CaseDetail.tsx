// frontend/src/pages/CaseDetail.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Heading, Text, Card, Flex, Box, Spinner, Button, Link, Separator, Progress, AlertDialog, TextArea } from '@radix-ui/themes';
import { UploadIcon, FileTextIcon, TrashIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import type { Case, Document } from '../types';
import { getCaseById, getDocumentsForCase, uploadDocument, deleteCase, deleteDocument } from '../api';
import CaseChat from '../components/CaseChat';

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:id");
  const caseId = params?.id;
  const [, navigate] = useLocation();

  // State for case and document data
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // --- DATA FETCHING ---
  const fetchDocuments = useCallback(async () => {
    if (!caseId) return;
    try {
      const { data } = await getDocumentsForCase(caseId);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError(prev => prev || 'Could not load documents.');
    }
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        setError('');
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

  // --- EVENT HANDLERS ---

  // Document Upload (Drag-and-Drop)
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !caseId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    const formData = new FormData();
    formData.append('document', file);
    try {
      await uploadDocument(caseId, formData, setUploadProgress);
      await fetchDocuments(); // Refresh list after upload
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, [caseId, fetchDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, disabled: isUploading });

  // Document Deletion
  const handleDeleteDocument = async (docId: number) => {
    if (!caseId) return;
    try {
      await deleteDocument(caseId, docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (err) {
      alert("Failed to delete document. Please try again.");
    }
  };

  // Case Deletion
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

  // --- RENDER LOGIC ---
  if (isLoading) return <Flex justify="center" p="8"><Spinner size="3" /></Flex>;
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-screen">
      {/* LEFT COLUMN: CASE DETAILS & CHAT */}
      <div className="lg:col-span-2 flex flex-col gap-8">
        <Card>
          <Box p="4">
            <Flex justify="between" align="start">
              <Heading as="h1" size="7">{caseData?.title}</Heading>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button color="red" variant="soft">Delete Case</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Delete Case</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure? This will permanently delete this case and all its documents.
                  </AlertDialog.Description>
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
              <Text size="2"><strong>Status:</strong> {caseData?.status}</Text>
            </Flex>
            <Heading as="h3" size="4" mb="2">Description</Heading>
            <Text as="p" size="3" className="whitespace-pre-wrap">{caseData?.description || 'No description provided.'}</Text>
          </Box>
        </Card>

        <div>
          {/* <Heading size="5" mb="4">Chat</Heading> */}
          {caseId && <CaseChat caseId={caseId} />}
        </div>
      </div>

      {/* RIGHT COLUMN: DOCUMENTS */}
      <div className="lg:col-span-1">
        <Card>
          <Box p="4">
            <Heading size="5" mb="4">Case Documents</Heading>
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} ${isUploading ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              <Flex direction="column" align="center" gap="2">
                <UploadIcon width="24" height="24" />
                <Text>{isDragActive ? "Drop the file here..." : "Drag 'n' drop or click to upload"}</Text>
              </Flex>
            </div>
            {isUploading && <Progress value={uploadProgress} size="2" my="2" />}
            {uploadError && <Text color="red" size="2" mt="2">{uploadError}</Text>}
            <Separator my="4" size="4" />
            <Flex direction="column" gap="3">
              {documents.length > 0 ? (
                documents.map(doc => (
                  <Flex key={doc.id} align="center" justify="between" className="group hover:bg-gray-100 p-2 rounded">
                    <Link href={`/${doc.storagePath}`} target="_blank" rel="noopener noreferrer" className="flex-grow">
                      <Flex align="center" gap="3">
                        <FileTextIcon />
                        <Box>
                          <Text as="div" size="2" weight="bold" className="truncate" style={{ maxWidth: '180px' }}>{doc.fileName}</Text>
                          <Text as="div" size="1" color="gray">{(doc.fileSize / 1024).toFixed(2)} KB</Text>
                        </Box>
                      </Flex>
                    </Link>
                    <Flex align="center" gap="3">
                      {doc.processingStatus === 'PROCESSED' && <CheckCircledIcon className="text-green-500" aria-label="Processed" />}
                      {doc.processingStatus === 'FAILED' && <CrossCircledIcon className="text-red-500" aria-label="Processing Failed" />}
                      {doc.processingStatus === 'PENDING' && <Spinner size="2" title="Processing..." />}
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <Button size="1" color="red" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></Button>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content style={{ maxWidth: 450 }}>
                          <AlertDialog.Title>Delete Document</AlertDialog.Title>
                          <AlertDialog.Description size="2">Are you sure you want to delete "{doc.fileName}"?</AlertDialog.Description>
                          <Flex gap="3" mt="4" justify="end">
                            <AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel>
                            <AlertDialog.Action><Button variant="solid" color="red" onClick={() => handleDeleteDocument(doc.id)}>Yes, Delete</Button></AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    </Flex>
                  </Flex>
                ))
              ) : (
                <Text size="2" color="gray">No documents uploaded for this case.</Text>
              )}
            </Flex>
          </Box>
        </Card>
      </div>
    </div>
  );
}
