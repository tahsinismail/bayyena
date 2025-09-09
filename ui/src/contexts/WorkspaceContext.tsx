"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  workspaceId: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  workspaceId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Document[];
}

export interface Workspace {
  id: string;
  title: string;
  documents: Document[];
  chats: Chat[];
  createdAt: Date;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentChat: Chat | null;
  createWorkspace: (title: string) => Promise<Workspace>;
  selectWorkspace: (workspaceId: string) => void;
  createChat: (workspaceId: string, title: string) => Promise<Chat>;
  selectChat: (chatId: string) => void;
  addDocument: (workspaceId: string, document: Omit<Document, 'id' | 'workspaceId' | 'uploadedAt'>) => Promise<Document>;
  sendMessage: (chatId: string, content: string, attachments?: Document[]) => Promise<Message>;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  // Load workspaces from localStorage on mount
  useEffect(() => {
    const savedWorkspaces = localStorage.getItem('workspaces');
    if (savedWorkspaces) {
      const parsed = JSON.parse(savedWorkspaces).map((ws: Workspace) => ({
        ...ws,
        createdAt: new Date(ws.createdAt),
        chats: ws.chats.map((chat: Chat) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        })),
        documents: ws.documents.map((doc: Document) => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt)
        }))
      }));
      setWorkspaces(parsed);
    }
  }, []);

  // Save workspaces to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  const createWorkspace = async (title: string): Promise<Workspace> => {
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      title,
      documents: [],
      chats: [],
      createdAt: new Date()
    };

    // Create default chat
    const defaultChat: Chat = {
      id: Date.now().toString() + '-chat',
      title: 'General',
      messages: [],
      workspaceId: newWorkspace.id,
      createdAt: new Date()
    };

    newWorkspace.chats = [defaultChat];

    setWorkspaces(prev => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    setCurrentChat(defaultChat);

    // In a real app, this would make an API call
    // await fetch('/api/workspaces', { method: 'POST', body: JSON.stringify({ title }) });

    return newWorkspace;
  };

  const selectWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      // Select the first chat or create one if none exists
      if (workspace.chats.length > 0) {
        setCurrentChat(workspace.chats[0]);
      } else {
        createChat(workspaceId, 'General');
      }
    }
  };

  const createChat = async (workspaceId: string, title: string): Promise<Chat> => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title,
      messages: [],
      workspaceId,
      createdAt: new Date()
    };

    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, chats: [...ws.chats, newChat] }
        : ws
    ));

    setCurrentChat(newChat);

    // In a real app, this would make an API call
    // await fetch('/api/chats', { method: 'POST', body: JSON.stringify({ workspaceId, title }) });

    return newChat;
  };

  const selectChat = (chatId: string) => {
    const workspace = workspaces.find(ws => 
      ws.chats.some(chat => chat.id === chatId)
    );
    if (workspace) {
      const chat = workspace.chats.find(c => c.id === chatId);
      if (chat) {
        setCurrentWorkspace(workspace);
        setCurrentChat(chat);
      }
    }
  };

  const addDocument = async (workspaceId: string, documentData: Omit<Document, 'id' | 'workspaceId' | 'uploadedAt'>): Promise<Document> => {
    const newDocument: Document = {
      ...documentData,
      id: Date.now().toString(),
      workspaceId,
      uploadedAt: new Date()
    };

    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, documents: [...ws.documents, newDocument] }
        : ws
    ));

    // In a real app, this would make an API call
    // await fetch('/api/documents', { method: 'POST', body: formData });

    return newDocument;
  };

  const sendMessage = async (chatId: string, content: string, attachments?: Document[]): Promise<Message> => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      attachments
    };

    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      chats: ws.chats.map(chat => 
        chat.id === chatId 
          ? { ...chat, messages: [...chat.messages, newMessage] }
          : chat
      )
    })));

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you said: "${content}". This is a demo AI response. In a real implementation, this would be processed by the backend AI service.${attachments && attachments.length > 0 ? ` I can see you've attached ${attachments.length} document(s).` : ''}`,
        role: 'assistant',
        timestamp: new Date()
      };

      setWorkspaces(prev => prev.map(ws => ({
        ...ws,
        chats: ws.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: [...chat.messages, aiResponse] }
            : chat
        )
      })));
    }, 1000);

    // In a real app, this would make an API call
    // await fetch('/api/messages', { method: 'POST', body: JSON.stringify({ chatId, content, attachments }) });

    return newMessage;
  };

  const updateWorkspace = (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId ? { ...ws, ...updates } : ws
    ));
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      currentChat,
      createWorkspace,
      selectWorkspace,
      createChat,
      selectChat,
      addDocument,
      sendMessage,
      updateWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
