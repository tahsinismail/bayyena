'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { apiService, Case, ChatMessage, ChatTopic, Document as ApiDocument, AuthUser } from '@/services/api';

// Helper function to extract user-friendly error message from JSON or plain text
const parseErrorMessage = (error: string | Error): string => {
  const errorString = error instanceof Error ? error.message : error;
  
  try {
    // Try to parse as JSON to extract the message field
    const errorObj = JSON.parse(errorString);
    return errorObj.message || errorString;
  } catch {
    // If it's not JSON, return the original string
    return errorString;
  }
};

// UI interfaces that map to backend data
export interface Document {
  id: string;
  name: string;
  type: string; // We'll ensure this is always provided with fallback
  size: number;
  uploadedAt: string;
  content?: string;
  processingStatus?: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  storagePath?: string; // Added for opening documents in new tab
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  topicId?: number; // Optional - for chat topics
}

export interface Workspace {
  id: string;
  name: string;
  description?: string; // Added description field
  chats: Chat[];
  documents: Document[];
  createdAt: string;
  priority?: 'High' | 'Normal' | 'Low';
  status?: 'Open' | 'Closed' | 'Archived';
}

interface AppContextType {
  user: AuthUser | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentChat: Chat | null;
  loading: boolean;
  error: string | null;
  contextVersion: number;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, phoneNumber?: string) => Promise<{ message?: string; accountPending?: boolean; userEmail?: string } | void>;
  logout: () => Promise<void>;
  
  // Workspace/Case methods
  createWorkspace: (title: string, priority?: string, description?: string) => Promise<Workspace>;
  selectWorkspace: (workspaceId: string) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  
  // Chat methods
  createChat: (workspaceId: string, title: string) => Promise<Chat>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<Message>;
  
  // Chat Topic methods
  createChatTopic: (workspaceId: string, title: string, description?: string) => Promise<Chat>;
  updateChatTopic: (topicId: number, title?: string, description?: string) => Promise<void>;
  deleteChatTopic: (topicId: number) => Promise<void>;
  loadChatTopics: (workspaceId: string) => Promise<void>;
  
  // Document methods
  uploadDocument: (file: File) => Promise<Document>;
  addDocumentToWorkspace: (document: Document) => void;
  updateDocumentInWorkspace: (document: Document) => void;
  deleteDocument: (documentId: string) => Promise<void>;
  
  // General methods
  refreshData: () => Promise<void>;
  checkAuthAndLoadData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper functions to convert backend data to UI data
function convertChatTopicToChat(topic: ChatTopic, messages: ChatMessage[] = []): Chat {
  return {
    id: `topic-${topic.id}`,
    title: topic.title,
    messages: messages.map(convertMessageToUIMessage),
    createdAt: topic.createdAt,
    topicId: topic.id,
  };
}

function convertCaseToWorkspace(case_: Case, documents: ApiDocument[] = [], messages: ChatMessage[] = [], topics: ChatTopic[] = []): Workspace {
  let chats: Chat[];
  
  if (topics.length > 0) {
    // If there are chat topics, create chats from topics
    chats = topics.map(topic => {
      const topicMessages = messages.filter(msg => msg.topicId === topic.id);
      return convertChatTopicToChat(topic, topicMessages);
    });
    
    // Add a default chat for messages without a topic
    const untopicedMessages = messages.filter(msg => !msg.topicId);
    if (untopicedMessages.length > 0 || chats.length === 0) {
      chats.unshift({
        id: `chat-${case_.id}`,
        title: `${case_.title} Chat`,
        messages: untopicedMessages.map(convertMessageToUIMessage),
        createdAt: case_.createdAt,
      });
    }
  } else {
    // Fallback to single chat per case (existing behavior)
    chats = [{
      id: `chat-${case_.id}`,
      title: `${case_.title} Chat`,
      messages: messages.map(convertMessageToUIMessage),
      createdAt: case_.createdAt,
    }];
  }

  // Backend and frontend use the same status values now, but filter out 'Pending'
  return {
    id: case_.id.toString(),
    name: case_.title,
    priority: case_.priority,
    status: case_.status, // Status is now consistent (no Pending conversion needed)
    createdAt: case_.createdAt,
    chats,
    documents: documents.map(convertDocumentToUI),
  };
}

function convertDocumentToUI(doc: ApiDocument): Document {
  return {
    id: doc.id.toString(),
    name: doc.originalName || doc.fileName,
    type: doc.mimeType || 'application/octet-stream', // Fallback to generic type
    size: doc.fileSize,
    uploadedAt: doc.createdAt,
    content: doc.extractedText,
    processingStatus: doc.processingStatus,
    storagePath: doc.storagePath, // Include storagePath for direct access
  };
}

function convertMessageToUIMessage(msg: ChatMessage): Message {
  return {
    id: msg.id.toString(),
    content: msg.text,
    role: msg.sender === 'USER' ? 'user' : 'assistant',
    timestamp: msg.createdAt,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading: true
  const [error, setError] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState(0); // Force re-renders

  // Debug user state changes
  useEffect(() => {
    console.log('AppContext: User state changed to:', user);
    // Increment version when user changes to force component re-evaluation
    setContextVersion(prev => prev + 1);
  }, [user]);
  
  useEffect(() => {
    console.log('AppContext: Loading state changed to:', loading);
  }, [loading]);

  // Cache for tracking when chat topics were last loaded for each workspace
  const topicsCacheRef = useRef<Map<string, number>>(new Map());
  
  // Track ongoing requests to prevent concurrent calls
  const ongoingRequestsRef = useRef<Map<string, Promise<void>>>(new Map());

  const loadWorkspaces = useCallback(async () => {
    try {
      const cases = await apiService.getCases();
      const workspacesData = await Promise.all(
        cases.map(async (case_) => {
          try {
            const [documents, messages, topics] = await Promise.all([
              apiService.getCaseDocuments(case_.id),
              apiService.getChatMessages(case_.id),
              apiService.getChatTopics(case_.id),
            ]);
            
            // Update topics cache
            topicsCacheRef.current.set(case_.id.toString(), Date.now());
            
            return convertCaseToWorkspace(case_, documents, messages, topics);
          } catch (err) {
            console.error(`Error loading data for case ${case_.id}:`, err);
            return convertCaseToWorkspace(case_);
          }
        })
      );
      setWorkspaces(workspacesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    }
  }, []);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      console.log('AppContext: checkAuthAndLoadData starting...');
      setLoading(true);
      const currentUser = await apiService.getCurrentUser();
      console.log('AppContext: getCurrentUser result:', currentUser);
      
      if (currentUser) {
        console.log('AppContext: Setting user and loading workspaces...');
        setUser(currentUser);
        await loadWorkspaces();
        console.log('AppContext: checkAuthAndLoadData complete');
      } else {
        console.log('AppContext: No current user found');
      }
    } catch (err) {
      console.log('AppContext: User not authenticated:', err);
    } finally {
      setLoading(false);
    }
  }, [loadWorkspaces]);

  // Load initial data
  useEffect(() => {
    console.log('AppContext: useEffect triggered, calling checkAuthAndLoadData');
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('AppContext: Starting login...');
      const userData = await apiService.login(email, password);
      console.log('AppContext: Login successful, setting user:', userData);
      setUser(userData);
      console.log('AppContext: Loading workspaces...');
      await loadWorkspaces();
      console.log('AppContext: Login complete');
    } catch (err) {
      console.error('AppContext: Login error:', err);
      setError(parseErrorMessage(err instanceof Error ? err.message : 'Login failed'));
      throw err;
    } finally {
      console.log('AppContext: Setting loading to false');
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, phoneNumber?: string): Promise<{ message?: string; accountPending?: boolean; userEmail?: string } | void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.register(fullName, email, password, phoneNumber);
      
      // Check if the result has accountPending property (this means account is disabled)
      if (result && (result as any).accountPending === true) {
        // Account is pending, don't set user or load workspaces
        return result as { message: string; accountPending: boolean; userEmail: string };
      } else if (result && (result as any).user) {
        // Account was created and auto-logged in (likely admin user)
        setUser((result as any).user);
        await loadWorkspaces();
      } else {
        // Fallback: assume it's a user object if no accountPending
        setUser(result as AuthUser);
        await loadWorkspaces();
      }
    } catch (err) {
      const errorMessage = parseErrorMessage(err instanceof Error ? err.message : 'Registration failed');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentChat(null);
      // Clear topics cache and ongoing requests
      topicsCacheRef.current.clear();
      ongoingRequestsRef.current.clear();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const createWorkspace = async (title: string, priority: string = 'Normal', description?: string): Promise<Workspace> => {
    try {
      setLoading(true);
      const newCase = await apiService.createCase(title, priority, description);
      const newWorkspace = convertCaseToWorkspace(newCase);
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      // Automatically select the first (and usually only) chat
      if (workspace.chats.length > 0) {
        setCurrentChat(workspace.chats[0]);
      }
    }
  };

  const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>): Promise<void> => {
    try {
      const caseId = parseInt(workspaceId);
      
      await apiService.updateCase(caseId, {
        title: updates.name,
        description: updates.description,
        priority: updates.priority,
        status: updates.status, // Direct assignment since values match
      });
      
      setWorkspaces(prev => 
        prev.map(w => w.id === workspaceId ? { ...w, ...updates } : w)
      );
      
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
      throw err;
    }
  };

  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      const caseId = parseInt(workspaceId);
      await apiService.deleteCase(caseId);
      
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null);
        setCurrentChat(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      throw err;
    }
  };

  const createChat = async (workspaceId: string, title: string): Promise<Chat> => {
    // For this system, each case has one chat, so we return the existing chat
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace && workspace.chats.length > 0) {
      return workspace.chats[0];
    }
    
    // Create a new chat entry
    const newChat: Chat = {
      id: `chat-${workspaceId}`,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    
    return newChat;
  };

  const selectChat = async (chatId: string) => {
    // Find the chat across all workspaces
    for (const workspace of workspaces) {
      const chat = workspace.chats.find(c => c.id === chatId);
      if (chat) {
        setCurrentChat(chat);
        setCurrentWorkspace(workspace);
        
        // Load chat messages if chat has a topicId
        if (chat.topicId) {
          try {
            const caseId = parseInt(workspace.id);
            const allMessages = await apiService.getChatMessages(caseId, chat.topicId);
            const uiMessages = allMessages.map(convertMessageToUIMessage);
            
            // Update the chat with loaded messages
            const updatedChat = { ...chat, messages: uiMessages };
            setCurrentChat(updatedChat);
            
            // Update the workspace with the loaded messages
            setWorkspaces(prev => 
              prev.map(w => w.id === workspace.id ? {
                ...w,
                chats: w.chats.map(c => c.id === chatId ? updatedChat : c)
              } : w)
            );
          } catch (error) {
            console.error('Failed to load chat messages:', error);
          }
        }
        break;
      }
    }
  };

  const sendMessage = async (content: string): Promise<Message> => {
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    try {
      const caseId = parseInt(currentWorkspace.id);
      const topicId = currentChat?.topicId;
      
      // Send the message
      const response = await apiService.sendChatMessage(caseId, content, topicId);
      const userMessage = convertMessageToUIMessage(response);
      
      // Fetch the complete updated chat history to get both user and AI messages
      const allMessages = await apiService.getChatMessages(caseId, topicId);
      const uiMessages = allMessages.map(convertMessageToUIMessage);
      
      // If no current chat is selected, create one
      let targetChat = currentChat;
      if (!targetChat) {
        targetChat = {
          id: `chat-${currentWorkspace.id}`,
          title: `${currentWorkspace.name} Chat`,
          messages: uiMessages,
          createdAt: new Date().toISOString(),
        };
        setCurrentChat(targetChat);
      }
      
      // Update the workspace with all messages
      setWorkspaces(prev => 
        prev.map(w => w.id === currentWorkspace.id ? {
          ...w,
          chats: w.chats.length > 0 
            ? w.chats.map(c => c.id === targetChat!.id ? {
                ...c,
                messages: uiMessages
              } : c)
            : [{
                ...targetChat!,
                messages: uiMessages
              }]
        } : w)
      );
      
      // Update current chat with all messages
      setCurrentChat(prev => ({
        ...targetChat!,
        messages: uiMessages
      }));
      
      return userMessage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  };

  const uploadDocument = async (file: File): Promise<Document> => {
    if (!currentWorkspace) {
      throw new Error('No workspace selected');
    }

    try {
      setLoading(true);
      const caseId = parseInt(currentWorkspace.id);
      const apiDoc = await apiService.uploadDocument(caseId, file);
      
      const newDocument = convertDocumentToUI(apiDoc);
      
      // Update the current workspace with the new document
      setWorkspaces(prev => 
        prev.map(w => w.id === currentWorkspace.id ? {
          ...w,
          documents: [...w.documents, newDocument]
        } : w)
      );
      
      setCurrentWorkspace(prev => prev ? {
        ...prev,
        documents: [...prev.documents, newDocument]
      } : null);
      
      return newDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addDocumentToWorkspace = (document: Document) => {
    if (!currentWorkspace) {
      return;
    }

    // Update the current workspace with the new document without loading state
    setWorkspaces(prev => 
      prev.map(w => w.id === currentWorkspace.id ? {
        ...w,
        documents: [...w.documents, document]
      } : w)
    );
    
    setCurrentWorkspace(prev => prev ? {
      ...prev,
      documents: [...prev.documents, document]
    } : null);
  };

  const updateDocumentInWorkspace = (document: Document) => {
    if (!currentWorkspace) {
      return;
    }

    // Update the document in the current workspace
    setWorkspaces(prev => 
      prev.map(w => w.id === currentWorkspace.id ? {
        ...w,
        documents: w.documents.map(d => d.id === document.id ? document : d)
      } : w)
    );
    
    setCurrentWorkspace(prev => prev ? {
      ...prev,
      documents: prev.documents.map(d => d.id === document.id ? document : d)
    } : null);
  };

  const deleteDocument = async (documentId: string): Promise<void> => {
    try {
      const docId = parseInt(documentId);
      await apiService.deleteDocument(docId);
      
      // Remove the document from all workspaces
      setWorkspaces(prev => 
        prev.map(w => ({
          ...w,
          documents: w.documents.filter(d => d.id !== documentId)
        }))
      );
      
      if (currentWorkspace) {
        setCurrentWorkspace(prev => prev ? {
          ...prev,
          documents: prev.documents.filter(d => d.id !== documentId)
        } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    }
  };

  const refreshData = async (): Promise<void> => {
    if (user) {
      await loadWorkspaces();
    }
  };

  // Chat Topic methods
  const createChatTopic = async (workspaceId: string, title: string, description?: string): Promise<Chat> => {
    try {
      const caseId = parseInt(workspaceId);
      const newTopic = await apiService.createChatTopic(caseId, title, description);
      const newChat = convertChatTopicToChat(newTopic);
      
      // Update the workspace with the new chat
      setWorkspaces(prev => 
        prev.map(w => w.id === workspaceId ? {
          ...w,
          chats: [...w.chats, newChat]
        } : w)
      );
      
      // Update current workspace if it's the one we're adding to
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(prev => prev ? {
          ...prev,
          chats: [...prev.chats, newChat]
        } : null);
      }
      
      // Clear cache for this workspace since topics have changed
      topicsCacheRef.current.delete(workspaceId);
      ongoingRequestsRef.current.delete(workspaceId);
      
      return newChat;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat topic');
      throw err;
    }
  };

  const updateChatTopic = async (topicId: number, title?: string, description?: string): Promise<void> => {
    try {
      await apiService.updateChatTopic(topicId, title, description);
      
      // Find and update the chat in workspaces
      setWorkspaces(prev => 
        prev.map(workspace => ({
          ...workspace,
          chats: workspace.chats.map(chat => 
            chat.topicId === topicId ? {
              ...chat,
              title: title || chat.title
            } : chat
          )
        }))
      );
      
      // Update current workspace and chat if affected
      if (currentWorkspace) {
        const updatedWorkspace = {
          ...currentWorkspace,
          chats: currentWorkspace.chats.map(chat => 
            chat.topicId === topicId ? {
              ...chat,
              title: title || chat.title
            } : chat
          )
        };
        setCurrentWorkspace(updatedWorkspace);
        
        if (currentChat?.topicId === topicId) {
          setCurrentChat(prev => prev ? {
            ...prev,
            title: title || prev.title
          } : null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chat topic');
      throw err;
    }
  };

  const deleteChatTopic = async (topicId: number): Promise<void> => {
    try {
      await apiService.deleteChatTopic(topicId);
      
      // Remove the chat from workspaces
      setWorkspaces(prev => 
        prev.map(workspace => ({
          ...workspace,
          chats: workspace.chats.filter(chat => chat.topicId !== topicId)
        }))
      );
      
      // Clear cache for workspaces that had this topic
      workspaces.forEach(workspace => {
        if (workspace.chats.some(chat => chat.topicId === topicId)) {
          topicsCacheRef.current.delete(workspace.id);
          ongoingRequestsRef.current.delete(workspace.id);
        }
      });
      
      // Update current workspace
      if (currentWorkspace) {
        setCurrentWorkspace(prev => prev ? {
          ...prev,
          chats: prev.chats.filter(chat => chat.topicId !== topicId)
        } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat topic');
      throw err;
    }
  };

    const loadChatTopics = useCallback(async (workspaceId: string): Promise<void> => {
    // Check if there's already an ongoing request for this workspace
    const ongoingRequest = ongoingRequestsRef.current.get(workspaceId);
    if (ongoingRequest) {
      console.log(`Waiting for ongoing loadChatTopics request for workspace ${workspaceId}`);
      return ongoingRequest;
    }

    // Check cache to prevent duplicate calls within 30 seconds
    const lastLoaded = topicsCacheRef.current.get(workspaceId);
    const now = Date.now();
    if (lastLoaded && (now - lastLoaded) < 30000) {
      console.log(`Skipping loadChatTopics for workspace ${workspaceId} - recently loaded`);
      return;
    }

    // Immediately store a placeholder to prevent concurrent calls
    const placeholder = Promise.resolve();
    ongoingRequestsRef.current.set(workspaceId, placeholder);

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log(`Loading chat topics for workspace ${workspaceId}`);
        const caseId = parseInt(workspaceId);
        const topics = await apiService.getChatTopics(caseId);
        
        // Update cache
        topicsCacheRef.current.set(workspaceId, now);
        
        // Convert topics to chats and update the workspace
        const topicChats = topics.map(topic => convertChatTopicToChat(topic));
        
        setWorkspaces(prev => 
          prev.map(w => w.id === workspaceId ? {
            ...w,
            chats: [...w.chats.filter(c => !c.topicId), ...topicChats] // Keep non-topic chats, replace topic chats
          } : w)
        );
        
        // Update current workspace if it's the one we're loading topics for
        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace(prev => prev ? {
            ...prev,
            chats: [...prev.chats.filter(c => !c.topicId), ...topicChats]
          } : null);
        }
      } catch (err) {
        console.error(`Error loading chat topics for workspace ${workspaceId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load chat topics');
        throw err;
      } finally {
        // Remove from ongoing requests
        ongoingRequestsRef.current.delete(workspaceId);
      }
    })();

    // Replace placeholder with actual promise
    ongoingRequestsRef.current.set(workspaceId, requestPromise);
    
    return requestPromise;
  }, [currentWorkspace]);

  return (
    <AppContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        currentChat,
        loading,
        error,
        contextVersion,
        login,
        register,
        logout,
        createWorkspace,
        selectWorkspace,
        updateWorkspace,
        deleteWorkspace,
        createChat,
        selectChat,
        sendMessage,
        createChatTopic,
        updateChatTopic,
        deleteChatTopic,
        loadChatTopics,
        uploadDocument,
        addDocumentToWorkspace,
        updateDocumentInWorkspace,
        deleteDocument,
        refreshData,
        checkAuthAndLoadData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Legacy exports for backward compatibility
export const useWorkspace = useApp;
export const WorkspaceProvider = AppProvider;
