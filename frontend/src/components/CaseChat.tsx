// frontend/src/components/CaseChat.tsx

import { useState, useEffect, useRef } from 'react';
import { Box, Card, Flex, TextArea, Button, ScrollArea, Spinner, Text } from '@radix-ui/themes';
import { PaperPlaneIcon, ReloadIcon } from '@radix-ui/react-icons';
import type { Message } from '../types';
import { getChatHistory, clearChatHistory, postChatMessage } from '../api';
import ReactMarkdown from 'react-markdown'; // Import the new library
import remarkGfm from 'remark-gfm'; // Import the GFM plugin
import { format } from 'date-fns';

interface CaseChatProps {
    caseId: string;
}

export default function CaseChat({ caseId }: CaseChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const lastBotMsgRef = useRef<HTMLDivElement>(null);
    const lastUserMsgRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLDivElement>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If this is initial load, scroll to bottom (input area)
      if (isInitialLoad) {
        setTimeout(() => {
          if (chatInputRef.current) {
            chatInputRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'end' 
            });
          }
        }, 100);
        setIsInitialLoad(false);
      }
      // If last message is from bot and there's a corresponding user message, scroll to the user message
      else if (lastMessage.sender === 'bot' && lastUserMsgRef.current) {
        setTimeout(() => {
          lastUserMsgRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      }
    } else {
      // If no messages (empty chat), scroll to chat input box
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad]);    // Helper function to format timestamp
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
            setMessages(prev => [...prev, botMessage]);
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

    return (
        <Card>
            <Box p="4">
                <Flex justify="end" align="end" mb="2">
                    <Button variant="soft" color="red" size="1" onClick={handleClearChat}><ReloadIcon /> Clear Chat</Button>
                </Flex>

                <ScrollArea 
                    ref={scrollAreaRef} 
                    className="min-h-[200px] max-h-[400px] md:min-h-[200px] md:max-h-max bg-gray-50 rounded py-2 px-4 chat-scroll-area"
                    type="hover"
                    scrollbars="vertical"
                >
                    <Flex direction="column" gap="4">
                        {messages.map((msg, index) => {
                            const isBot = msg.sender === 'bot';
                            const isLastBot = isBot && index === messages.length - 1;
                            
                            // Check if this user message is the one that corresponds to the latest bot response
                            const isCorrespondingUserMsg = msg.sender === 'user' && 
                                                          index === messages.length - 2 && 
                                                          messages.length > 1 && 
                                                          messages[messages.length - 1].sender === 'bot';
                            
                            return (
                                <Flex 
                                    key={`${msg.sender}-${index}-${msg.createdAt}`} 
                                    direction="column" 
                                    align={msg.sender === 'user' ? 'end' : 'start'} 
                                    position="relative"
                                    className="animate-slideInUp"
                                >
                                    <Box 
                                        className={`w-full lg:max-w-[90%] p-3 rounded-lg transition-all duration-300 ease-in-out ${
                                            msg.sender === 'user' 
                                                ? 'bg-[#856A00] text-white ml-auto max-w-[85%]' 
                                                : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                                        }`} 
                                        ref={isLastBot ? lastBotMsgRef : isCorrespondingUserMsg ? lastUserMsgRef : undefined}
                                    >
                                        <div className={`markdown-content ${msg.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                        
                                        {/* Copy icon for bot messages */}
                                        {isBot && (
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    title="Copy response"
                                                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors duration-200 text-xs p-1 rounded hover:bg-gray-100"
                                                    onClick={() => handleCopy(msg.text, index)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect x="5" y="5" width="10" height="12" rx="2" fill="currentColor" />
                                                        <rect x="3" y="3" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                                    </svg>
                                                    <span>Copy</span>
                                                    {copiedIndex === index && (
                                                        <span className="text-green-600 font-medium">✓</span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </Box>
                                    
                                    {msg.createdAt && (
                                        <Text 
                                            size="1" 
                                            color="gray" 
                                            style={{ 
                                                marginTop: '4px',
                                                fontSize: '11px',
                                                textAlign: msg.sender === 'user' ? 'right' : 'left'
                                            }}
                                        >
                                            {formatTimestamp(msg.createdAt)}
                                        </Text>
                                    )}
                                </Flex>
                            );
                        })}
                        
                        {/* Loading spinner when waiting for response */}
                        {isLoading && (
                            <Flex justify="start" className="animate-slideInUp">
                                <Box className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                                    <Flex align="center" gap="2">
                                        <Spinner size="2" />
                                        <Text size="2" color="gray">Bayyena is thinking...</Text>
                                    </Flex>
                                </Box>
                            </Flex>
                        )}
                    </Flex>
                </ScrollArea>

                <Flex mt="4" gap="3" align="center" onSubmit={(e) => { e.preventDefault(); handleSend(); }} ref={chatInputRef}>
                    <TextArea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about the documents..."
                        className="flex-grow"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                        }}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} onClick={() => handleSend()}><PaperPlaneIcon /> Send</Button>
                </Flex>
            </Box>
        </Card>
    );
}
