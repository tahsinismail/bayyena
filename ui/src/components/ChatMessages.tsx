"use client";

import { useApp, Message } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { MdPerson, MdSmartToy, MdContentCopy, MdCheck } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { useState, useEffect } from "react";

export function ChatMessages() {
  const { currentChat, currentWorkspace } = useApp();
  const { language, t } = useLanguage();

  // Auto-scroll to last user message when messages change
  useEffect(() => {
    if (currentChat?.messages && currentChat.messages.length > 0) {
      // Find the last user message
      const userMessages = currentChat.messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        const messageElement = document.getElementById(`message-${lastUserMessage.id}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [currentChat?.messages]);

  // Helper functions for content direction detection
  const getUITextClasses = () => {
    return language === 'ar' ? 'arabic-text' : 'english-text';
  };

  const getUserContentClasses = (content: string) => {
    // For bidirectional text support, use mixed-content class with dir="auto"
    // This allows English and Arabic to follow their natural directions within the same sentence
    return 'mixed-content'; // Use neutral class for auto-detection
  };

  // Show welcome screen if no workspace is selected
  if (!currentWorkspace) {
    return <WelcomeScreen />;
  }

  if (!currentChat) {
    return (
      <div className={`flex-1 flex items-center justify-center text-muted-foreground ${language === 'ar' ? 'text-arabic' : 'text-english'}`}>
        <div className="text-center">
          <h3 className={`text-title-card mb-2 ${getUITextClasses()}`}>
            {t('chat.messages.welcomeTo')} {currentWorkspace.name}
          </h3>
          <p className={`text-content text-center ${getUITextClasses()}`}>{t('chat.messages.startConversation')}</p>
        </div>
      </div>
    );
  }

  if (currentChat.messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center text-muted-foreground ${language === 'ar' ? 'text-arabic' : 'text-english'}`}>
        <div className="p-6 text-center">
          <h3 className={`text-title-card mb-2 ${getUITextClasses()}`}>
            {t('chat.messages.startConversationTitle')}
          </h3>
          <p className={`text-content text-center ${getUITextClasses()}`}>{t('chat.messages.startConversationSubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 chat-message-container">
      {currentChat.messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const { language, t } = useLanguage();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Helper functions for content direction detection
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };

  const getUserContentClasses = (content: string) => {
    // For bidirectional text support, we'll use CSS dir="auto" instead of manual detection
    // This allows English and Arabic to follow their natural directions within the same sentence
    return 'text-content'; // Use a neutral class for content
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    // Always use English format regardless of interface language
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div id={`message-${message.id}`} className={`flex gap-3 ${isUser ? 'chat-user-message' : 'chat-ai-message'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <MdSmartToy className="h-4 w-4" />
        </div>
      )}
      
      <div className={`max-w-full sm:max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        <Card className={`p-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card'} ${!isUser ? 'px-4 py-3' : ''}`}>
          <div className={`text-chat-message ${getUserContentClasses(message.content)} ${language === 'ar' ? 'text-arabic' : 'text-english'}`} dir="auto">
            {isUser ? (
              <span dir="auto">{message.content}</span>
            ) : (
              <div className={`markdown-content ${getUserContentClasses(message.content)} ${language === 'ar' ? 'text-arabic' : 'text-english'} px-1`} dir="auto">
                <ReactMarkdown 
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Customize code blocks
                    code: (props: any) => {
                      const { inline, className, children, ...rest } = props;
                      return !inline ? (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto my-2" dir="ltr">
                          <code className={className} {...rest}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" dir="ltr" {...rest}>
                          {children}
                        </code>
                      );
                    },
                    // Customize paragraphs to reduce spacing and add proper direction
                    p: ({ children }: any) => <p className="mb-3 leading-relaxed" dir="auto">{children}</p>,
                    // Customize lists
                    ul: ({ children }: any) => <ul className="mb-3 pl-5 space-y-1 list-disc">{children}</ul>,
                    ol: ({ children }: any) => <ol className="mb-3 pl-5 space-y-1 list-decimal">{children}</ol>,
                    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
                    // Customize headings
                    h1: ({ children }: any) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                    h2: ({ children }: any) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                    h3: ({ children }: any) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                    h4: ({ children }: any) => <h4 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h4>,
                    // Customize blockquotes
                    blockquote: ({ children }: any) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600 dark:text-gray-400">
                        {children}
                      </blockquote>
                    ),
                    // Customize links
                    a: ({ children, href }: any) => (
                      <a href={href} className="text-blue-600 hover:text-blue-800 underline dark:text-blue-400 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    // Customize horizontal rules
                    hr: () => <hr className="my-4 border-gray-300 dark:border-gray-600" />,
                    // Customize tables
                    table: ({ children }: any) => (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border border-gray-300 dark:border-gray-600">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }: any) => (
                      <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }: any) => (
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className={`text-content-small opacity-60 ${language === 'ar' ? 'text-arabic' : 'text-english'}`}>
              {formatDateTime(message.timestamp)}
            </div>
            
            {!isUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                title={t('chat.messages.copyMessage')}
              >
                {copied ? (
                  <MdCheck className="h-3 w-3 text-green-600" />
                ) : (
                  <MdContentCopy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
          <MdPerson className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
