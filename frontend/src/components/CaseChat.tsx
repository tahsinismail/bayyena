// frontend/src/components/CaseChat.tsx

import { useState, useEffect, useRef } from 'react';
import { Flex, TextArea, Button, ScrollArea, Spinner, Text, Card } from '@radix-ui/themes';
import { PaperPlaneIcon, ReloadIcon } from '@radix-ui/react-icons';
import type { Message } from '../types';
import { getChatHistory, clearChatHistory, postChatMessage } from '../api';
import ReactMarkdown from 'react-markdown'; // Import the new library
import remarkGfm from 'remark-gfm'; // Import the GFM plugin
import { format } from 'date-fns';

interface CaseChatProps {
    caseId: string;
    onTitleGenerationRequest?: (messages: string[]) => void;
}

export default function CaseChat({ caseId, onTitleGenerationRequest }: CaseChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isInputFloating, setIsInputFloating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check if messages need scrolling and enable floating input
    useEffect(() => {
        const checkScrolling = () => {
            if (messagesContainerRef.current && chatContainerRef.current) {
                const messagesContainer = messagesContainerRef.current;
                const scrollArea = messagesContainer.querySelector('[data-radix-scroll-area-viewport]');
                
                if (scrollArea) {
                    const shouldFloat = scrollArea.scrollHeight > scrollArea.clientHeight;
                    setIsInputFloating(shouldFloat);
                } else {
                    // Fallback if Radix structure is different
                    const shouldFloat = messagesContainer.scrollHeight > messagesContainer.clientHeight;
                    setIsInputFloating(shouldFloat);
                }
            }
        };

        // Small delay to ensure DOM is updated after message changes
        const timeoutId = setTimeout(checkScrolling, 100);
        
        // Also check on window resize
        window.addEventListener('resize', checkScrolling);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkScrolling);
        };
    }, [messages, isLoading]);    // Helper function to format timestamp
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

    return (
        <div ref={chatContainerRef} className="relative">
            <Card className={isInputFloating ? 'pb-0' : ''}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
                    <Text size="4" weight="bold" color="gray">Legal AI Assistant</Text>
                    <Button 
                        variant="soft" 
                        color="red" 
                        size="2" 
                        onClick={handleClearChat}
                        className="hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        <ReloadIcon width="16" height="16" /> Clear Chat
                    </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea 
                        ref={messagesContainerRef}
                        className={`h-full px-4 py-2 ${isInputFloating ? 'pb-32' : ''}`}
                        type="hover"
                        scrollbars="vertical"
                    >
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto min-h-[26vh]">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Text size="6" className="text-white">⚖️</Text>
                                </div>
                                <Text size="4" weight="bold" className="mb-2">Legal AI Assistant</Text>
                                <Text size="2" color="gray" className="max-w-md mb-4">
                                    Ask me legal questions or inquire about your uploaded documents. 
                                    I can help with legal analysis, document review, and case-related queries.
                                </Text>
                                <div className="max-w-lg">
                                    <Text size="1" color="gray" className="mb-2 font-medium">Example queries:</Text>
                                    <div className="space-y-1 text-left">
                                        <Text size="1" color="gray">• "Analyze the contract terms in my uploaded document"</Text>
                                        <Text size="1" color="gray">• "What are the key legal issues in this case?"</Text>
                                        <Text size="1" color="gray">• "Explain employment law regarding wrongful termination"</Text>
                                        <Text size="1" color="gray">• "Draft a motion to dismiss for this matter"</Text>
                                        <Text size="1" color="gray">• "What statutes of limitations apply here?"</Text>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, index) => {
                            const isBot = msg.sender === 'bot';
                            
                            return (
                                <div 
                                    key={`${msg.sender}-${index}-${msg.createdAt}`} 
                                    className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
                                >
                                    {isBot && (
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Text size="2" className="text-white">⚖️</Text>
                                        </div>
                                    )}
                                    
                                    <div className={`flex flex-col max-w-[80%] ${isBot ? 'items-start' : 'items-end'}`}>
                                        <div 
                                            className={`relative p-4 rounded-2xl ${
                                                isBot 
                                                    ? 'bg-gray-100 text-gray-900 rounded-tl-sm' 
                                                    : 'bg-[#856A00] text-white rounded-tr-sm'
                                            }`}
                                        >
                                            <div className={`markdown-content ${isBot ? 'prose prose-sm max-w-none pr-16 pb-2' : ''}`}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                            
                                            {/* Copy button positioned at bottom right of bot messages */}
                                            {isBot && (
                                                <button
                                                    title="Copy response"
                                                    className="chat-copy-button absolute bottom-2 right-2 flex items-center gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-white transition-all duration-200 text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                                                    onClick={() => handleCopy(msg.text, index)}
                                                >
                                                    {copiedIndex === index ? (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-[#a17a1a]">
                                                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor" strokeWidth="1.5"/>
                                                            </svg>
                                                            <span className="text-[#a17a1a] font-medium text-xs">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" className="text-gray-600">
                                                                <rect x="4" y="4" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                                                <rect x="6" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="white"/>
                                                            </svg>
                                                            <span className="font-medium text-xs">Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1">
                                            {msg.createdAt && (
                                                <Text 
                                                    size="1" 
                                                    color="gray" 
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    {formatTimestamp(msg.createdAt)}
                                                </Text>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {!isBot && (
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Text size="2" className="text-white">👤</Text>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* Loading animation */}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <Text size="2" className="text-white">⚖️</Text>
                                </div>
                                <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-sm max-w-[80%]">
                                    <Flex align="center" gap="2">
                                        <Spinner size="2" />
                                        <Text size="2" color="gray">Analyzing your legal query...</Text>
                                    </Flex>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div 
                className={`
                    ${isInputFloating 
                        ? 'fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg' 
                        : 'border-t border-gray-200 bg-white'
                    } 
                    p-4 flex-shrink-0
                `}
            >
                <div className={`${isInputFloating ? 'max-w-7xl mx-auto' : 'max-w-4xl mx-auto'}`}>
                    <div className="relative">
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask legal questions or inquire about your documents..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl resize-none min-h-[52px] max-h-32 pr-16 pl-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#856A00] focus:border-transparent"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            style={{
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className={`chat-send-button absolute right-3 bottom-3 rounded-xl p-2.5 w-11 h-11 flex items-center justify-center transition-all duration-200 ${
                                isLoading || !input.trim() 
                                    ? 'bg-gray-300 cursor-not-allowed shadow-none transform-none' 
                                    : 'text-white'
                            }`}
                        >
                            {isLoading ? (
                                <Spinner size="2" className="text-white" />
                            ) : (
                                <PaperPlaneIcon width="18" height="18" className="ml-0.5" />
                            )}
                        </button>
                    </div>
                    <Text size="1" color="gray" className="mt-2 text-center block">
                        Press Enter to send, Shift+Enter for new line
                    </Text>
                </div>
            </div>
            </Card>
        </div>
    );
}
