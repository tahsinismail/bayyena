"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { MdAdd, MdDescription, MdChat, MdLightbulb } from "react-icons/md";

export function WelcomeScreen() {
  const { createWorkspace, workspaces } = useApp();

  const handleCreateFirstCase = async () => {
    await createWorkspace("My First Case");
  };

  const handleQuickStart = async () => {
    await createWorkspace("Legal Research");
    // Could add some default documents or setup here
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo and Welcome */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to Bayyena
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered legal case building platform. Organize documents, chat with AI, and build compelling cases.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleCreateFirstCase}>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <MdAdd className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Create Your First Case</h3>
                <p className="text-sm text-muted-foreground">
                  Start organizing documents and building your legal case with AI assistance.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleQuickStart}>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                <MdLightbulb className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Quick Start</h3>
                <p className="text-sm text-muted-foreground">
                  Begin with a pre-configured workspace for legal research and document analysis.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold">What you can do with Bayyena</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="space-y-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <MdDescription className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium">Document Management</h3>
              <p className="text-sm text-muted-foreground">
                Upload, organize, and search through legal documents with AI-powered analysis.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <MdChat className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium">AI-Powered Chat</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about your case and get insights from your documents using AI.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <MdAdd className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-medium">Case Building</h3>
              <p className="text-sm text-muted-foreground">
                Organize evidence, create timelines, and build comprehensive legal arguments.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Workspaces */}
        {workspaces.length > 0 && (
          <div className="mt-12 space-y-4">
            <h3 className="text-lg font-medium">Recent Workspaces</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {workspaces.slice(0, 4).map((workspace) => (
                <Button
                  key={workspace.id}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <MdDescription className="h-4 w-4" />
                  {workspace.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
