// frontend/src/components/ChatOverlay.tsx

import { useState, useEffect, useRef } from 'react';
import { 
  IconButton, 
  Button, 
  TextArea, 
  ScrollArea,
  Separator
} from '@radix-ui/themes';
import { 
  Cross2Icon, 
//   MagnifyingGlassIcon,
  PaperPlaneIcon,
  ChatBubbleIcon,
  ArrowLeftIcon
} from '@radix-ui/react-icons';
import type { Case, Message, Document } from '../types';
import { getCases, getChatHistory, postChatMessage, uploadDocument, getDocumentsForCase, generateCaseTitle, getCaseById, clearChatHistory } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialCaseId?: string;
}

export default function ChatOverlay({ isOpen, onClose, initialCaseId }: ChatOverlayProps) {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(initialCaseId || null);
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, url?: string}>>([]);
  const [caseDocuments, setCaseDocuments] = useState<Document[]>([]);
  const [showFileContext, setShowFileContext] = useState(false);
  const [contextPosition, setContextPosition] = useState({ top: 0, left: 0 });
  const messageRefs = useRef<{ [key: number]: HTMLElement }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  // Get messages for the active case only (sorted chronologically for proper display)
  const currentCaseMessages = messages
    .filter(m => activeCaseId ? m.caseId === parseInt(activeCaseId) : false)
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  // Get user messages for the sidebar (sorted latest to oldest for navigation)
  const userMessagesForSidebar = currentCaseMessages
    .filter(m => m.sender === 'user')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Get active case for displaying title
  const activeCase = activeCaseId ? cases.find(c => c.id === parseInt(activeCaseId)) : null;

  // Load cases
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data } = await getCases();
        setCases(data);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
      }
    };

    if (isOpen) {
      fetchCases();
    }
  }, [isOpen]);

  // Load messages when case changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeCaseId) {
        setMessages([]);
        setCaseDocuments([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const [messagesResponse, documentsResponse] = await Promise.all([
          getChatHistory(activeCaseId),
          getDocumentsForCase(activeCaseId)
        ]);
        setMessages(messagesResponse.data || []);
        setCaseDocuments(documentsResponse.data || []);
      } catch (error) {
        console.error('Failed to load messages or documents:', error);
        setMessages([]);
        setCaseDocuments([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeCaseId]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (textareaRef.current && inputValue === '') {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFileContext(false);
    };

    if (showFileContext) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showFileContext]);

  // Scroll to specific message
  const scrollToMessage = (messageId: number) => {
    setSelectedMessageId(messageId);
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      // Highlight the message briefly
      messageElement.style.backgroundColor = 'rgba(133, 106, 0, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    // Find the main chat scroll container (right pane with conversation)
    const mainChatScrollContainer = document.querySelector('.gemini-chat-main .gemini-messages [data-radix-scroll-area-viewport]');
    if (mainChatScrollContainer) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        mainChatScrollContainer.scrollTop = mainChatScrollContainer.scrollHeight;
      });
    } else {
      // Fallback: try again after a short delay if element not found
      setTimeout(() => {
        const fallbackContainer = document.querySelector('.gemini-chat-main .gemini-messages [data-radix-scroll-area-viewport]');
        if (fallbackContainer) {
          fallbackContainer.scrollTop = fallbackContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const scrollSidebarToTop = () => {
    // Find the sidebar scroll container (left pane with messages list)
    const sidebarScrollContainer = document.querySelector('.gemini-sidebar .gemini-messages [data-radix-scroll-area-viewport]');
    if (sidebarScrollContainer) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        sidebarScrollContainer.scrollTop = 0;
      });
    } else {
      // Fallback: try again after a short delay if element not found
      setTimeout(() => {
        const fallbackContainer = document.querySelector('.gemini-sidebar .gemini-messages [data-radix-scroll-area-viewport]');
        if (fallbackContainer) {
          fallbackContainer.scrollTop = 0;
        }
      }, 100);
    }
  };

  // Filter cases based on search
  const filteredCases = cases.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    caseItem.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCaseSelect = (caseId: number) => {
    setActiveCaseId(caseId.toString());
    setSelectedMessageId(null);
    setUploadedFiles([]); // Clear uploaded files when switching cases
  };

  // Generate title from chat
  const handleTitleGenerationFromChat = async () => {
    if (!activeCaseId || currentCaseMessages.length === 0) return;

    setIsGeneratingTitle(true);
    try {
      const caseIdString = activeCaseId;
      
      // Get current case data
      const currentCaseResponse = await getCaseById(caseIdString);
      if (!currentCaseResponse.data) {
        throw new Error('Case not found');
      }

      // Generate new title based on chat history
      const titleResponse = await generateCaseTitle(caseIdString);
      const newTitle = titleResponse.data.title;
      
      // Update the case in the local state
      setCases(prevCases => 
        prevCases.map(c => 
          c.id === parseInt(caseIdString)
            ? { ...c, title: newTitle }
            : c
        )
      );

      console.log('Case title updated successfully:', newTitle);
    } catch (error) {
      console.error('Failed to generate title from chat:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    if (!activeCaseId || currentCaseMessages.length === 0) return;
    
    const confirmClear = window.confirm('Are you sure you want to clear all messages in this conversation? This action cannot be undone.');
    if (!confirmClear) return;

    setIsClearingChat(true);
    try {
      await clearChatHistory(activeCaseId);
      
      // Remove messages from local state
      setMessages(prevMessages => 
        prevMessages.filter(m => m.caseId !== parseInt(activeCaseId))
      );

      console.log('Chat history cleared successfully');
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      alert('Failed to clear chat history. Please try again.');
    } finally {
      setIsClearingChat(false);
    }
  };

  // Utility function to detect RTL text (Arabic)
  const isRTLText = (text: string): boolean => {
    // Arabic Unicode range: U+0600-U+06FF, U+0750-U+077F, U+08A0-U+08FF, U+FB50-U+FDFF, U+FE70-U+FEFF
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
    
    // Remove HTML tags, markdown, and special characters for better detection
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_`~#\-+.\d\s]/g, '');
    
    // Check if Arabic characters make up a significant portion of the text (>30%)
    const arabicMatches = cleanText.match(new RegExp(arabicRegex, 'gu'));
    const arabicCount = arabicMatches ? arabicMatches.length : 0;
    const totalLetters = cleanText.replace(/[^\p{L}]/gu, '').length;
    
    return totalLetters > 0 && (arabicCount / totalLetters) > 0.3;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeCaseId || isSending) return;

    const messageText = inputValue.trim();
    
    // Extract file references from message
    const fileReferences = messageText.match(/@([^\s]+)/g);
    let contextualMessage = messageText;
    
    if (fileReferences && fileReferences.length > 0) {
      const referencedFiles = fileReferences.map(ref => ref.substring(1)); // Remove @ symbol
      contextualMessage = `${messageText}\n\n[Context: User is referencing the following uploaded files: ${referencedFiles.join(', ')}. Please refer to the content and context of these files when providing your response.]`;
    }
    
    setInputValue('');
    setIsSending(true);
    setIsThinking(true);

    // Add user message immediately with proper timestamp
    const userMessage: Message = {
      id: Date.now(),
      caseId: parseInt(activeCaseId),
      sender: 'user',
      text: messageText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Wait for state update and DOM rendering, then scroll both panes
    setTimeout(() => {
      scrollSidebarToTop();  // Scroll sidebar to top to show latest message
      scrollToBottom();      // Scroll main chat to bottom for thinking indicator
    }, 200);

    try {
      const response = await postChatMessage(activeCaseId, contextualMessage);
      
      // Add AI response with proper timestamp (slightly after user message)
      const aiMessage: Message = {
        id: Date.now() + 1,
        caseId: parseInt(activeCaseId),
        sender: 'bot',
        text: response.data.answer,
        createdAt: new Date(Date.now() + 1000).toISOString() // 1 second after user message
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Scroll to bottom after AI response appears, with longer delay for content rendering
      setTimeout(() => {
        scrollToBottom();
      }, 300);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsSending(false);
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle @ context for file references - show all case documents
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setInputValue(value);
    adjustTextareaHeight();
    
    // Check for @ symbol to show file context menu
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
      // Show file context menu
      const rect = e.target.getBoundingClientRect();
      setContextPosition({
        top: rect.top - 200,
        left: rect.left + 20
      });
      setShowFileContext(true);
    } else {
      setShowFileContext(false);
    }
  };

  // Insert file reference at cursor position
  const insertFileReference = (fileName: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const textAfterCursor = inputValue.substring(cursorPosition);
    
    // Remove the @ symbol and replace with file reference
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newTextBefore = textBeforeCursor.substring(0, lastAtIndex);
    const newValue = `${newTextBefore}@${fileName} ${textAfterCursor}`;
    
    setInputValue(newValue);
    setShowFileContext(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPosition = newTextBefore.length + fileName.length + 2;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // File upload handlers
  const onDrop = async (acceptedFiles: File[]) => {
    if (!activeCaseId || acceptedFiles.length === 0) return;

    setDragActive(false);
    
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        await uploadDocument(activeCaseId, formData, () => {});
        
        // Track uploaded file for @ context
        setUploadedFiles(prev => [...prev, {
          id: Date.now().toString(),
          name: file.name
        }]);
        
        // Add upload notification message
        const uploadMessage: Message = {
          id: Date.now(),
          caseId: parseInt(activeCaseId),
          sender: 'bot',
          text: `📎 Document uploaded: ${file.name}. You can reference this file using @${file.name} in your messages.`,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, uploadMessage]);

        // Refresh case documents to include newly uploaded files
        try {
          const documentsResponse = await getDocumentsForCase(activeCaseId);
          setCaseDocuments(documentsResponse.data || []);
        } catch (error) {
          console.error('Failed to refresh documents:', error);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'video/*': ['.mp4', '.avi', '.mov'],
      'audio/*': ['.mp3', '.wav']
    },
    maxSize: 512 * 1024 * 1024 // 512MB
  });

  if (!isOpen) return null;

  return (
    <div className="gemini-overlay">
      {/* Full screen backdrop with blur */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Main chat container - Gemini style */}
      <div className="w-full h-full">
        <div className="gemini-chat-container h-full flex flex-col">
          
          {/* Header - Gemini style */}
          <div className="gemini-header flex items-center justify-between px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="gemini-welcome-logo w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold">
                ⚖️
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Legal AI Assistant</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    {activeCase ? `${activeCase.title} (#${activeCaseId})` : activeCaseId ? `Matter #${activeCaseId}` : 'Select a matter to start chatting'}
                  </p>
                  {activeCase && currentCaseMessages.length > 0 && (
                    <IconButton
                      variant="ghost"
                      size="1"
                      onClick={handleTitleGenerationFromChat}
                      disabled={isGeneratingTitle}
                      className="hover:bg-gray-100 transition-colors p-1"
                      title="Generate title from chat"
                    >
                      {isGeneratingTitle ? (
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-xs">✨</span>
                      )}
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeCaseId && currentCaseMessages.length > 0 && (
                <IconButton
                  variant="ghost"
                  size="2"
                  onClick={handleClearChat}
                  disabled={isClearingChat}
                  className="hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Clear conversation"
                >
                  {isClearingChat ? (
                    <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-sm">🗑️</span>
                  )}
                </IconButton>
              )}
              <IconButton
                variant="ghost"
                size="2"
                onClick={onClose}
                className="hover:bg-gray-100 transition-colors"
              >
                <Cross2Icon />
              </IconButton>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
              
              {/* Left Sidebar - Matter Selection */}
              <div 
                className={`gemini-sidebar ${sidebarCollapsed ? 'w-16' : 'w-80'} flex flex-col transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
              >
                
                {!sidebarCollapsed && (
                  <>
                    {/* Search and New Chat */}
                    <div className="p-4 space-y-3">
                      {/* <div className="gemini-sidebar-search relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder={activeCaseId ? "Search messages..." : "Search matters..."}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:outline-none text-sm"
                        />
                      </div> */}
                      
                      <Button
                        variant="solid"
                        size="2"
                        className="gemini-new-chat-btn max-w-max"
                        onClick={() => setActiveCaseId(null)}
                      >
                        <ArrowLeftIcon /> Back to Matter
                      </Button>
                    </div>

                    <Separator className="mx-4" />

                    {/* Dynamic Content: Cases or Messages */}
                    <ScrollArea className="gemini-messages flex-1 px-2">
                      <div className="space-y-1 py-2">
                        {activeCaseId ? (
                          /* Show user messages for active case */
                          userMessagesForSidebar.length > 0 ? (
                            userMessagesForSidebar.map((message) => (
                              <div
                                key={message.id}
                                onClick={() => message.id && scrollToMessage(message.id)}
                                className={`gemini-message-item p-3 cursor-pointer rounded-lg transition-all ${
                                  selectedMessageId === message.id ? 'active' : ''
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="gemini-message-avatar w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
                                    👤
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 line-clamp-2 leading-5">
                                      {message.text.length > 60 ? `${message.text.substring(0, 60)}...` : message.text}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500">
                                        {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-gray-400 text-sm">No messages yet</div>
                            </div>
                          )
                        ) : (
                          /* Show cases when no case is selected */
                          filteredCases.map((caseItem) => (
                            <div
                              key={caseItem.id}
                              onClick={() => handleCaseSelect(caseItem.id)}
                              className="gemini-case-item p-3 cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <div className="gemini-case-avatar w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm">
                                  ⚖️
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm leading-5 text-gray-900">
                                    {caseItem.title}
                                  </h3>
                                  {caseItem.caseNumber && (
                                    <p className="text-xs text-gray-500 mt-1">#{caseItem.caseNumber}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <ChatBubbleIcon className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {messages.filter(m => m.caseId === caseItem.id).length} messages
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {/* Collapse Toggle */}
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="gemini-collapse-btn w-full p-2 text-sm font-medium transition-colors"
                  >
                    {sidebarCollapsed ? '→' : '←'}
                  </button>
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="gemini-chat-main flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                
                {/* Drag overlay */}
                {(isDragActive || dragActive) && (
                  <div className="gemini-drag-overlay absolute inset-0 flex items-center justify-center z-10" {...getRootProps()}>
                    <input {...getInputProps()} />
                    <div className="gemini-drag-content text-center p-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        📎
                      </div>
                      <p className="text-lg font-medium text-blue-900 mb-2">Drop files to upload</p>
                      <p className="text-sm text-blue-700">PDF, DOCX, images, videos, and more</p>
                    </div>
                  </div>
                )}

                {activeCaseId ? (
                  <>
                    {/* Messages Area */}
                    <ScrollArea className="gemini-messages flex-1 px-6 py-4">
                      <div className="max-w-4xl mx-auto space-y-6">
                        {messagesLoading ? (
                          <div className="gemini-empty-state flex justify-center py-8">
                            <div className="gemini-loading-spinner w-6 h-6"></div>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="gemini-empty-state text-center py-12">
                            <div className="gemini-empty-icon w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                              💬
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                            <p className="text-gray-600">Ask me anything about this legal matter.</p>
                          </div>
                        ) : (
                          <>
                            {/* Display messages in chronological order (oldest to newest) for chat */}
                            {currentCaseMessages.map((message) => (
                              <div
                                key={message.id}
                                ref={(el) => {
                                  if (el && message.id) {
                                    messageRefs.current[message.id] = el;
                                  }
                                }}
                                className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''} ${
                                  selectedMessageId === message.id ? 'ring-2 ring-[#856A00]/30 rounded-lg' : ''
                                }`}
                              >
                                {/* Avatar */}
                                <div className={`gemini-message-avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  message.sender === 'user' 
                                    ? 'gemini-user-avatar text-white' 
                                    : 'gemini-bot-avatar text-white'
                                }`}>
                                  {message.sender === 'user' ? '👤' : '🤖'}
                                </div>

                                {/* Message Content */}
                                <div className={`flex-1 max-w-3xl ${message.sender === 'user' ? 'text-right' : ''}`}>
                                  <div className={`gemini-message-bubble inline-block p-4 ${
                                    message.sender === 'user'
                                      ? 'gemini-user-bubble'
                                      : 'gemini-bot-bubble'
                                  }`}>
                                    <div 
                                      className="prose prose-sm"
                                      dir={isRTLText(message.text) ? 'rtl' : 'ltr'}
                                      style={{
                                        textAlign: isRTLText(message.text) ? 'right' : 'left',
                                        direction: isRTLText(message.text) ? 'rtl' : 'ltr'
                                      }}
                                    >
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {message.text}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                  
                                  <div className={`mt-1 text-xs text-gray-500 ${message.sender === 'user' ? 'text-right' : ''}`}>
                                    {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Thinking Message */}
                            {isThinking && (
                              <div className="flex gap-4">
                                {/* AI Avatar */}
                                <div className="gemini-message-avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 gemini-bot-avatar text-white">
                                  🤖
                                </div>
                                
                                {/* Thinking Content */}
                                <div className="flex-1 max-w-3xl">
                                  <div className="gemini-message-bubble gemini-bot-bubble inline-block p-4">
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                      </div>
                                      <span className="text-sm">Bayyena is thinking...</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="gemini-input-area p-4">
                      <div className="max-w-4xl mx-auto relative">
                        
                        {/* File Context Menu */}
                        {showFileContext && (caseDocuments.length > 0 || uploadedFiles.length > 0) && (
                          <div 
                            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 min-w-48 max-h-60 overflow-y-auto"
                            style={{ 
                              bottom: '100%',
                              left: contextPosition.left,
                              marginBottom: '8px'
                            }}
                          >
                            <div className="text-xs text-gray-500 px-2 py-1 border-b border-gray-100">
                              Reference uploaded files:
                            </div>
                            
                            {/* Show all case documents */}
                            {caseDocuments.map((doc) => (
                              <div
                                key={`doc-${doc.id}`}
                                onClick={() => insertFileReference(doc.fileName)}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                              >
                                <span>📎</span>
                                <span className="truncate" title={doc.fileName}>{doc.fileName}</span>
                              </div>
                            ))}
                            
                            {/* Show recently uploaded files that might not be in case documents yet */}
                            {uploadedFiles
                              .filter(file => !caseDocuments.some(doc => doc.fileName === file.name))
                              .map((file) => (
                                <div
                                  key={`upload-${file.id}`}
                                  onClick={() => insertFileReference(file.name)}
                                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                >
                                  <span>📎</span>
                                  <span className="truncate" title={file.name}>{file.name}</span>
                                </div>
                              ))}
                              
                            {(caseDocuments.length === 0 && uploadedFiles.length === 0) && (
                              <div className="text-xs text-gray-400 px-2 py-3 text-center">
                                No files uploaded yet
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="gemini-input-container flex items-end gap-3 p-3">
                          <div className="flex-1">
                            <TextArea
                              ref={textareaRef}
                              value={inputValue}
                              onChange={handleInputChange}
                              onKeyDown={handleKeyPress}
                              onInput={adjustTextareaHeight}
                              placeholder="Ask me anything about this legal matter... (Use @ to reference uploaded files)"
                              disabled={isSending}
                              className="gemini-textarea w-full min-h-[24px] max-h-32"
                              rows={1}
                              dir={isRTLText(inputValue) ? 'rtl' : 'ltr'}
                              style={{
                                textAlign: isRTLText(inputValue) ? 'right' : 'left',
                                direction: isRTLText(inputValue) ? 'rtl' : 'ltr'
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* <button
                              type="button"
                              className="gemini-attach-btn w-10 h-10 flex items-center justify-center"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.mp4,.avi,.mov,.mp3,.wav';
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement).files;
                                  if (files) {
                                    onDrop(Array.from(files));
                                  }
                                };
                                input.click();
                              }}
                            >
                              📎
                            </button> */}
                            
                            <button
                              onClick={handleSendMessage}
                              disabled={!inputValue.trim() || isSending}
                              className="gemini-send-btn w-10 h-10 flex items-center justify-center"
                            >
                              {isSending ? (
                                <div className="gemini-loading-spinner w-4 h-4 border-white" />
                              ) : (
                                <PaperPlaneIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          AI can make mistakes. Consider checking important information.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Welcome State */
                  <div className="gemini-welcome flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="gemini-welcome-logo w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                        ⚖️
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal AI Assistant</h2>
                      <p className="text-gray-600 mb-8">
                        Select a matter from the sidebar to start a conversation, or create a new one.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">📄</div>
                          <div className="font-medium">Document Analysis</div>
                          <div className="text-gray-600">Review and analyze legal documents</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">🔍</div>
                          <div className="font-medium">Legal Research</div>
                          <div className="text-gray-600">Get research assistance and guidance</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">📝</div>
                          <div className="font-medium">Document Drafting</div>
                          <div className="text-gray-600">Draft legal documents and contracts</div>
                        </div>
                        <div className="gemini-feature-card p-4">
                          <div className="text-2xl mb-2">🎯</div>
                          <div className="font-medium">Case Strategy</div>
                          <div className="text-gray-600">Develop case strategies and plans</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
