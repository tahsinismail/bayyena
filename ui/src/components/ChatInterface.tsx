"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MdClose, MdTopic, MdHistory } from "react-icons/md";
import type { CurrentView } from "@/components/MainLayout";

interface ChatInterfaceProps {
  onViewChange: (view: CurrentView) => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
  const { currentChat, currentWorkspace } = useApp();
  const { language, t, dir } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);

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
    <div className="h-full flex flex-col bg-background" dir={dir}>
      {/* Chat Header */}
      <div className="border-b border-border bg-background p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
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
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          <ChatMessages />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <ChatInput />
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
