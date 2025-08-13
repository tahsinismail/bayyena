// frontend/src/api/index.ts

import axios from 'axios';
import type { Case, Document, Message, CaseTimelineEvent, CreateTimelineEventRequest, UpdateTimelineEventRequest } from '../types';

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
export const createCase = (data: { title?: string; description?: string; type: string }) => apiClient.post<Case>('/cases', data);
export const updateCaseStatus = (caseId: string, status: string) => apiClient.patch<Case>(`/cases/${caseId}/status`, { status });
export const updateCase = (caseId: string, data: { title?: string; description?: string; type?: string }) => apiClient.patch<Case>(`/cases/${caseId}`, data);
export const autoGenerateCaseData = (caseId: string) => apiClient.post<{ case: Case; generated: { title: string; description: string; type: string } }>(`/cases/${caseId}/auto-generate`);
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

// --- Timeline Routes ---
export const getTimelineEvents = (caseId: string) => apiClient.get<CaseTimelineEvent[]>(`/cases/${caseId}/timeline`);
export const createTimelineEvent = (caseId: string, data: CreateTimelineEventRequest) => apiClient.post<CaseTimelineEvent>(`/cases/${caseId}/timeline`, data);
export const updateTimelineEvent = (caseId: string, eventId: number, data: UpdateTimelineEventRequest) => apiClient.put<CaseTimelineEvent>(`/cases/${caseId}/timeline/${eventId}`, data);
export const deleteTimelineEvent = (caseId: string, eventId: number) => apiClient.delete(`/cases/${caseId}/timeline/${eventId}`);

// --- Document Timeline Routes ---
export const getDocumentTimelineEvents = (caseId: string, documentId: string) => apiClient.get<CaseTimelineEvent[]>(`/cases/${caseId}/documents/${documentId}/timeline`);
export const createDocumentTimelineEvent = (caseId: string, documentId: string, data: CreateTimelineEventRequest) => apiClient.post<CaseTimelineEvent>(`/cases/${caseId}/documents/${documentId}/timeline`, data);
export const updateDocumentTimelineEvent = (caseId: string, documentId: string, eventId: number, data: UpdateTimelineEventRequest) => apiClient.put<CaseTimelineEvent>(`/cases/${caseId}/documents/${documentId}/timeline/${eventId}`, data);
export const deleteDocumentTimelineEvent = (caseId: string, documentId: string, eventId: number) => apiClient.delete(`/cases/${caseId}/documents/${documentId}/timeline/${eventId}`);

// --- Server Capabilities ---
export const checkServerCapabilities = () => apiClient.get('/server/capabilities');
export default apiClient;
