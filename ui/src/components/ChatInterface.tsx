"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MdClose, MdTopic, MdHistory, MdAttachFile, MdCloudUpload } from "react-icons/md";
import type { CurrentView } from "@/components/MainLayout";

interface ChatInputRef {
  uploadFiles: (files: File[]) => void;
}

interface ChatInterfaceProps {
  onViewChange: (view: CurrentView) => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
  const { t, language, getTypographyClass } = useLanguage();
  const { 
    currentChat,
    currentWorkspace,
  } = useApp();
  
  const [showSelectionClearDialog, setShowSelectionClearDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const chatInterfaceRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file upload callback for ChatInput
  const handleFileUpload = useCallback((files: File[]) => {
    console.log('Files uploaded to ChatInterface:', files);
    
    // We need to call ChatInput's uploadFiles function
    // For now, we'll create a ref to access ChatInput's methods
    // This is a temporary approach - ideally we'd lift the file upload state up
    
    // Filter out files that might be duplicates
    const filteredFiles = files.filter(file => {
      // Basic file validation
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.warn(`File ${file.name} is too large (${file.size} bytes)`);
        return false;
      }
      
      // Check file type (basic validation)
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.warn(`File ${file.name} has unsupported type: ${file.type}`);
        return false;
      }
      
      return true;
    });
    
    if (filteredFiles.length === 0) {
      console.log('No valid files to upload');
      return;
    }
    
    // Since we're now handling this at the ChatInterface level,
    // we need to trigger the upload directly
    // For now, we'll pass this back to a ChatInput method
    // This requires us to expose the ChatInput's upload functionality
    console.log(`Processing ${filteredFiles.length} valid files for upload`);
    
    // Call ChatInput's uploadFiles method via ref
    chatInputRef.current?.uploadFiles(filteredFiles);
  }, []);

  // Add ref for ChatInput to access its methods
  const chatInputRef = useRef<ChatInputRef>(null);

  // Drag and drop handlers for the entire chat interface
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('ChatInterface: Drag enter detected');
    setDragCounter(prev => prev + 1);
    
    // Check if drag contains files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
      console.log('ChatInterface: Files detected in drag');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newCounter = dragCounter - 1;
    setDragCounter(newCounter);
    
    console.log('ChatInterface: Drag leave, counter:', newCounter);
    
    if (newCounter <= 0) {
      setIsDragActive(false);
      setDragCounter(0);
      console.log('ChatInterface: Drag deactivated');
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('ChatInterface: Drop detected');
    setIsDragActive(false);
    setDragCounter(0);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('ChatInterface: Files dropped:', files.length);
    
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Global drag events to prevent browser default behavior
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      if (chatInterfaceRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      if (chatInterfaceRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // Safety timeout to reset drag state
  useEffect(() => {
    if (isDragActive) {
      console.log('ChatInterface: Setting 3-second safety timeout');
      dragTimeoutRef.current = setTimeout(() => {
        console.log('ChatInterface: Safety timeout triggered - resetting drag state');
        setIsDragActive(false);
        setDragCounter(0);
      }, 3000);
    } else {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    }

    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, [isDragActive]);

  // Helper function for UI text (translations)
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };
  
  // Helper function for user content (chat titles, etc.)
  const getUserContentClasses = (content: string) => {
    const arabicRegex = /[\u0600-\u06FF]/;
    const isArabicContent = arabicRegex.test(content);
    return isArabicContent ? 'text-arabic' : 'text-english';
  };

  const handleBackToWorkspace = () => {
    if (currentWorkspace) {
      onViewChange({ type: 'workspace', workspaceId: currentWorkspace.id.toString() });
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
  };

  const handleHistoryMessageClick = (messageId: string) => {
    setShowHistory(false);
    // Scroll to the message in the chat
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      messageElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
      }, 2000);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(language === 'ar' ? 'en-US' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get user messages only for history
  const userMessages = currentChat?.messages.filter(msg => msg.role === 'user') || [];

  // Only show back button if this is a chat topic (has topicId)
  const isTopicChat = currentChat?.topicId;

  return (
    <div 
      ref={chatInterfaceRef}
      className="h-full flex flex-col bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border-2 border-dashed border-primary rounded-xl p-8 mx-4 max-w-md w-full text-center shadow-lg">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MdCloudUpload className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-lg font-semibold text-foreground ${getTypographyClass('title-card')}`}>
                  {t('chat.input.dragDrop.title')}
                </h3>
                <p className={`text-sm text-muted-foreground ${getTypographyClass('content-small')}`}>
                  {t('chat.input.dragDrop.subtitle')}
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <MdAttachFile className="w-4 h-4" />
                <span className={getTypographyClass('content-small')}>
                  {t('chat.input.dragDrop.supportedFiles')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="border-b border-border bg-background p-4 shadow-sm">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6">
          {isTopicChat ? (
            /* Chat Topic Header */
            <div className="flex items-center justify-between">
              {/* Left side - Topic Info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MdTopic className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className={`text-lg font-semibold text-foreground truncate ${currentChat?.title ? getUserContentClasses(currentChat.title) : getUITextClasses()}`}>
                      {currentChat?.title || t('chat.interface.chatTopic')}
                    </h1>
                    <span className={`text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium flex-shrink-0 ${getUITextClasses()}`}>
                      {t('chat.interface.topic')}
                    </span>
                  </div>
                  {currentWorkspace && (
                    <p className={`text-sm text-muted-foreground truncate mixed-content`}>
                      <span className={getUITextClasses()}>{t('chat.interface.in')}</span>{' '}
                      <span className={getUserContentClasses(currentWorkspace.name)}>{currentWorkspace.name}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Right side - History and Close Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowHistory}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  title={t('chat.interface.showHistory')}
                >
                  <MdHistory className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToWorkspace}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                  title={t('chat.interface.closeAndReturn')}
                >
                  <MdClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Regular Chat Header */
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className={`text-xl font-semibold text-foreground truncate ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {currentChat?.title || t('chat.interface.chat')}
                </h1>
                {currentWorkspace && (
                  <p className={`text-sm text-muted-foreground mt-1 truncate ${language === 'ar' ? 'text-arabic' : ''}`}>
                    {t('chat.interface.in')} {currentWorkspace.name}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 flex flex-col">
          <ChatMessages />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background py-4">
        <div className="max-w-6xl mx-auto px-4">
          <ChatInput ref={chatInputRef} onFileUpload={handleFileUpload} />
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className={getUITextClasses()}>
              {t('chat.interface.history.title')} - {currentChat?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {userMessages.length > 0 ? (
              <div className="space-y-3">
                {userMessages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleHistoryMessageClick(message.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium text-foreground line-clamp-3 ${getUserContentClasses(message.content)}`}>
                          {message.content}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-xs text-muted-foreground ${getUITextClasses()}`}>
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MdHistory className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className={getUITextClasses()}>{t('chat.interface.history.empty')}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
