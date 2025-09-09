"use client";

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
import { useApp, Document } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentPreview } from "@/components/DocumentPreview";
import { 
  MdHome, 
  MdWorkspaces, 
  MdSettings, 
  MdAdd, 
  MdDescription,
  MdArrowBack,
  MdTopic
} from "react-icons/md";
import { useState, useEffect } from "react";
import type { CurrentView } from "@/components/MainLayout";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: CurrentView;
  onViewChange: (view: CurrentView) => void;
}

export function Sidebar({ isOpen, onClose, currentView, onViewChange }: SidebarProps) {
  const { 
    workspaces, 
    currentWorkspace, 
    selectWorkspace, 
    selectChat,
    createChatTopic,
    createWorkspace,
    loadChatTopics,
    user,
  } = useApp();
  const { language, t, dir } = useLanguage();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isCreatingChatTopic, setIsCreatingChatTopic] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [sidebarView, setSidebarView] = useState<'workspaces' | 'workspace-detail'>('workspaces');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  
  // Dialog states and form data
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [showChatTopicDialog, setShowChatTopicDialog] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({
    title: '',
    description: '',
    priority: 'Normal' as string
  });
  const [chatTopicForm, setChatTopicForm] = useState({
    title: '',
    description: ''
  });

  // Sync sidebar state with currentView changes from outside navigation
  useEffect(() => {
    if (currentView.type === 'workspace') {
      setSidebarView('workspace-detail');
      setSelectedWorkspaceId(currentView.workspaceId);
      // Load chat topics for this workspace if not already loaded
      loadChatTopics(currentView.workspaceId);
    } else if (currentView.type === 'chat') {
      // Find the workspace that contains this chat
      const workspaceWithChat = workspaces.find(w =>
        w.chats.some(chat => chat.id === currentView.chatId)
      );
      if (workspaceWithChat) {
        setSidebarView('workspace-detail');
        setSelectedWorkspaceId(workspaceWithChat.id);
        // Load chat topics for this workspace if not already loaded
        loadChatTopics(workspaceWithChat.id);
      } else {
        setSidebarView('workspaces');
        setSelectedWorkspaceId(null);
      }
    } else {
      setSidebarView('workspaces');
      setSelectedWorkspaceId(null);
    }
  }, [currentView, loadChatTopics, workspaces]);

  // Handle document click - open in new tab
  const handleDocumentClick = (doc: Document) => {
    console.log('Document clicked:', doc);
    // Always use the preview modal for better UX and proper API integration
    setPreviewDocument(doc);
  };

  const selectedWorkspace = selectedWorkspaceId ? workspaces.find(w => w.id === selectedWorkspaceId) : null;

  const priorityLevels = [
    'High',
    'Normal',
    'Low'
  ];

  const handleCreateWorkspace = async () => {
    if (!workspaceForm.title.trim()) return;
    
    setIsCreatingWorkspace(true);
    try {
      await createWorkspace(workspaceForm.title, workspaceForm.priority, workspaceForm.description);
      setShowWorkspaceDialog(false);
      setWorkspaceForm({ title: '', description: '', priority: 'Normal' });
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setSidebarView('workspace-detail');
    selectWorkspace(workspaceId);
    // Load chat topics for this workspace
    loadChatTopics(workspaceId);
    // Navigate to workspace view
    onViewChange({ type: 'workspace', workspaceId });
    onClose();
  };

  const handleBackToWorkspaces = () => {
    setSidebarView('workspaces');
    setSelectedWorkspaceId(null);
    // Navigate back to dashboard
    onViewChange({ type: 'dashboard' });
  };

  const handleCreateChatTopic = async () => {
    if (!selectedWorkspace || !chatTopicForm.title.trim()) return;
    
    setIsCreatingChatTopic(true);
    try {
      await createChatTopic(selectedWorkspace.id, chatTopicForm.title, chatTopicForm.description);
      setShowChatTopicDialog(false);
      setChatTopicForm({ title: '', description: '' });
      // Reload chat topics to ensure sidebar is updated
      await loadChatTopics(selectedWorkspace.id);
    } finally {
      setIsCreatingChatTopic(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-background border-r border-border
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {sidebarView === 'workspaces' ? (
              // Workspaces List View
              <>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start gap-3 ${language === 'ar' ? 'text-arabic' : ''}`}
                  onClick={() => {
                    onViewChange({ type: 'dashboard' });
                    onClose();
                  }}
                >
                  <MdHome className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Button>
                
                {/* Workspaces Section */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {t('nav.workspaces')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowWorkspaceDialog(true)}
                      disabled={isCreatingWorkspace}
                      className="h-6 w-6 p-0"
                    >
                      <MdAdd className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    {workspaces.map((workspace) => (
                      <Button
                        key={workspace.id}
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => handleWorkspaceClick(workspace.id)}
                      >
                        <MdWorkspaces className="h-4 w-4" />
                        <span className="truncate">{workspace.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Workspace Detail View
              selectedWorkspace && (
                <>
                  {/* Back Button */}
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start gap-3 ${language === 'ar' ? 'text-arabic' : ''}`}
                    onClick={handleBackToWorkspaces}
                  >
                    <MdArrowBack className="h-4 w-4" />
                    {t('nav.back')}
                  </Button>
                  
                  {/* Workspace Title */}
                  <div className="py-2">
                    <h2 className="text-lg font-semibold text-foreground truncate">
                      {selectedWorkspace.name}
                    </h2>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
                      {t('nav.priority')}: {selectedWorkspace.priority || 'Normal'}
                    </p>
                  </div>

                  {/* Chat Topics Section */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium text-muted-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>{t('nav.chatTopics')}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowChatTopicDialog(true)}
                        disabled={isCreatingChatTopic}
                        className="h-6 w-6 p-0"
                      >
                        <MdAdd className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {selectedWorkspace.chats.filter(chat => chat.topicId).map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-xs"
                          onClick={async () => {
                            await selectChat(chat.id);
                            onViewChange({ type: 'chat', chatId: chat.id });
                            onClose();
                          }}
                        >
                          <MdTopic className="h-3 w-3" />
                          <span className="truncate">{chat.title}</span>
                        </Button>
                      ))}
                      {selectedWorkspace.chats.filter(chat => chat.topicId).length === 0 && (
                        <p className={`text-xs text-muted-foreground px-2 ${language === 'ar' ? 'text-arabic' : ''}`}>{t('nav.noChatTopics')}</p>
                      )}
                    </div>
                  </div>

                  {/* Documents Section */}
                  {selectedWorkspace.documents.length > 0 && (
                    <div className="pt-4">
                      <div className={`text-sm font-medium text-muted-foreground mb-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
                        {t('nav.documentsCount')} ({selectedWorkspace.documents.length})
                      </div>
                      <div className="space-y-1">
                        {selectedWorkspace.documents.slice(0, 8).map((doc) => (
                          <Button
                            key={doc.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 text-xs"
                            onClick={() => handleDocumentClick(doc)}
                          >
                            <MdDescription className="h-3 w-3" />
                            <span className="truncate">{doc.name}</span>
                          </Button>
                        ))}
                        {selectedWorkspace.documents.length > 8 && (
                          <div className={`text-xs text-muted-foreground px-2 ${language === 'ar' ? 'text-arabic' : ''}`}>
                            +{selectedWorkspace.documents.length - 8} {t('nav.moreDocuments')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )
            )}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-border space-y-2">
          <Button 
            variant="ghost" 
            className={`w-full justify-start gap-3 ${language === 'ar' ? 'text-arabic' : ''}`}
            onClick={() => {
              onViewChange({ type: 'settings' });
              onClose();
            }}
          >
            <MdSettings className="h-4 w-4" />
            {t('nav.settings')}
          </Button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview 
          document={previewDocument} 
          workspaceId={currentWorkspace?.id}
          onClose={() => setPreviewDocument(null)} 
        />
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new legal case workspace to organize your documents and conversations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="workspace-title" className="text-sm font-medium mb-2 block">
                Workspace Title *
              </label>
              <Input
                id="workspace-title"
                placeholder="Enter workspace title..."
                value={workspaceForm.title}
                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="workspace-priority" className="text-sm font-medium mb-2 block">
                Priority Level
              </label>
              <select
                id="workspace-priority"
                value={workspaceForm.priority}
                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full h-9 px-3 py-1 text-sm border border-input bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {priorityLevels.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="workspace-description" className="text-sm font-medium mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                id="workspace-description"
                placeholder="Brief description of the case..."
                value={workspaceForm.description}
                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-20"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowWorkspaceDialog(false)}
              disabled={isCreatingWorkspace}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkspace}
              disabled={isCreatingWorkspace || !workspaceForm.title.trim()}
            >
              {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Chat Topic Dialog */}
      <Dialog open={showChatTopicDialog} onOpenChange={setShowChatTopicDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chat Topic</DialogTitle>
            <DialogDescription>
              Create a new conversation topic for AI assistance and discussion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="topic-title" className="text-sm font-medium mb-2 block">
                Topic Title *
              </label>
              <Input
                id="topic-title"
                placeholder="Enter topic title..."
                value={chatTopicForm.title}
                onChange={(e) => setChatTopicForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="topic-description" className="text-sm font-medium mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                id="topic-description"
                placeholder="Brief description of what you want to discuss..."
                value={chatTopicForm.description}
                onChange={(e) => setChatTopicForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-20"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowChatTopicDialog(false)}
              disabled={isCreatingChatTopic}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChatTopic}
              disabled={isCreatingChatTopic || !chatTopicForm.title.trim()}
            >
              {isCreatingChatTopic ? 'Creating...' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
