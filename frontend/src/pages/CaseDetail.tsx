import React, { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { Heading, Text, Card, Flex, Box, Spinner, Button, AlertDialog, Separator, Progress } from '@radix-ui/themes';
import { UploadIcon, FileTextIcon, TrashIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import type { Case, Document } from '../types';
import { getCaseById, getDocumentsForCase, uploadDocument, deleteCase, deleteDocument } from '../api';
import CaseChat from '../components/CaseChat';

export default function CaseDetail() {
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
  const [deleteError, setDeleteError] = useState('');

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
    const hasPendingDocuments = documents.some(doc => doc.processingStatus === 'PENDING');

    // Only set up the polling if there's a pending document.
    if (hasPendingDocuments) {
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
    const formData = new FormData();
    formData.append('document', file);
    try {
      await uploadDocument(caseId, formData, setUploadProgress);
      await fetchDocuments();
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

  if (isLoading) return <Flex justify="center" p="8"><Spinner size="3" /></Flex>;
  if (error) return <Flex justify="center" p="8"><Text color="red">{error}</Text></Flex>;

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-screen">
      <div className="lg:col-span-2 flex flex-col gap-8">
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
              <Text size="2"><strong>Status:</strong> {caseData?.status}</Text>
            </Flex>
            <Heading as="h3" size="4" mb="2">Description</Heading>
            <Text as="p" size="3" className="whitespace-pre-wrap">{caseData?.description || 'No description provided.'}</Text>
          </Box>
        </Card>
        <div>
          <Heading size="5" mb="4">Intelligent Chat</Heading>
          {caseId && <CaseChat caseId={caseId} />}
        </div>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <Box p="4">
            <Heading size="5" mb="4">Case Documents</Heading>
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} ${isUploading ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              <Flex direction="column" align="center" gap="2">
                <UploadIcon width="24" height="24" />
                <Text>{isDragActive ? "Drop file here..." : "Drag 'n' drop or click"}</Text>
              </Flex>
            </div>
            {isUploading && <Progress value={uploadProgress} size="2" my="2" />}
            {uploadError && <Text color="red" size="2" mt="2">{uploadError}</Text>}
            <Separator my="4" size="4" />
            <Flex direction="column" gap="3">
              {documents.length > 0 ? (
                documents.map(doc => (
                  <Flex key={doc.id} align="center" justify="between" className="group hover:bg-gray-100 p-2 rounded">
                    <Link href={`/documents/${doc.id}`}><a className="flex-grow flex items-center gap-3"><FileTextIcon /><Box><Text as="div" size="2" weight="bold">{doc.fileName}</Text><Text as="div" size="1" color="gray">{(doc.fileSize / 1024).toFixed(2)} KB</Text></Box></a></Link>
                    <Flex align="center" gap="3">
                      {doc.processingStatus === 'PROCESSED' && <CheckCircledIcon className="text-green-500" />}
                      {doc.processingStatus === 'FAILED' && <CrossCircledIcon className="text-red-500" />}
                      {doc.processingStatus === 'PENDING' && <Spinner size="2" />}
                      <AlertDialog.Root><AlertDialog.Trigger><Button size="1" color="red" variant="ghost" className="opacity-0 group-hover:opacity-100"><TrashIcon /></Button></AlertDialog.Trigger><AlertDialog.Content style={{ maxWidth: 450 }}><AlertDialog.Title>Delete Document</AlertDialog.Title><AlertDialog.Description>Are you sure you want to delete "{doc.fileName}"?</AlertDialog.Description><Flex gap="3" mt="4" justify="end"><AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel><AlertDialog.Action><Button color="red" onClick={() => handleDeleteDocument(doc.id)}>Yes, Delete</Button></AlertDialog.Action></Flex></AlertDialog.Content></AlertDialog.Root>
                    </Flex>
                  </Flex>
                ))
              ) : (<Text size="2" color="gray">No documents for this case.</Text>)}
            </Flex>
          </Box>
        </Card>
      </div>
    </div>
  );
}
