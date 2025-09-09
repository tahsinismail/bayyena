"use client";

import Image from "next/image";
import { Document } from "@/contexts/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdClose, MdDescription, MdImage, MdVideoFile, MdAudioFile, MdDownload } from "react-icons/md";

interface DocumentPreviewProps {
  document: Document;
  workspaceId?: string;
  onClose: () => void;
}

export function DocumentPreview({ document, workspaceId, onClose }: DocumentPreviewProps) {
  const getFileIcon = (type: string | undefined) => {
    if (!type) return <MdDescription className="h-5 w-5" />;
    if (type.startsWith('image/')) return <MdImage className="h-5 w-5" />;
    if (type.startsWith('video/')) return <MdVideoFile className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <MdAudioFile className="h-5 w-5" />;
    return <MdDescription className="h-5 w-5" />;
  };

  const canPreview = (type: string | undefined) => {
    if (!type) return false;
    return type.startsWith('image/') || type === 'application/pdf' || type.startsWith('text/');
  };

  const handleDownload = () => {
    if (workspaceId) {
      const url = `/api/cases/${workspaceId}/documents/${document.id}/download`;
      window.open(url, '_blank');
    }
  };

  const getPreviewUrl = () => {
    if (workspaceId) {
      return `/api/cases/${workspaceId}/documents/${document.id}/preview`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {getFileIcon(document.type)}
            <div>
              <h3 className="font-medium truncate">{document.name}</h3>
              <p className="text-sm text-muted-foreground">
                Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workspaceId && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <MdDownload className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <MdClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(90vh-100px)] overflow-auto">
          {!workspaceId ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                {getFileIcon(document.type)}
              </div>
              <p className="text-muted-foreground">
                Unable to load document preview. Workspace context not available.
              </p>
            </div>
          ) : canPreview(document.type) ? (
            <div className="space-y-4">
              {document.type && document.type.startsWith('image/') && (
                <Image 
                  src={getPreviewUrl()} 
                  alt={document.name}
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg"
                  unoptimized
                />
              )}
              
              {document.type === 'application/pdf' && (
                <iframe 
                  src={getPreviewUrl()}
                  className="w-full h-96 rounded-lg border"
                  title={document.name}
                />
              )}
              
              {document.type && document.type.startsWith('text/') && (
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{document.content || 'Content not available'}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                {getFileIcon(document.type)}
              </div>
              <p className="text-muted-foreground">
                Preview not available for this file type
              </p>
              {/* <Button className="mt-4" onClick={handleDownload}>
                <MdDownload className="h-4 w-4 mr-2" />
                Download File
              </Button> */}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
