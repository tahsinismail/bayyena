// frontend/src/components/ChatDocumentUpload.tsx

import { useState, useCallback } from 'react';
import { 
  Dialog, 
  Card, 
  Text, 
  Button, 
  Flex, 
  Progress,
  Badge 
} from '@radix-ui/themes';
import { 
  Cross2Icon, 
  UploadIcon,
  CheckCircledIcon,
  CrossCircledIcon 
} from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';

interface ChatDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  caseId: string;
}

interface UploadFile extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function ChatDocumentUpload({ 
  isOpen, 
  onClose, 
  onUpload
}: ChatDocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 512 * 1024 * 1024, // 512MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.aac', '.flac', '.ogg']
    }
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Convert UploadFile back to File for upload
      const filesToUpload = files.map(({ id, progress, status, error, ...fileProps }) => {
        // Create a new File object with the original properties
        return new File([fileProps as any], fileProps.name, { 
          type: fileProps.type,
          lastModified: fileProps.lastModified 
        });
      });
      
      await onUpload(filesToUpload);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.startsWith('audio/')) return '🎵';
    return '📁';
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <UploadIcon />
            Upload Documents
          </Flex>
        </Dialog.Title>
        
        <Dialog.Description size="2" mb="4">
          Upload documents to analyze with AI for this matter.
        </Dialog.Description>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <UploadIcon className="dropzone-icon" />
            <Text size="3" weight="medium" className="dropzone-title">
              {isDragActive ? 'Drop documents here' : 'Drag & drop documents'}
            </Text>
            <Text size="2" color="gray">
              or <span className="browse-link">browse files</span>
            </Text>
            <Text size="1" color="gray" className="dropzone-hint">
              PDF, Word, Excel, Images, Videos, Audio files supported
            </Text>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <Card className="file-list-container" mt="4">
            <div className="file-list">
              {files.map((file) => (
                <div key={file.id} className="file-item">
                  <Flex align="center" gap="3" className="w-full">
                    <div className="file-icon">
                      {getFileIcon(file.type)}
                    </div>
                    
                    <div className="file-info">
                      <Text size="2" weight="medium" className="file-name">
                        {file.name}
                      </Text>
                      <Text size="1" color="gray" className="file-details">
                        {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                      </Text>
                    </div>

                    <div className="file-status">
                      {file.status === 'pending' && (
                        <Badge color="gray" variant="soft">Pending</Badge>
                      )}
                      {file.status === 'uploading' && (
                        <Badge color="blue" variant="soft">
                          <div className="uploading-indicator" />
                          Uploading
                        </Badge>
                      )}
                      {file.status === 'completed' && (
                        <Badge color="green" variant="soft">
                          <CheckCircledIcon />
                          Done
                        </Badge>
                      )}
                      {file.status === 'error' && (
                        <Badge color="red" variant="soft">
                          <CrossCircledIcon />
                          Error
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="1"
                      variant="ghost"
                      color="gray"
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                    >
                      <Cross2Icon />
                    </Button>
                  </Flex>

                  {file.progress > 0 && file.status === 'uploading' && (
                    <Progress value={file.progress} className="file-progress" mt="2" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isUploading}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button 
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            color="blue"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
