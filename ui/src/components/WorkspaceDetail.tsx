"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
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
import { Document, Chat } from "@/contexts/AppContext";

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

  const handleDelete = async () => {
    try {
      await deleteWorkspace(workspace.id);
      setShowDeleteDialog(false);
      // Navigate back to dashboard
      onViewChange({ type: 'dashboard' });
    } catch (error) {
      console.error('Failed to delete workspace:', error);
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
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace Details</h1>
        </div>

        {/* Workspace Info Card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MdFolder className="h-5 w-5" />
              Workspace Information
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <MdEdit className="h-4 w-4 mr-2" />
                Edit
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
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{workspace.name}</h3>
              {workspace.description && (
                <p className="text-muted-foreground mt-2">{workspace.description}</p>
              )}
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <MdLowPriority className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Priority:</span>
                <Badge variant={getPriorityColor(workspace.priority || 'Normal')}>
                  {workspace.priority || 'Normal'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <MdCheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusColor(workspace.status || 'Active')}>
                  {workspace.status || 'Active'}
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
              <CardTitle className="flex items-center gap-2">
                <MdDescription className="h-5 w-5" />
                Documents
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
                          <p className="font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span>Uploaded {formatDateTime(doc.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={doc.processingStatus === 'PROCESSED' ? 'default' : 'secondary'}
                          className="flex-shrink-0"
                        >
                          {doc.processingStatus}
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
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Topics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MdChat className="h-5 w-5" />
                Chat Topics
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
                          <p className="font-medium truncate">{chat.title}</p>
                          <div className="text-sm text-muted-foreground">
                            <span>Last conversation: {formatDateTime(chat.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex-shrink-0">
                          Active
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
                  <p>No chat topics created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Workspace</DialogTitle>
              <DialogDescription>
                Update workspace information
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Workspace title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Workspace description"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={editForm.priority} onValueChange={(value: 'High' | 'Normal' | 'Low') => setEditForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(value: 'Open' | 'Closed' | 'Archived') => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Confirm Delete {deleteTarget?.type === 'workspace' ? 'Workspace' : 
                              deleteTarget?.type === 'chatTopic' ? 'Chat Topic' : 'Document'}
              </DialogTitle>
              <DialogDescription>
                {deleteTarget?.type === 'workspace' ? (
                  <>
                    Are you sure you want to delete the workspace &ldquo;{deleteTarget.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      This will permanently delete all associated chat topics, documents, and conversations.
                    </span>
                  </>
                ) : deleteTarget?.type === 'chatTopic' ? (
                  <>
                    Are you sure you want to delete the chat topic &ldquo;{deleteTarget.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      This will permanently delete all messages in this conversation.
                    </span>
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the document &ldquo;{deleteTarget?.title}&rdquo;?
                    <br />
                    <span className="text-red-600 font-medium">
                      This action cannot be undone.
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
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete {deleteTarget?.type === 'workspace' ? 'Workspace' : 
                       deleteTarget?.type === 'chatTopic' ? 'Topic' : 'Document'}
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
  );
}
