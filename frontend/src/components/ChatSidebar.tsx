// frontend/src/components/ChatSidebar.tsx

import { useState, useEffect } from 'react';
import { ScrollArea, Text, Flex, Button, Badge, TextField } from '@radix-ui/themes';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ChatBubbleIcon,
  FileTextIcon,
  ClockIcon,
  DotFilledIcon
} from '@radix-ui/react-icons';
import type { Case, Message } from '../types';
import { getChatHistory } from '../api';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface ChatSidebarProps {
  cases: Case[];
  activeCaseId: string | null;
  onCaseSelect: (caseId: string) => void;
  isLoading: boolean;
}

interface CaseWithLastMessage extends Case {
  lastMessage?: Message;
  unreadCount?: number;
  hasMessages?: boolean;
}

export default function ChatSidebar({ 
  cases, 
  activeCaseId, 
  onCaseSelect, 
  isLoading 
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [casesWithMessages, setCasesWithMessages] = useState<CaseWithLastMessage[]>([]);

  // Fetch last messages and unread counts for each case
  useEffect(() => {
    const fetchCaseMessages = async () => {
      const casesWithData = await Promise.all(
        cases.map(async (caseItem) => {
          try {
            const { data: messages } = await getChatHistory(caseItem.id.toString());
            const lastMessage = messages[messages.length - 1];
            
            return {
              ...caseItem,
              lastMessage,
              hasMessages: messages.length > 0,
              unreadCount: 0 // TODO: Implement unread message tracking
            };
          } catch (error) {
            return {
              ...caseItem,
              hasMessages: false,
              unreadCount: 0
            };
          }
        })
      );
      setCasesWithMessages(casesWithData);
    };

    if (cases.length > 0) {
      fetchCaseMessages();
    }
  }, [cases]);

  // Filter cases based on search term
  const filteredCases = casesWithMessages.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort cases: active first, then by last message date, then by creation date
  const sortedCases = filteredCases.sort((a, b) => {
    if (a.id.toString() === activeCaseId) return -1;
    if (b.id.toString() === activeCaseId) return 1;
    
    if (a.lastMessage && b.lastMessage) {
      return new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime();
    }
    if (a.lastMessage && !b.lastMessage) return -1;
    if (!a.lastMessage && b.lastMessage) return 1;
    
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'Civil Dispute': return '⚖️';
      case 'Criminal Defense': return '🛡️';
      case 'Family Law': return '👨‍👩‍👧‍👦';
      case 'Intellectual Property': return '💡';
      case 'Corporate Law': return '🏢';
      default: return '📁';
    }
  };

  if (isLoading) {
    return (
      <div className="chat-sidebar-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <Text size="2" color="gray">Loading matters...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-sidebar">
      {/* Search Header */}
      <div className="chat-sidebar-header">
        <Text size="3" weight="bold" className="sidebar-title">
          Recent Matters
        </Text>
        
        {/* Search Input */}
        <div className="search-container">
          <TextField.Root
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search matters..."
            className="search-input"
            size="2"
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </div>

        {/* New Chat Button */}
        <Button 
          variant="soft" 
          size="2" 
          className="new-chat-button w-full"
          onClick={() => {
            // TODO: Implement new matter creation
            console.log('Create new matter');
          }}
        >
          <PlusIcon />
          New Matter
        </Button>
      </div>

      {/* Cases List */}
      <ScrollArea className="chat-sidebar-content" type="hover">
        <div className="cases-list">
          {sortedCases.length > 0 ? (
            sortedCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className={`case-item ${
                  activeCaseId === caseItem.id.toString() ? 'active' : ''
                }`}
                onClick={() => onCaseSelect(caseItem.id.toString())}
              >
                <Flex gap="3" align="start" className="w-full">
                  {/* Case Icon */}
                  <div className="case-icon">
                    <span className="case-type-emoji">
                      {getCaseTypeIcon(caseItem.type)}
                    </span>
                    {caseItem.hasMessages && (
                      <div className="has-messages-indicator">
                        <ChatBubbleIcon className="message-icon" />
                      </div>
                    )}
                  </div>

                  {/* Case Content */}
                  <div className="case-content">
                    <Flex justify="between" align="start" className="w-full mb-1">
                      <Text size="2" weight="bold" className="case-title">
                        {caseItem.title || 'Untitled Matter'}
                      </Text>
                      <div className="case-indicators">
                        {caseItem.unreadCount && caseItem.unreadCount > 0 && (
                          <Badge color="red" variant="solid" className="unread-badge">
                            {caseItem.unreadCount}
                          </Badge>
                        )}
                        {caseItem.lastMessage && (
                          <Text size="1" color="gray" className="message-time">
                            {formatMessageTime(caseItem.lastMessage.createdAt!)}
                          </Text>
                        )}
                      </div>
                    </Flex>

                    <Text size="1" color="gray" className="case-number mb-1">
                      #{caseItem.caseNumber}
                    </Text>

                    {caseItem.lastMessage ? (
                      <div className="last-message">
                        <Text size="1" color="gray" className="message-preview">
                          <span className="message-sender">
                            {caseItem.lastMessage.sender === 'user' ? 'You: ' : 'AI: '}
                          </span>
                          {truncateMessage(caseItem.lastMessage.text)}
                        </Text>
                      </div>
                    ) : (
                      <Text size="1" color="gray" className="no-messages">
                        No messages yet
                      </Text>
                    )}

                    {/* Case Metadata */}
                    <Flex align="center" gap="2" className="case-metadata mt-2">
                      <FileTextIcon className="metadata-icon" />
                      <Text size="1" color="gray">
                        {caseItem.type}
                      </Text>
                      <DotFilledIcon className="metadata-separator" />
                      <ClockIcon className="metadata-icon" />
                      <Text size="1" color="gray">
                        {formatDistanceToNow(new Date(caseItem.updatedAt), { addSuffix: true })}
                      </Text>
                    </Flex>
                  </div>
                </Flex>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <Text size="3" weight="medium" className="empty-title">
                {searchTerm ? 'No matters found' : 'No matters yet'}
              </Text>
              <Text size="2" color="gray" className="empty-subtitle">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Create your first matter to start using the AI assistant'
                }
              </Text>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
