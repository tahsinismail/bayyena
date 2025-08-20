// frontend/src/components/EnhancedCaseChat.tsx

import { useState, useEffect, useRef } from 'react';
import { 
  Flex, 
  TextArea, 
  Button, 
  ScrollArea, 
  Spinner, 
  Text
} from '@radix-ui/themes';
import { 
  PaperPlaneIcon, 
  ReloadIcon, 
  PlusIcon,
  FileIcon
} from '@radix-ui/react-icons';
import type { Message } from '../types';
import { getChatHistory, clearChatHistory, postChatMessage } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import ChatDocumentUpload from './ChatDocumentUpload';

interface EnhancedCaseChatProps {
  caseId: string;
  onTitleGenerationRequest?: (messages: string[]) => void;
}

export default function EnhancedCaseChat({ 
  caseId, 
  onTitleGenerationRequest 
}: EnhancedCaseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy • h:mm a');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  // Copy to clipboard handler
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  // Data Fetching and Management
  useEffect(() => {
    const fetchHistory = async () => {
      if (!caseId) return;
      try {
        const { data } = await getChatHistory(caseId);
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch chat history", err);
      }
    };
    fetchHistory();
  }, [caseId]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Add user message immediately to maintain correct order
    const userMessage: Message = { 
      sender: 'user', 
      text: trimmedInput,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { answer } } = await postChatMessage(caseId, trimmedInput);
      
      // Create bot message and show immediately
      const botMessage: Message = {
        sender: 'bot',
        text: answer,
        createdAt: new Date().toISOString()
      };

      // Show response immediately without typing animation
      setMessages(prev => {
        const newMessages = [...prev, botMessage];
        
        // Trigger title generation if we have enough context (at least 2 user messages)
        if (onTitleGenerationRequest && newMessages.filter(m => m.sender === 'user').length >= 2) {
          const userMessages = newMessages
            .filter(m => m.sender === 'user')
            .slice(-3) // Take last 3 user messages for context
            .map(m => m.text);
          onTitleGenerationRequest(userMessages);
        }
        
        return newMessages;
      });
      setIsLoading(false);

    } catch (err: any) {
      const errorMessage: Message = {
        sender: 'bot',
        text: err.response?.data?.answer || "Sorry, an error occurred.",
        createdAt: new Date().toISOString()
      };
      
      // Show error message immediately
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to clear the chat history?")) return;
    try {
      await clearChatHistory(caseId);
      setMessages([]);
    } catch (err) {
      alert("Failed to clear chat history.");
    }
  };

  // Document upload handling
  const handleDocumentUpload = () => {
    setShowDocumentUpload(true);
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('document', file);

        // Mock progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        // Direct API call instead of uploadDocument function
        const response = await fetch(`/api/cases/${caseId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to upload ${file.name}`);
        }
        
        clearInterval(progressInterval);
        setUploadProgress(100);

        // Add confirmation message
        const confirmationMessage: Message = {
          sender: 'bot',
          text: `✅ Document "${file.name}" has been uploaded successfully and will be processed for analysis. You can now ask questions about this document.`,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, confirmationMessage]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage: Message = {
        sender: 'bot',
        text: "❌ Sorry, the document upload failed. Please try again.",
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setShowDocumentUpload(false);
    }
  };

  // Dropzone for drag and drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    multiple: true,
    disabled: isUploading,
    maxSize: 512 * 1024 * 1024, // 512MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.aac', '.flac', '.ogg']
    }
  });

  return (
    <div className="enhanced-case-chat">
      {/* Header */}
      <div className="chat-main-header">
        <Flex align="center" justify="between" className="w-full">
          <div className="chat-case-info">
            <Text size="3" weight="bold" className="case-title">
              Matter #{caseId}
            </Text>
            <Text size="2" color="gray">
              AI Legal Assistant • {messages.length} messages
            </Text>
          </div>
          
          <Flex align="center" gap="2">
            <Button 
              variant="soft" 
              color="blue" 
              size="2" 
              onClick={handleDocumentUpload}
              className="attach-doc-button"
            >
              <PlusIcon width="16" height="16" />
              Add Document
            </Button>
            <Button 
              variant="soft" 
              color="red" 
              size="2" 
              onClick={handleClearChat}
              className="clear-chat-button"
            >
              <ReloadIcon width="16" height="16" />
              Clear Chat
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Messages Area with Dropzone */}
      <div 
        {...getRootProps()} 
        className={`chat-messages-container ${isDragActive ? 'drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        
        <ScrollArea 
          ref={messagesContainerRef}
          className="chat-messages-scroll"
          type="hover"
          scrollbars="vertical"
        >
          <div className="messages-list">
            {messages.length === 0 && (
              <div className="chat-empty-state">
                <div className="empty-state-content">
                  <div className="empty-icon">⚖️</div>
                  <Text size="4" weight="bold" className="empty-title">
                    Ready to assist with your legal matter
                  </Text>
                  <Text size="2" color="gray" className="empty-subtitle">
                    Ask questions about your case, upload documents for analysis, or request legal guidance
                  </Text>
                  <div className="quick-actions">
                    <Button 
                      variant="soft" 
                      size="2" 
                      onClick={handleDocumentUpload}
                      className="quick-action-btn"
                    >
                      <FileIcon />
                      Upload Document
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              
              return (
                <div 
                  key={`${msg.sender}-${index}-${msg.createdAt}`} 
                  className={`message-item ${isBot ? 'bot-message' : 'user-message'}`}
                >
                  {isBot && (
                    <div className="message-avatar">
                      <Text size="2">⚖️</Text>
                    </div>
                  )}
                  
                  <div className={`message-content ${isBot ? 'bot-content' : 'user-content'}`}>
                    <div className="message-bubble">
                      <div className="message-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Copy button for bot messages */}
                      {isBot && (
                        <button
                          title="Copy response"
                          className="message-copy-button"
                          onClick={() => handleCopy(msg.text, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor" strokeWidth="1.5"/>
                              </svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                                <rect x="4" y="4" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                <rect x="6" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="white"/>
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    <div className="message-metadata">
                      {msg.createdAt && (
                        <Text size="1" color="gray" className="message-time">
                          {formatTimestamp(msg.createdAt)}
                        </Text>
                      )}
                    </div>
                  </div>
                  
                  {!isBot && (
                    <div className="message-avatar">
                      <Text size="2">👤</Text>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Loading animation */}
            {isLoading && (
              <div className="message-item bot-message">
                <div className="message-avatar">
                  <Text size="2">⚖️</Text>
                </div>
                <div className="message-content bot-content">
                  <div className="message-bubble loading-bubble">
                    <Flex align="center" gap="2">
                      <Spinner size="2" />
                      <Text size="2" color="gray">Analyzing your legal query...</Text>
                    </Flex>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="message-item bot-message">
                <div className="message-avatar">
                  <Text size="2">⚖️</Text>
                </div>
                <div className="message-content bot-content">
                  <div className="message-bubble upload-bubble">
                    <Flex direction="column" gap="2">
                      <Flex align="center" gap="2">
                        <Spinner size="2" />
                        <Text size="2" color="blue">Uploading document...</Text>
                      </Flex>
                      <div className="upload-progress">
                        <div 
                          className="upload-progress-bar"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <Text size="1" color="gray">{uploadProgress}% complete</Text>
                    </Flex>
                  </div>
                </div>
              </div>
            )}
            
            {/* Drag & Drop Overlay */}
            {isDragActive && (
              <div className="drag-overlay">
                <div className="drag-content">
                  <FileIcon className="drag-icon" />
                  <Text size="4" weight="bold">Drop documents here</Text>
                  <Text size="2" color="gray">
                    Upload documents to analyze with AI
                  </Text>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="input-container">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask legal questions or inquire about your documents..."
            className="chat-input"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="send-button"
          >
            {isLoading ? (
              <Spinner size="2" />
            ) : (
              <PaperPlaneIcon width="18" height="18" />
            )}
          </button>
        </div>
        <Text size="1" color="gray" className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </Text>
      </div>

      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <ChatDocumentUpload
          isOpen={showDocumentUpload}
          onClose={() => setShowDocumentUpload(false)}
          onUpload={handleFileUpload}
          caseId={caseId}
        />
      )}
    </div>
  );
}
