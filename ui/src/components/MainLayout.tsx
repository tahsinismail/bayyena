"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { FloatingControls } from "@/components/FloatingControls";
import { MobileTopBar } from "@/components/MobileTopBar";
import { Dashboard } from "@/components/Dashboard";
import { ChatInterface } from "@/components/ChatInterface";
import { WorkspaceDetail } from "@/components/WorkspaceDetail";
import { Settings } from "@/components/Settings";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export type CurrentView = 
  | { type: 'dashboard' }
  | { type: 'workspace'; workspaceId: string }
  | { type: 'chat'; chatId: string }
  | { type: 'settings' }
  | { type: 'admin' };

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CurrentView>({ type: 'dashboard' });
  const { currentWorkspace, currentChat, user, loading } = useApp();
  
  console.log('MainLayout: Rendering with currentView:', currentView, 'user:', user, 'loading:', loading);

  const renderMainContent = () => {
    if (children) {
      return children;
    }

    switch (currentView.type) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      
      case 'workspace':
        return (
          <WorkspaceDetail 
            workspaceId={currentView.workspaceId} 
            onViewChange={setCurrentView}
          />
        );
      
      case 'chat':
        return <ChatInterface onViewChange={setCurrentView} />;
      
      case 'settings':
        console.log('MainLayout: Rendering Settings component');
        return <Settings onViewChange={setCurrentView} />;
      
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Top Bar */}
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {renderMainContent()}
        </main>
      </div>

      {/* Floating Controls - only show on medium+ screens */}
      {/* <FloatingControls onMenuClick={() => setSidebarOpen(true)} /> */}
    </div>
  );
}
