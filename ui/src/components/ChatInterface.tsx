"use client";

import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChatMessages } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { MdClose, MdTopic } from "react-icons/md";
import type { CurrentView } from "@/components/MainLayout";

interface ChatInterfaceProps {
  onViewChange: (view: CurrentView) => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
  const { currentChat, currentWorkspace } = useApp();
  const { language, t, dir } = useLanguage();

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
              
              {/* Right side - Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToWorkspace}
                className="flex-shrink-0 ml-4 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                title={t('chat.interface.closeAndReturn')}
              >
                <MdClose className="h-4 w-4" />
              </Button>
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
    </div>
  );
}
