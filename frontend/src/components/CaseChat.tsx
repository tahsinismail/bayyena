// frontend/src/components/CaseChat.tsx

import { useState, useEffect, useRef } from 'react';
import { Box, Card, Flex, TextArea, Button, ScrollArea, Spinner } from '@radix-ui/themes';
import { PaperPlaneIcon, ReloadIcon } from '@radix-ui/react-icons';
import type { Message } from '../types';
import { getChatHistory, clearChatHistory } from '../api';
import ReactMarkdown from 'react-markdown'; // Import the new library
import remarkGfm from 'remark-gfm'; // Import the GFM plugin

interface CaseChatProps {
    caseId: string;
}

export default function CaseChat({ caseId }: CaseChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Auto-scrolling Logic
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

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
            // const { data: { answer } } = await postChatMessage(caseId, trimmedInput);
            // Fetch history again to get the saved messages, ensuring UI is in sync with DB
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

                <ScrollArea ref={scrollAreaRef} style={{ height: '300px' }} className="bg-gray-50 rounded py-2 px-4">
                    <Flex direction="column" gap="4">
                        {messages.map((msg, index) => (
                            <Flex key={index} justify={msg.sender === 'user' ? 'end' : 'start'}>
                                <Box className={`p-3 rounded-lg ${msg.sender === 'user' ? 'bg-[#856A00] text-white' : 'bg-gray-200'}`} style={{ maxWidth: '80%' }}>
                                    {/* --- THIS IS THE KEY CHANGE --- */}
                                    {/* Use ReactMarkdown to render the text */}
                                    <div className="markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </Box>
                            </Flex>
                        ))}
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
