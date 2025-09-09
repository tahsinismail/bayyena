// API service for backend integration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

export interface Case {
  id: number;
  title: string;
  description?: string;
  priority: 'High' | 'Normal' | 'Low';
  status: 'Open' | 'Closed' | 'Archived';
  caseNumber: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

export interface ChatMessage {
  id: number;
  caseId: number;
  topicId?: number; // Optional for chat topics
  sender: 'USER' | 'AI';
  text: string;
  createdAt: string;
}

export interface ChatTopic {
  id: number;
  caseId: number;
  title: string;
  description?: string;
  userId: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Document {
  id: number;
  caseId: number;
  fileName: string;
  originalName: string;
  mimeType: string | null | undefined; // Make it nullable to handle API edge cases
  fileSize: number;
  extractedText?: string;
  processingStatus: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  storagePath?: string; // Added for direct document access
}

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  isActive: number;
}

class ApiService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      credentials: 'include', // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response;
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Login failed');
    }

    return response.json();
  }

  async register(fullName: string, email: string, password: string, phoneNumber?: string): Promise<AuthUser | { message: string; accountPending: boolean; userEmail: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, phoneNumber }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || 'Registration failed');
      } catch (parseError) {
        throw new Error(errorText || 'Registration failed');
      }
    }

    const data = await response.json();
    return data;
  }

  async logout(): Promise<void> {
    await this.fetchWithAuth('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.fetchWithAuth('/auth/status');
      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  }

  // Case methods (mapped to workspace concept in UI)
  async getCases(): Promise<Case[]> {
    const response = await this.fetchWithAuth('/cases');
    return response.json();
  }

  async getDashboardStats(): Promise<{
    totalCases: number;
    casesByPriority: {
      high: number;
      normal: number;
      low: number;
    };
    casesByStatus: {
      open: number;
      closed: number;
    };
    totalDocuments: number;
    processedDocuments: number;
    recentActivity: {
      recentCases: number;
      recentMessages: number;
    };
  }> {
    const response = await this.fetchWithAuth('/cases/dashboard-stats');
    return response.json();
  }

  async createCase(title: string, priority: string = 'Normal', description?: string): Promise<Case> {
    const response = await this.fetchWithAuth('/cases', {
      method: 'POST',
      body: JSON.stringify({ title, priority, description }),
    });
    return response.json();
  }

  async getCase(caseId: number): Promise<Case> {
    const response = await this.fetchWithAuth(`/cases/${caseId}`);
    return response.json();
  }

  async updateCase(caseId: number, updates: Partial<Case>): Promise<Case> {
    const response = await this.fetchWithAuth(`/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  async deleteCase(caseId: number): Promise<void> {
    await this.fetchWithAuth(`/cases/${caseId}`, { method: 'DELETE' });
  }

  // Chat methods
  async getChatMessages(caseId: number, topicId?: number): Promise<ChatMessage[]> {
    const url = topicId 
      ? `/chat/${caseId}/history?topicId=${topicId}`
      : `/chat/${caseId}/history`;
    const response = await this.fetchWithAuth(url);
    return response.json();
  }

  async sendChatMessage(caseId: number, message: string, topicId?: number): Promise<ChatMessage> {
    const body = topicId 
      ? JSON.stringify({ message, topicId })
      : JSON.stringify({ message });
    const response = await this.fetchWithAuth(`/chat/${caseId}`, {
      method: 'POST',
      body,
    });
    return response.json();
  }

  // Chat Topics methods
  async getChatTopics(caseId: number): Promise<ChatTopic[]> {
    const response = await this.fetchWithAuth(`/chat-topics/${caseId}`);
    return response.json();
  }

  async createChatTopic(caseId: number, title: string, description?: string): Promise<ChatTopic> {
    const response = await this.fetchWithAuth(`/chat-topics/${caseId}`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    return response.json();
  }

  async updateChatTopic(topicId: number, title?: string, description?: string): Promise<ChatTopic> {
    const body: any = {};
    if (title !== undefined) body.title = title;
    if (description !== undefined) body.description = description;
    
    const response = await this.fetchWithAuth(`/chat-topics/topic/${topicId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async deleteChatTopic(topicId: number): Promise<void> {
    await this.fetchWithAuth(`/chat-topics/topic/${topicId}`, { method: 'DELETE' });
  }

  // Document methods
  async getCaseDocuments(caseId: number): Promise<Document[]> {
    const response = await this.fetchWithAuth(`/cases/${caseId}/documents`);
    return response.json();
  }

  async uploadDocument(caseId: number, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/documents`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    // Backend returns { message: "...", document: {...} }, but we need just the document
    return result.document;
  }

  async getDocumentStatus(caseId: number, documentId: number): Promise<Document> {
    const response = await this.fetchWithAuth(`/cases/${caseId}/documents/${documentId}`);
    return response.json();
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.fetchWithAuth(`/documents/${documentId}`, { method: 'DELETE' });
  }

  // Server capabilities
  async getServerCapabilities() {
    const response = await this.fetchWithAuth('/server/capabilities');
    return response.json();
  }

  // Supported file types
  async getSupportedFileTypes() {
    const response = await this.fetchWithAuth('/upload/supported-types');
    return response.json();
  }

  // Admin methods
  async getUsers(): Promise<any[]> {
    const response = await this.fetchWithAuth('/admin/users');
    return response.json();
  }

  async getUserDetails(userId: number): Promise<any> {
    const response = await this.fetchWithAuth(`/admin/users/${userId}`);
    return response.json();
  }

  async updateUserRole(userId: number, role: 'user' | 'admin'): Promise<void> {
    await this.fetchWithAuth(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async toggleUserStatus(userId: number, isActive: boolean): Promise<void> {
    await this.fetchWithAuth(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: isActive ? 1 : 0 }),
    });
  }

  async deleteUser(userId: number): Promise<void> {
    await this.fetchWithAuth(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
