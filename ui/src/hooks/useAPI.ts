import { useState, useCallback } from 'react';
import { Workspace, Chat, Document, Message } from '@/contexts/WorkspaceContext';

// Custom hook for workspace operations
export function useWorkspaceAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWorkspace = useCallback(async (title: string): Promise<Workspace> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an actual API call
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create workspace');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/workspaces');
      
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createWorkspace,
    fetchWorkspaces,
    loading,
    error,
  };
}

// Custom hook for chat operations
export function useChatAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createChat = useCallback(async (workspaceId: string, title: string): Promise<Chat> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId, title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    chatId: string, 
    content: string, 
    attachments?: Document[]
  ): Promise<Message> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId, content, attachments }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createChat,
    sendMessage,
    loading,
    error,
  };
}

// Custom hook for document operations
export function useDocumentAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = useCallback(async (
    workspaceId: string, 
    file: File
  ): Promise<Document> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (workspaceId: string): Promise<Document[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents?workspaceId=${workspaceId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploadDocument,
    fetchDocuments,
    loading,
    error,
  };
}
