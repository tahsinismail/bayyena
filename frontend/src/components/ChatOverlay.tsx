// frontend/src/components/ChatOverlay.tsx

import { useState, useEffect, useRef } from 'react';
import { 
  IconButton, 
  TextArea, 
  ScrollArea,
  Button,
} from '@radix-ui/themes';
import { 
  Cross2Icon, 
//   MagnifyingGlassIcon,
  PaperPlaneIcon,
  ChatBubbleIcon,
  CopyIcon,
  HamburgerMenuIcon
} from '@radix-ui/react-icons';
import type { Case, Message } from '../types';
import { getCases, getChatHistory, postChatMessage, generateCaseTitle, getCaseById, clearChatHistory } from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';

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
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const messageRefs = useRef<{ [key: number]: HTMLElement }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Copy message text to clipboard
  const copyToClipboard = async (text: string, messageId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Scroll to user message after AI response is generated
  const scrollToUserMessage = (userMessageId: number) => {
    setTimeout(() => {
      const messageElement = messageRefs.current[userMessageId];
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        // Brief highlight to show which user message the AI responded to
        messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setTimeout(() => {
          messageElement.style.backgroundColor = '';
        }, 1500);
      }
    }, 100); // Small delay to ensure AI message is rendered
  };

  // Scroll to thinking message when AI starts processing
  const scrollToThinkingMessage = () => {
    setTimeout(() => {
      if (thinkingRef.current) {
        thinkingRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
    }, 50); // Small delay to ensure thinking message is rendered
  };

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

  // Prevent background scrolling when overlay is open
  useEffect(() => {
    if (isOpen) {
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore original values
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle responsive design
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640); // md breakpoint
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Handle mobile keyboard visibility
  useEffect(() => {
    if (!isMobileView || !isOpen) return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const chatContainer = document.querySelector('.gemini-chat-container') as HTMLElement;
        if (chatContainer) {
          // Simply use the visual viewport height directly
          chatContainer.style.height = `${window.visualViewport.height}px`;
        }
      }
    };

    // Listen for visual viewport changes (keyboard appearance)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      // Set initial height
      handleViewportChange();
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [isMobileView, isOpen]);

  // Load messages when case changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeCaseId) {
        setMessages([]);
        return;
      }

      setMessagesLoading(true);
      try {
        const messagesResponse = await getChatHistory(activeCaseId);
        setMessages(messagesResponse.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
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

  // Scroll to specific message (keep this for manual navigation from sidebar)
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

  // Filter cases based on search
  const filteredCases = cases.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    caseItem.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCaseSelect = (caseId: number) => {
    setActiveCaseId(caseId.toString());
    setSelectedMessageId(null);
    // Close mobile sidebar when case is selected
    if (isMobileView) {
      setShowMobileSidebar(false);
    }
  };

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
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
    
    setInputValue('');
    setIsSending(true);
    setIsThinking(true);

    // Create user message with current timestamp
    const now = new Date();
    const userMessageId = Date.now();
    const userMessage: Message = {
      id: userMessageId,
      caseId: parseInt(activeCaseId),
      sender: 'user',
      text: messageText,
      createdAt: now.toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Scroll to thinking message when AI starts processing
    scrollToThinkingMessage();

    try {
      const response = await postChatMessage(activeCaseId, messageText);
      
      // Small delay to ensure user message is rendered before adding AI message
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Add AI response with timestamp that ensures it comes after user message
      const aiMessage: Message = {
        id: userMessageId + 1, // Ensure AI message ID is after user message ID
        caseId: parseInt(activeCaseId),
        sender: 'bot',
        text: response.data.answer,
        createdAt: new Date(now.getTime() + 1000).toISOString() // 1 second after user message
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Scroll to the user message after AI response is generated
      scrollToUserMessage(userMessageId);
      
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
    
    setInputValue(value);
    adjustTextareaHeight();
  };

  // Handle input focus for mobile keyboard
  const handleInputFocus = () => {
    if (isMobileView && textareaRef.current) {
      // Wait for keyboard to appear, then scroll input into view
      setTimeout(() => {
        const inputContainer = textareaRef.current?.closest('.gemini-input-area');
        if (inputContainer) {
          inputContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      }, 400); // Increased delay to ensure keyboard is fully shown
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-overlay fixed inset-0 z-50 overflow-hidden">
      {/* Full screen backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Main chat container - Gemini style */}
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        <div className="gemini-chat-container h-full flex flex-col bg-white overflow-hidden"
             style={{ 
               height: '100vh',
               minHeight: '100vh'
             }}>
          
          {/* Header - Gemini style */}
          <div className="gemini-header flex flex-wrap gap-2 items-center justify-between px-3 md:px-6 py-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              {isMobileView && activeCaseId && (
                <IconButton
                  variant="ghost"
                  size="2"
                  onClick={toggleMobileSidebar}
                  className="hover:bg-gray-100 transition-colors md:hidden"
                >
                  <HamburgerMenuIcon/>
                </IconButton>
              )}
              
              <div className="gemini-welcome-logo w-8 h-8 rounded-full flex items-center justify-center font-semibold shadow-sm">
                ⚖️
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Legal AI Assistant</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600 text-wrap">
                    {activeCase ? `${activeCase.title} (#${activeCaseId})` : activeCaseId ? `Matter #${activeCaseId}` : 'Select a matter to start chatting'}
                  </p>
                  {activeCase && currentCaseMessages.length > 0 && (
                    <IconButton
                      variant="ghost"
                      size="1"
                      onClick={handleTitleGenerationFromChat}
                      disabled={isGeneratingTitle}
                      className="hover:bg-gray-100 transition-colors p-1 hidden sm:flex"
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
            
            <div className="w-full md:w-0 flex items-center gap-4 justify-end">
              

            {activeCaseId && currentCaseMessages.length > 0 && (
              <Button
                variant="soft"
                color='gray'
                size="2"
                onClick={handleClearChat}
                disabled={isClearingChat}
                className="bg-red-50 text-red-600 transition-colors"
              >
                {isClearingChat ? (
                  <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>🗑️ Clear Chat</>
                )}
              </Button>
            )}

              <Button
                variant="ghost"
                size="2"
                onClick={onClose}
                className="hover:bg-gray-100 transition-colors"
                >
                <Cross2Icon /> Close
              </Button>
            </div>
            
          </div>

          <div className="flex flex-1 overflow-hidden relative">
              
              {/* Mobile Sidebar Overlay */}
              {isMobileView && showMobileSidebar && (
                <div 
                  className="absolute inset-0 bg-white z-40 md:hidden"
                  onClick={() => setShowMobileSidebar(false)}
                />
              )}
              
              {/* Left Sidebar - Matter Selection */}
              <div 
                className={`gemini-sidebar ${
                  isMobileView 
                    ? `fixed left-0 top-0 bottom-0 z-50 transform transition-transform duration-300 ${
                        showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
                      } w-80 md:relative md:transform-none md:translate-x-0`
                    : sidebarCollapsed ? 'w-16' : 'w-80'
                } flex flex-col transition-all duration-300 bg-white`}
                onClick={(e) => e.stopPropagation()}
              >
                
                {(!sidebarCollapsed || isMobileView) && (
                  <>
                    {/* Search and New Chat */}
                    <div className="p-4 space-y-3">
                      {/* Close button for mobile */}
                      {isMobileView && (
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {activeCaseId ? 'Messages' : 'Legal Matters'}
                          </h3>
                          <IconButton
                            variant="ghost"
                            size="2"
                            onClick={() => setShowMobileSidebar(false)}
                            className="hover:bg-gray-100 transition-colors"
                          >
                            <Cross2Icon />
                          </IconButton>
                        </div>
                      )}
                      
                      
                    </div>

                    

                    {/* Dynamic Content: Cases or Messages */}
                    <ScrollArea className="gemini-messages flex-1 px-2">
                      <div className="space-y-4 py-2">

                        {activeCaseId ? (
                          /* Show user messages for active case */
                          userMessagesForSidebar.length > 0 ? (
                            userMessagesForSidebar.map((message) => (
                              <div
                                key={message.id}
                                onClick={() => { message.id && scrollToMessage(message.id); isMobileView && setShowMobileSidebar(!isMobileView) }}
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

                {/* Collapse Toggle - Hidden on mobile */}
                {!isMobileView && (
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="gemini-collapse-btn w-full p-2 text-sm font-medium transition-colors"
                    >
                      {sidebarCollapsed ? '→' : '←'}
                    </button>
                  </div>
                )}
              </div>

              {/* Main Chat Area */}
              <div className="gemini-chat-main flex-1 flex flex-col min-w-0" onClick={(e) => e.stopPropagation()}>

                
                  <>
                    {/* Messages Area */}
                    <div 
                      className="gemini-messages flex-1 overflow-y-auto"
                      style={{ 
                        scrollBehavior: 'smooth',
                        paddingBottom: '20px'
                      }}
                    >
                      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 p-2">
                        {messagesLoading ? (
                          <div className="gemini-empty-state flex justify-center py-8">
                            <div className="gemini-loading-spinner w-6 h-6"></div>
                          </div>
                        ) : messages.length === 0 ? (
                            <div className="gemini-welcome flex-1 flex items-center justify-center">
                                <div className="text-center max-w-md">
                                  <div className="gemini-welcome-logo w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-sm">
                                    ⚖️
                                  </div>
                                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal AI Assistant</h2>
                                  <p className="text-gray-600 mb-8">
                                    How can I assist you today?
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
                                className={`group flex gap-2 md:gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : ''} ${
                                  selectedMessageId === message.id ? 'ring-2 ring-[#856A00]/30 rounded-lg p-1' : ''
                                }`}
                              >
                                {/* Avatar */}
                                <div className={`gemini-message-avatar w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs md:text-sm ${
                                  message.sender === 'user' 
                                    ? 'gemini-user-avatar text-white' 
                                    : 'gemini-bot-avatar text-white'
                                }`}>
                                  {message.sender === 'user' ? '👤' : '⚖️'}
                                </div>

                                {/* Message Content */}
                                <div className={`flex-1 max-w-3xl ${message.sender === 'user' ? 'text-right' : ''}`}>
                                  <div className={`gemini-message-bubble inline-block p-3 md:p-4 ${
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
                                  
                                  <div className={`flex items-center justify-between mt-1 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`text-xs text-gray-500 ${message.sender === 'user' ? 'text-right' : ''}`}>
                                      {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                                    </div>
                                    
                                    {/* Copy button for AI messages */}
                                    {message.sender === 'bot' && message.id && (
                                      <IconButton
                                        variant="ghost"
                                        size="1"
                                        onClick={() => copyToClipboard(message.text, message.id!)}
                                        className="opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all ml-2"
                                        title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                                      >
                                        {copiedMessageId === message.id ? (
                                          <span className="text-[#856A00] text-xs">✓</span>
                                        ) : (
                                          <CopyIcon className="w-3 h-3" />
                                        )}
                                      </IconButton>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Thinking Message */}
                            {isThinking && (
                              <div 
                                ref={thinkingRef}
                                className="flex gap-4"
                              >
                                {/* AI Avatar */}
                                <div className="gemini-message-avatar w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 gemini-bot-avatar text-white text-xs md:text-sm">
                                  🤖
                                </div>
                                
                                {/* Thinking Content */}
                                <div className="flex-1 max-w-3xl">
                                  <div className="gemini-message-bubble gemini-bot-bubble inline-block p-3 md:p-4">
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                      </div>
                                      <span className="text-xs md:text-sm">Bayyena is thinking...</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Input Area */}
                    <div 
                      className="gemini-input-area p-2 flex-shrink-0 bg-white border-t border-gray-100"
                      style={{
                        position: 'sticky',
                        bottom: '0px',
                        zIndex: 10,
                        marginBottom: isMobileView ? 'env(safe-area-inset-bottom, 0px)' : '0px',
                        backgroundColor: 'white'
                      }}
                    >
                      <div className="max-w-4xl mx-auto relative">
                        
                        <div className="gemini-input-container flex items-end gap-2 md:gap-3 p-2">
                          <div className="flex-1">
                            <TextArea
                              variant='surface'
                              ref={textareaRef}
                              value={inputValue}
                              onChange={handleInputChange}
                              onKeyDown={handleKeyPress}
                              onInput={adjustTextareaHeight}
                              onFocus={handleInputFocus}
                              placeholder="Ask me anything about this legal matter..."
                              disabled={isSending}
                              rows={1}
                              dir={isRTLText(inputValue) ? 'rtl' : 'ltr'}
                              style={{
                                textAlign: isRTLText(inputValue) ? 'right' : 'left',
                                direction: isRTLText(inputValue) ? 'rtl' : 'ltr',
                                border: 'none',
                                outline: 'none',
                                boxShadow: 'none'
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
                
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
