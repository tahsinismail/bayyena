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

interface WorkspaceDetailProps {
  workspaceId: string;
  onViewChange: (view: CurrentView) => void;
}

export function WorkspaceDetail({ workspaceId, onViewChange }: WorkspaceDetailProps) {
  const { 
    workspaces, 
    updateWorkspace, 
    deleteWorkspace,
    selectChat
  } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: 'High' | 'Normal' | 'Low';
  }>({
    title: '',
    description: '',
    priority: 'Normal'
  });

  const workspace = workspaces.find(w => w.id === workspaceId);

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Workspace not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditForm({
      title: workspace.name,
      description: workspace.description || '',
      priority: workspace.priority || 'Normal'
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;
    
    try {
      await updateWorkspace(workspace.id, {
        name: editForm.title,
        description: editForm.description,
        priority: editForm.priority
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

  const handleDocumentClick = (docId: string) => {
    // Open document in new tab if it has storagePath
    const doc = workspace.documents.find(d => d.id === docId);
    if (doc?.storagePath) {
      const documentUrl = doc.storagePath.startsWith('/') ? doc.storagePath : `/${doc.storagePath}`;
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleChatTopicClick = (chatId: string) => {
    selectChat(chatId);
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

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Workspace Details</h1>
        </div>

        {/* Workspace Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <MdFolder className="h-5 w-5" />
              Workspace Information
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <MdEdit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <MdDelete className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{workspace.name}</h3>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{workspace.documents.length}</div>
                <div className="text-sm text-muted-foreground">Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {workspace.documents.filter(d => d.processingStatus === 'PROCESSED').length}
                </div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{workspace.chats.length}</div>
                <div className="text-sm text-muted-foreground">Chat Topics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {workspace.chats.filter(c => c.topicId).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Chats</div>
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
                Documents ({workspace.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.documents.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workspace.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleDocumentClick(doc.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MdDescription className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={doc.processingStatus === 'PROCESSED' ? 'default' : 'secondary'}
                        className="flex-shrink-0"
                      >
                        {doc.processingStatus}
                      </Badge>
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
                Chat Topics ({workspace.chats.filter(c => c.topicId).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.chats.filter(c => c.topicId).length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workspace.chats.filter(c => c.topicId).map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleChatTopicClick(chat.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MdTopic className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{chat.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {chat.messages.length} messages
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        Active
                      </Badge>
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
                <div className="mt-1">
                  <select 
                    value={editForm.priority} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as 'High' | 'Normal' | 'Low' }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
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
              <DialogTitle>Delete Workspace</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;{workspace.name}&rdquo;?
                <br />
                <span className="text-red-600 font-medium">
                  This will permanently delete all associated chat topics, documents, and conversations.
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
