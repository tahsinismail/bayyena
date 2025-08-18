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
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Helper function to format timestamp
    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        try {
            return format(new Date(timestamp), 'MMM d, yyyy • h:mm a');
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return '';
        }
    };

    // Auto-scrolling Logic
    useEffect(() => {
        // Scroll to the last user message if just sent, else scroll to last bot message
        if (lastUserMsgRef.current) {
            lastUserMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (lastBotMsgRef.current) {
            lastBotMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);
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

        const userMessage: Message = { sender: 'user', text: trimmedInput };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const { data: { answer } } = await postChatMessage(caseId, trimmedInput);
            // Fetch history again to get the saved messages, ensuring UI is in sync with DB
            console.log("answer", answer);
            const { data: updatedHistory } = await getChatHistory(caseId);
            setMessages(updatedHistory);
        } catch (err: any) {
            const errorMessage: Message = {
                sender: 'bot',
                text: err.response?.data?.answer || "Sorry, an error occurred."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
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

                <ScrollArea ref={scrollAreaRef} className="h-[400px] md:min-h-[400px] bg-gray-50 rounded py-2 px-4">
                    <Flex direction="column" gap="4">
                        {messages.map((msg, index) => {
                            const isBot = msg.sender === 'bot';
                            const isLastBot = isBot && index === messages.length - 1;
                            const isLastUser = msg.sender === 'user' && index === messages.length - 1;
                            return (
                                <Flex key={index} direction="column" align={msg.sender === 'user' ? 'end' : 'start'} position="relative">
                                    <Box className={`w-full lg:max-w-[90%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-[#856A00] text-white' : 'bg-gray-200'}`} ref={isLastBot ? lastBotMsgRef : isLastUser ? lastUserMsgRef : undefined}>
                                        <div className="markdown-content">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    {/* Copy icon outside the response bubble for bot messages */}
                                    {isBot && (
                                       <div style={{width: '100%', display: 'flex', justifyContent: 'flex-end'}}>
                                            <button
                                                title="Copy response"
                                                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                                onClick={() => handleCopy(msg.text, index)}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <rect x="5" y="5" width="10" height="12" rx="2" fill="#888" />
                                                    <rect x="3" y="3" width="10" height="12" rx="2" stroke="#888" strokeWidth="2" />
                                                </svg>
                                                <span style={{fontSize: '14px', color: '#888', fontWeight: 'bold'}}>Copy</span>
                                                {copiedIndex === index && (
                                                    <span style={{ marginLeft: 6, color: '#888', fontSize: 12 }}>Copied</span>
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
                        {isLoading && <Flex justify="start"><Spinner /></Flex>}
                    </Flex>
                </ScrollArea>

                <Flex mt="4" gap="3" align="center" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
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
