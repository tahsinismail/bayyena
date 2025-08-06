// frontend/src/api/index.ts

import axios from 'axios';
import type { Case, Document, Message } from '../types';

// --- Axios Instance ---
const apiClient = axios.create({
    baseURL: '/api', // All requests will be prefixed with /api
    headers: {
        'Content-Type': 'application/json',
    }
});

// --- Auth Routes ---
export const checkAuthStatus = () => apiClient.get('/auth/status');

// --- Case Routes ---
export const getCases = () => apiClient.get<Case[]>('/cases');
export const getCaseById = (caseId: string) => apiClient.get<Case>(`/cases/${caseId}`);
export const createCase = (data: { title: string; description?: string; type: string }) => apiClient.post<Case>('/cases', data);
export const deleteCase = (caseId: string) => apiClient.delete(`/cases/${caseId}`);

// --- Document Routes ---
export const getDocumentsForCase = (caseId: string) => apiClient.get<Document[]>(`/cases/${caseId}/documents`);
export const uploadDocument = (caseId: string, formData: FormData, onUploadProgress: (progress: number) => void) => {
    return apiClient.post<Document>(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            onUploadProgress(percentCompleted);
        }
    });
};
export const deleteDocument = (caseId: string, docId: number) => apiClient.delete(`/cases/${caseId}/documents/${docId}`);

// --- Chat Routes ---
export const postChatMessage = (caseId: string, message: string) => apiClient.post<{ answer: string }>(`/chat/${caseId}`, { message });
export const getChatHistory = (caseId: string) => apiClient.get<Message[]>(`/chat/${caseId}/history`);
export const clearChatHistory = (caseId: string) => apiClient.delete(`/chat/${caseId}/history`);
export const getDocumentById = (docId: string) => apiClient.get<Document>(`/documents/${docId}`);
export default apiClient;
