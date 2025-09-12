"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MdEdit, 
  MdDelete, 
  MdDescription, 
  MdTopic,
  MdFolder,
  MdChat,
  MdLowPriority,
  MdCheckCircle
} from "react-icons/md";
import type { CurrentView } from "@/components/MainLayout";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Document } from "@/contexts/AppContext";

interface WorkspaceDetailProps {
  workspaceId: string;
  onViewChange: (view: CurrentView) => void;
}

export function WorkspaceDetail({ workspaceId, onViewChange }: WorkspaceDetailProps) {
  const { 
    workspaces, 
    updateWorkspace, 
    deleteWorkspace,
    deleteChatTopic,
    deleteDocument,
    selectChat
  } = useApp();
  const { language, t, dir } = useLanguage();
  
  // Helper function to get proper text direction classes for UI text (translations)
  const getUITextClasses = () => {
    return language === 'ar' ? 'text-arabic' : 'text-english';
  };
  
  // Helper function for user content (workspace names, descriptions, etc.)
  const getUserContentClasses = (content: string) => {
    // Detect if content is primarily Arabic
    const arabicRegex = /[\u0600-\u06FF]/;
    const isArabicContent = arabicRegex.test(content);
    return isArabicContent ? 'text-arabic' : 'text-english';
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'workspace' | 'chatTopic' | 'document';
    id: string | number;
    title: string;
  } | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: 'High' | 'Normal' | 'Low';
    status: 'Open' | 'Closed' | 'Archived';
  }>({
    title: '',
    description: '',
    priority: 'Normal',
    status: 'Open'
  });

  const workspace = workspaces.find(w => w.id === workspaceId);

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-muted-foreground">Workspace not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditForm({
      title: workspace.name,
      description: workspace.description || '',
      priority: workspace.priority || 'Normal',
      status: workspace.status || 'Open'
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;
    
    try {
      await updateWorkspace(workspace.id, {
        name: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        status: editForm.status
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  };

  const handleDeleteChatTopic = (chat: { topicId?: number; title: string }) => {
    if (!chat.topicId) return;
    setDeleteTarget({
      type: 'chatTopic',
      id: chat.topicId,
      title: chat.title
    });
    setShowDeleteDialog(true);
  };

  const handleDeleteDocument = (doc: { id: string; name: string }) => {
    setDeleteTarget({
      type: 'document',
      id: doc.id,
      title: doc.name
    });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'workspace') {
        await deleteWorkspace(deleteTarget.id as string);
        onViewChange({ type: 'dashboard' });
      } else if (deleteTarget.type === 'chatTopic') {
        await deleteChatTopic(deleteTarget.id as number);
      } else if (deleteTarget.type === 'document') {
        await deleteDocument(deleteTarget.id as string);
      }
      
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDocumentClick = (docId: string) => {
    // Open document in preview modal instead of directly via storagePath
    const doc = workspace.documents.find(d => d.id === docId);
    if (doc) {
      setPreviewDocument(doc);
    }
  };

  const handleChatTopicClick = async (chatId: string) => {
    await selectChat(chatId);
    onViewChange({ type: 'chat', chatId });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'archived': return 'secondary';
      case 'completed': return 'secondary';
      default: return 'default';
    }
  };

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="h-full p-4 sm:p-6 lg:p-8 bg-background">
      <div className="max-w-7xl mx-auto h-full">
        <div className="flex flex-col h-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight text-foreground ${getUITextClasses()}`}>
              {t('workspace.details.title')}
            </h1>
          </div>

          <div className="flex-1 min-h-0 space-y-6">

        {/* Workspace Info Card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-xl font-semibold flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
              <MdFolder className="h-5 w-5" />
              {t('workspace.details.information')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <MdEdit className="h-4 w-4 mr-2" />
                {t('workspace.details.edit')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                setDeleteTarget({
                  type: 'workspace',
                  id: workspace.id,
                  title: workspace.name
                });
                setShowDeleteDialog(true);
              }}>
                <MdDelete className="h-4 w-4 mr-2" />
                {t('workspace.details.delete')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className={`text-2xl font-bold text-foreground ${getUserContentClasses(workspace.name)}`}>
                {workspace.name}
              </h3>
              {workspace.description && (
                <p className={`text-muted-foreground mt-2 ${getUserContentClasses(workspace.description)}`}>
                  {workspace.description}
                </p>
              )}
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <MdLowPriority className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${getUITextClasses()}`}>
                  {t('workspace.details.priority')}:
                </span>
                <Badge variant={getPriorityColor(workspace.priority || 'Normal')}>
                  {t(`workspace.details.priorityLevels.${(workspace.priority || 'Normal').toLowerCase()}`)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <MdCheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${getUITextClasses()}`}>
                  {t('workspace.details.status')}:
                </span>
                <Badge variant={getStatusColor(workspace.status || 'Active')}>
                  {t(`workspace.details.statusTypes.${(workspace.status || 'Active').toLowerCase()}`)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents and Chat Topics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
                <MdDescription className="h-5 w-5" />
                {t('workspace.details.documents.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.documents.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workspace.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex flex-col md:flex-row items-start md:items-center gap-3 min-w-0 max-w-full flex-1 cursor-pointer"
                        onClick={() => handleDocumentClick(doc.id)}
                      >
                        <MdDescription className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 max-w-full flex-1 flex-wrap">
                          <p className={`font-medium truncate ${language === 'ar' ? 'text-arabic' : ''}`}>
                            {doc.name}
                          </p>
                          <div className={`flex items-center gap-2 text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span>{t('workspace.details.documents.uploaded')} {formatDateTime(doc.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={doc.processingStatus === 'PROCESSED' ? 'default' : 'secondary'}
                          className="flex-shrink-0"
                        >
                          {t(`workspace.details.documents.status.${(doc.processingStatus || 'pending').toLowerCase()}`)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <MdDelete className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MdDescription className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className={language === 'ar' ? 'text-arabic' : ''}>{t('workspace.details.documents.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Topics Card */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
                <MdChat className="h-5 w-5" />
                {t('workspace.details.chatTopics.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.chats.filter(c => c.topicId).length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workspace.chats.filter(c => c.topicId).map((chat) => (
                    <div
                      key={chat.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex flex-col md:flex-row items-start md:items-center gap-3 min-w-0 max-w-full flex-1 cursor-pointer"
                        onClick={() => handleChatTopicClick(chat.id)}
                      >
                        <MdTopic className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 max-w-full flex-1 flex-wrap">
                          <p className={`font-medium truncate ${language === 'ar' ? 'text-arabic' : ''}`}>
                            {chat.title}
                          </p>
                          <div className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                            <span>{t('workspace.details.chatTopics.lastConversation')}: {formatDateTime(chat.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex-shrink-0">
                          {t('workspace.details.chatTopics.active')}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChatTopic(chat);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <MdDelete className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MdChat className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className={language === 'ar' ? 'text-arabic' : ''}>{t('workspace.details.chatTopics.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={language === 'ar' ? 'text-arabic' : ''}>{t('workspace.details.edit')}</DialogTitle>
              <DialogDescription className={language === 'ar' ? 'text-arabic' : ''}>
                {t('workspace.details.editDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('workspace.details.form.title')}
                </label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('workspace.details.form.titlePlaceholder')}
                />
              </div>
              
              <div>
                <label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('workspace.details.form.description')}
                </label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('workspace.details.form.descriptionPlaceholder')}
                  rows={3}
                />
              </div>
              
              <div>
                <label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('workspace.details.form.priority')}
                </label>
                <Select value={editForm.priority} onValueChange={(value: 'High' | 'Normal' | 'Low') => setEditForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('workspace.details.form.selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">{t('workspace.details.priorityLevels.high')}</SelectItem>
                    <SelectItem value="Normal">{t('workspace.details.priorityLevels.normal')}</SelectItem>
                    <SelectItem value="Low">{t('workspace.details.priorityLevels.low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className={`text-sm font-medium ${language === 'ar' ? 'text-arabic' : ''}`}>
                  {t('workspace.details.form.status')}
                </label>
                <Select value={editForm.status} onValueChange={(value: 'Open' | 'Closed' | 'Archived') => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('workspace.details.form.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">{t('workspace.details.statusTypes.open')}</SelectItem>
                    <SelectItem value="Closed">{t('workspace.details.statusTypes.closed')}</SelectItem>
                    <SelectItem value="Archived">{t('workspace.details.statusTypes.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                {t('workspace.details.form.cancel')}
              </Button>
              <Button onClick={handleSaveEdit}>
                {t('workspace.details.form.saveChanges')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={language === 'ar' ? 'text-arabic' : ''}>{t('workspace.details.deleteConfirmation.confirmTitle')} {deleteTarget?.type === 'workspace' ? t('workspace.details.deleteConfirmation.workspace') : 
                              deleteTarget?.type === 'chatTopic' ? t('workspace.details.deleteConfirmation.chatTopic') : t('workspace.details.deleteConfirmation.document')}</DialogTitle>
              <DialogDescription className={language === 'ar' ? 'text-arabic' : ''}>
                {deleteTarget?.type === 'workspace' ? (
                  <>
                    {t('workspace.details.deleteConfirmation.workspaceConfirm')} &ldquo;{deleteTarget.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      {t('workspace.details.deleteConfirmation.workspaceWarning')}
                    </span>
                  </>
                ) : deleteTarget?.type === 'chatTopic' ? (
                  <>
                    {t('workspace.details.deleteConfirmation.chatTopicConfirm')} &ldquo;{deleteTarget.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      {t('workspace.details.deleteConfirmation.chatTopicWarning')}
                    </span>
                  </>
                ) : (
                  <>
                    {t('workspace.details.deleteConfirmation.documentConfirm')} &ldquo;{deleteTarget?.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      {t('workspace.details.deleteConfirmation.documentWarning')}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteTarget(null);
                }}
              >
                {t('workspace.details.form.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t('workspace.details.deleteConfirmation.action')} {deleteTarget?.type === 'workspace' ? t('workspace.details.deleteConfirmation.workspace') : 
                       deleteTarget?.type === 'chatTopic' ? t('workspace.details.deleteConfirmation.topic') : t('workspace.details.deleteConfirmation.document')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Document Preview Modal */}
        {previewDocument && (
          <DocumentPreview
            document={previewDocument}
            workspaceId={workspaceId}
            onClose={() => setPreviewDocument(null)}
          />
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
