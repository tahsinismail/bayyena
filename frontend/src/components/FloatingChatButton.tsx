// frontend/src/components/FloatingChatButton.tsx

import { useLocation } from 'wouter';
import { ChatBubbleIcon } from '@radix-ui/react-icons';
import { Badge } from '@radix-ui/themes';

interface FloatingChatButtonProps {
  caseId?: string;
  hasUnreadMessages?: boolean;
  messageCount?: number;
}

export default function FloatingChatButton({ 
  caseId, 
  hasUnreadMessages = false, 
  messageCount = 0 
}: FloatingChatButtonProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    // Navigate to chat page with or without caseId
    if (caseId) {
      setLocation(`/chat/${caseId}`);
    } else {
      setLocation('/chat');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleClick}
        className="fab-chat-button"
        aria-label="Open AI Legal Assistant"
        title="AI Legal Assistant"
      >
        <div className="fab-content">
          <ChatBubbleIcon className="fab-icon" />
          {hasUnreadMessages && messageCount > 0 && (
            <Badge 
              className="fab-badge"
              color="red"
              variant="solid"
            >
              {messageCount > 99 ? '99+' : messageCount}
            </Badge>
          )}
        </div>
        
        {/* Pulse effect for new messages */}
        {hasUnreadMessages && (
          <div className="fab-pulse-ring"></div>
        )}
      </button>
    </>
  );
}
