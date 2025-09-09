"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp, Document as UIDocument } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  MdAttachFile, 
  MdSend, 
  MdClose,
  MdDescription,
  MdCheckCircle,
  MdError,
  MdSchedule
} from "react-icons/md";
import { apiService, Document as APIDocument } from "@/services/api";

interface FileUploadStatus {
  file: File;
  status: 'uploading' | 'processing' | 'processed' | 'failed';
  document?: APIDocument;
  error?: string;
  startTime?: number; // Track when polling started for this document
  retryCount?: number; // Track retry attempts for failed requests
  lastErrorTime?: number; // Track when last error occurred
}

export function ChatInput() {
  const [message, setMessage] = useState("");
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDocumentSuggestions, setShowDocumentSuggestions] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { currentChat, currentWorkspace, sendMessage, addDocumentToWorkspace, updateDocumentInWorkspace } = useApp();
  const { language, t, dir } = useLanguage();

  // Filter documents based on search
  const filteredDocuments = currentWorkspace?.documents.filter(doc =>
    doc.name.toLowerCase().includes(documentSearch.toLowerCase())
  ) || [];

  // Check if all files are processed and message can be sent
  const canSendMessage = fileStatuses.length === 0 || fileStatuses.every(status => 
    status.status === 'processed' || status.status === 'failed'
  );

  const hasProcessingFiles = fileStatuses.some(status => 
    status.status === 'uploading' || status.status === 'processing'
  );

  // Calculate polling interval based on processing time
  const getPollingInterval = (startTime?: number): number => {
    if (!startTime) return 2000; // Default 2 seconds for new documents
    
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = elapsed / 1000;
    
    if (elapsedSeconds < 30) return 2000; // First 30 seconds: poll every 2 seconds
    if (elapsedSeconds < 120) return 5000; // 30-120 seconds: poll every 5 seconds
    return 10000; // After 120 seconds: poll every 10 seconds
  };

  // Poll for document processing status with dynamic intervals
  useEffect(() => {
    if (!currentWorkspace) return;
    
    const activeStatuses = fileStatuses.filter(status => 
      (status.status === 'processing' || status.status === 'uploading') && status.document
    );

    if (activeStatuses.length === 0) return;

    console.log(`Polling status for ${activeStatuses.length} document(s)`);

    let timeoutId: NodeJS.Timeout;
    
    const pollDocuments = async () => {
      // Process all active documents in parallel to reduce total request time
      const pollPromises = activeStatuses.map(async (status) => {
        // Skip polling if too many consecutive errors (more than 5 in the last 30 seconds)
        if (status.retryCount && status.retryCount > 5 && status.lastErrorTime && (Date.now() - status.lastErrorTime) < 30000) {
          console.warn(`Skipping polling for document ${status.document!.id} due to too many errors`);
          return;
        }

        try {
          const caseId = parseInt(currentWorkspace.id);
          // Use getDocumentStatus instead of getCaseDocuments for efficiency
          const updatedDoc = await apiService.getDocumentStatus(caseId, status.document!.id);
          
          console.log(`Document ${updatedDoc.id} status: ${updatedDoc.processingStatus}`);
          
          // Convert APIDocument to UIDocument
          const uiDocument: UIDocument = {
            id: updatedDoc.id.toString(),
            name: updatedDoc.fileName,
            type: updatedDoc.mimeType || 'unknown',
            size: updatedDoc.fileSize || 0,
            uploadedAt: updatedDoc.createdAt,
            content: updatedDoc.extractedText,
            processingStatus: updatedDoc.processingStatus,
            storagePath: updatedDoc.storagePath
          };

          // Always update the workspace context with the latest document data
          updateDocumentInWorkspace(uiDocument);
          
          // Reset retry count on successful request
          if (status.retryCount && status.retryCount > 0) {
            setFileStatuses(prev => prev.map(s => 
              s.document?.id === updatedDoc.id 
                ? { ...s, retryCount: 0, lastErrorTime: undefined }
                : s
            ));
          }
          
          // Update status based on backend processing status
          if (updatedDoc.processingStatus === 'PROCESSING' && status.status !== 'processing') {
            setFileStatuses(prev => prev.map(s => 
              s.document?.id === updatedDoc.id 
                ? { ...s, status: 'processing' as const, document: updatedDoc, startTime: Date.now() }
                : s
            ));
          } else if (updatedDoc.processingStatus === 'PROCESSED') {
            console.log(`Document ${updatedDoc.id} completed processing with name: ${updatedDoc.fileName}`);
            setFileStatuses(prev => prev.map(s => 
              s.document?.id === updatedDoc.id 
                ? { ...s, status: 'processed' as const, document: updatedDoc }
                : s
            ));
          } else if (updatedDoc.processingStatus === 'FAILED') {
            console.log(`Document ${updatedDoc.id} failed processing`);
            setFileStatuses(prev => prev.map(s => 
              s.document?.id === updatedDoc.id 
                ? { ...s, status: 'failed' as const, document: updatedDoc, error: 'Processing failed' }
                : s
            ));
          }
        } catch (error) {
          console.error(`Error polling document ${status.document!.id} status:`, error);
          
          // Increment retry count and set last error time
          setFileStatuses(prev => prev.map(s => 
            s.document?.id === status.document!.id 
              ? { 
                  ...s, 
                  retryCount: (s.retryCount || 0) + 1, 
                  lastErrorTime: Date.now(),
                  error: error instanceof Error ? error.message : 'Polling failed'
                }
              : s
          ));
        }
      });

      // Wait for all polling requests to complete
      await Promise.all(pollPromises);
      
      // Schedule next poll with updated interval
      const currentActiveStatuses = fileStatuses.filter(status => 
        (status.status === 'processing' || status.status === 'uploading') && status.document
      );
      
      if (currentActiveStatuses.length > 0) {
        const shortestInterval = Math.min(...currentActiveStatuses.map(status => getPollingInterval(status.startTime)));
        timeoutId = setTimeout(pollDocuments, shortestInterval);
      }
    };

    // Start the first poll
    const shortestInterval = Math.min(...activeStatuses.map(status => getPollingInterval(status.startTime)));
    timeoutId = setTimeout(pollDocuments, shortestInterval);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fileStatuses, currentWorkspace, updateDocumentInWorkspace]);

  // Auto-remove processed files after delay
  useEffect(() => {
    const processedFiles = fileStatuses.filter(status => status.status === 'processed');
    
    if (processedFiles.length > 0) {
      const timer = setTimeout(() => {
        setFileStatuses(prev => prev.filter(status => status.status !== 'processed'));
      }, 4000); // Remove processed files after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [fileStatuses]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!currentWorkspace) {
      alert('Please select a workspace first');
      return;
    }

    // Filter out files that are already being uploaded or processed
    const newFiles = files.filter(file => 
      !fileStatuses.some(status => 
        status.file.name === file.name && 
        status.file.size === file.size && 
        (status.status === 'uploading' || status.status === 'processing')
      )
    );

    if (newFiles.length === 0) {
      console.log('All files are already being uploaded or processed');
      return;
    }

    // Update file statuses to show uploading state
    const newStatuses: FileUploadStatus[] = newFiles.map(file => ({
      file,
      status: 'uploading' as const
    }));
    
    setFileStatuses(prev => [...prev, ...newStatuses]);

    try {
      const caseId = parseInt(currentWorkspace.id);
      
      // Upload files directly without triggering global loading
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        
        try {
          console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
          
          // Upload the file
          const apiDoc = await apiService.uploadDocument(caseId, file);
          
          console.log(`Upload successful: ${file.name} -> Document ID ${apiDoc.id}, Status: ${apiDoc.processingStatus}`);
          
          // Convert to UI document format
          const newDocument: UIDocument = {
            id: apiDoc.id.toString(),
            name: apiDoc.originalName || apiDoc.fileName,
            type: apiDoc.mimeType || 'application/octet-stream', // Fallback to generic type
            size: apiDoc.fileSize,
            uploadedAt: apiDoc.createdAt,
            content: apiDoc.extractedText,
            processingStatus: apiDoc.processingStatus,
          };
          
          // Add to workspace without global loading
          addDocumentToWorkspace(newDocument);
          
          // Update file status based on API response
          const initialStatus: 'uploading' | 'processing' | 'processed' | 'failed' = 
            apiDoc.processingStatus === 'PROCESSED' ? 'processed' : 
            apiDoc.processingStatus === 'FAILED' ? 'failed' : 'processing';
          
          console.log(`Setting initial status for ${file.name}: ${initialStatus} (API status: ${apiDoc.processingStatus})`);
          
          setFileStatuses(prev => 
            prev.map(status => 
              status.file.name === file.name && status.file.size === file.size
                ? { 
                    ...status, 
                    status: initialStatus, 
                    document: apiDoc,
                    startTime: initialStatus === 'processing' ? Date.now() : undefined,
                    retryCount: 0
                  }
                : status
            )
          );

          // The useEffect polling will handle further status updates
          
        } catch (error) {
          console.error('Error uploading file:', file.name, error);
          
          let errorMessage = 'Upload failed';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          // Update status to failed with specific error
          setFileStatuses(prev => 
            prev.map(status => 
              status.file.name === file.name && status.file.size === file.size
                ? { ...status, status: 'failed', error: errorMessage }
                : status
            )
          );
        }
      }
    } catch (error) {
      console.error('Error during file upload:', error);
    }
  }, [currentWorkspace, addDocumentToWorkspace, fileStatuses]);

  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles = Array.from(files);
    
    // Filter out files that are already attached or being processed
    const uniqueFiles = newFiles.filter(newFile => 
      !fileStatuses.some(status => 
        status.file.name === newFile.name && 
        status.file.size === newFile.size
      )
    );

    if (uniqueFiles.length === 0) {
      console.log('All selected files are already attached or being processed');
      return;
    }

    console.log(`Selecting ${uniqueFiles.length} new file(s):`, uniqueFiles.map(f => f.name));
    
    // Don't add to attachedFiles anymore - we only use fileStatuses
    // setAttachedFiles(prev => [...prev, ...uniqueFiles]);
    
    // Start uploading files immediately
    uploadFiles(uniqueFiles);
  }, [fileStatuses, uploadFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ symbol for document autocomplete
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
      setShowDocumentSuggestions(true);
      setDocumentSearch("");
    } else if (lastAtIndex !== -1 && textBeforeCursor.substring(lastAtIndex + 1).indexOf(' ') === -1) {
      setShowDocumentSuggestions(true);
      setDocumentSearch(textBeforeCursor.substring(lastAtIndex + 1));
    } else {
      setShowDocumentSuggestions(false);
    }
  };

  const insertDocument = (document: UIDocument) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newMessage = 
        textBeforeCursor.substring(0, lastAtIndex) + 
        `@${document.name} ` + 
        textAfterCursor;
      setMessage(newMessage);
    }
    
    setShowDocumentSuggestions(false);
    setDocumentSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block submission if files are still processing
    if (!currentWorkspace || !canSendMessage || (!message.trim() && fileStatuses.length === 0)) return;

    try {
      setIsLoading(true);

      // Send message only (files are uploaded automatically on selection)
      if (message.trim()) {
        await sendMessage(message.trim());
      }
      
      // Reset form
      setMessage("");
      setFileStatuses([]);
      setShowDocumentSuggestions(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentWorkspace) {
    return null; // Hide chat input when no workspace is selected
  }

  if (!currentChat) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a workspace to start chatting
      </div>
    );
  }

  return (
    <div className="border-border bg-background">
      {/* Document suggestions dropdown */}
      {showDocumentSuggestions && filteredDocuments.length > 0 && (
        <div className="border-b border-border bg-card p-2">
          <div className="text-sm text-muted-foreground mb-2">Documents:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filteredDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => insertDocument(doc)}
                className="w-full text-left p-2 hover:bg-accent rounded text-sm flex items-center gap-2"
              >
                <MdDescription className="h-4 w-4" />
                <span className="truncate">{doc.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File upload status */}
      {fileStatuses.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="text-sm text-muted-foreground mb-2">File uploads:</div>
          <div className="space-y-2">
            {fileStatuses.map((status, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-secondary text-secondary-foreground px-3 py-2 rounded text-sm"
              >
                <div className="flex items-center gap-2 flex-1">
                  <MdAttachFile className="h-4 w-4" />
                  <span className="truncate max-w-48">{status.file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {status.status === 'uploading' && (
                    <>
                      <MdSchedule className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Uploading...</span>
                    </>
                  )}
                  {status.status === 'processing' && (
                    <>
                      <MdSchedule className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Processing...</span>
                    </>
                  )}
                  {status.status === 'processed' && (
                    <>
                      <MdCheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">Ready</span>
                    </>
                  )}
                  {status.status === 'failed' && (
                    <>
                      <MdError className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600">{status.error || 'Failed'}</span>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setFileStatuses(prev => prev.filter((_, i) => i !== index));
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MdClose className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hasProcessingFiles && (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <MdSchedule className="h-3 w-3" />
              Please wait for all files to finish processing before sending your message.
            </div>
          )}
        </div>
      )}

      {/* Document suggestions dropdown */}

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="p-4">
        <div
          className={`
            relative border border-input rounded-lg bg-background
            ${isDragging ? 'border-primary bg-primary/5' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextChange}
            placeholder={t('chat.input.placeholder')}
            className="min-h-[60px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 pr-20 mixed-content"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          {/* Input actions */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <MdAttachFile className="h-4 w-4" />
            </Button>
            
            <Button
              type="submit"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={(!message.trim() && fileStatuses.length === 0) || isLoading || !canSendMessage}
              title={hasProcessingFiles ? "Please wait for files to finish processing" : undefined}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <MdSend className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 text-primary font-medium">
            Drop files here to attach
          </div>
        )}
      </form>
    </div>
  );
}
