import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button, Text, Flex, Badge, Card, Progress } from '@radix-ui/themes';
import { UploadIcon, FileIcon, ImageIcon, VideoIcon, CheckIcon, Cross1Icon, ClockIcon } from '@radix-ui/react-icons';
import { useToast } from '../contexts/ToastContext';
import { checkServerCapabilities } from '../api';

interface DocumentUploadProps {
  caseId: number;
  onUploadSuccess?: () => void;
  onCancel?: () => void;
}

interface UploadedFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  progress?: number;
  errorDetails?: {
    type: string;
    message: string;
    solution: string;
    userAction: string;
  };
}

interface ServerCapabilities {
  videoProcessing: boolean;
  supportedVideoFormats: string[];
  videoProcessingNote: string;
  installationInstructions: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ caseId, onUploadSuccess, onCancel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');
  const [serverCapabilities, setServerCapabilities] = useState<ServerCapabilities | null>(null);
  const { showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const response = await checkServerCapabilities();
        setServerCapabilities(response.data);
      } catch (err) {
        showError('Server Capabilities Check Failed', 'Failed to check server capabilities for video processing.');
      }
    };
    fetchCapabilities();
  }, [showError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles); // Debug logging
    setIsUploading(true);
    setError('');

    try {
      for (const file of acceptedFiles) {
        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`); // Debug logging
        
        // Additional validation for compressed files
        const compressedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
        const compressedMimeTypes = [
          'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
          'application/x-7z-compressed', 'application/x-tar', 'application/gzip', 'application/x-bzip2'
        ];
        const fileNameLower = file.name.toLowerCase();
        const hasCompressedExt = compressedExtensions.some(ext => fileNameLower.endsWith(ext));
        const hasCompressedMime = compressedMimeTypes.includes(file.type);
        if (hasCompressedExt || hasCompressedMime) {
          showError('Unsupported File Type', `${file.name} is a compressed file and is not supported. Please upload a valid document.`);
          continue;
        }

        // Check if this is a video file and video processing is not available
        if (file.type.startsWith('video/') && serverCapabilities && !serverCapabilities.videoProcessing) {
          showError('Video Processing Not Available', 
            `${file.name} is a video file, but video processing is not available on this server. The file will be uploaded but cannot be processed for text extraction. Consider uploading an image or document file instead.`, 
            8000);
        }

        showInfo('Upload Started', `Starting upload for ${file.name}`);

        const formData = new FormData();
        formData.append('document', file);

        const response = await fetch(`/api/cases/${caseId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to upload ${file.name}`);
        }

        const uploadedDoc = await response.json();
        
        setUploadedFiles(prev => [...prev, {
          id: uploadedDoc.document.id,
          fileName: uploadedDoc.document.fileName,
          fileType: uploadedDoc.document.fileType,
          fileSize: uploadedDoc.document.fileSize,
          processingStatus: uploadedDoc.document.processingStatus,
          progress: uploadedDoc.document.processingStatus === 'PENDING' ? 0 : 100
        }]);

        showSuccess('Upload Complete', `${file.name} uploaded successfully`);
        
        // Start polling for processing status
        if (uploadedDoc.document.processingStatus === 'PENDING') {
          pollProcessingStatus(uploadedDoc.document.id);
        }
      }

      onUploadSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      showError('Upload Error', errorMessage, 5000);
    } finally {
      setIsUploading(false);
    }
  }, [caseId, onUploadSuccess, showSuccess, showError, showInfo, serverCapabilities]);

  const pollProcessingStatus = async (docId: number) => {
    try {
      const response = await fetch(`/api/documents/${caseId}/${docId}`);
      if (response.ok) {
        const doc = await response.json();
        
        if (doc.processingStatus === 'PROCESSED') {
          showSuccess('Processing Complete', `${doc.fileName} has been processed successfully`);
          setUploadedFiles(prev => prev.map(file => 
            file.id === docId 
              ? { ...file, processingStatus: 'PROCESSED', progress: 100 }
              : file
          ));
        } else if (doc.processingStatus === 'FAILED') {
          // Handle detailed error information
          if (doc.errorDetails) {
            const { type, message, userAction } = doc.errorDetails;
            
            if (type === 'FFMPEG_MISSING') {
              showError('Video Processing Not Available', 
                `${doc.fileName} cannot be processed because video OCR is not available on this server. ${userAction}`, 
                8000);
            } else {
              showError('Processing Failed', 
                `${doc.fileName} processing failed: ${message}. ${userAction}`, 
                8000);
            }
          } else {
            showError('Processing Failed', `${doc.fileName} processing failed`);
          }
          
          setUploadedFiles(prev => prev.map(file => 
            file.id === docId 
              ? { ...file, processingStatus: 'FAILED', errorDetails: doc.errorDetails }
              : file
          ));
        } else if (doc.processingStatus === 'PENDING') {
          // Continue polling
          setTimeout(() => pollProcessingStatus(docId), 2000);
        }
      }
    } catch (err) {
      showError('Status Check Failed', 'Failed to check document processing status');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Remove MIME type restrictions from react-dropzone and handle validation manually
    accept: undefined,
    // Use file extension validation instead
    validator: (file) => {
      const allowedExtensions = [
        '.pdf', '.docx', '.doc', '.txt', '.csv', '.tsv', '.xls', '.xlsx', '.rtf', '.html', '.htm', '.xml', '.json', '.md', '.yml', '.yaml', '.js', '.css',
        '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
        '.mp3', '.wav', '.aiff', '.aac', '.ogg', '.flac', '.m4a', '.wma'
      ];
      
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        return {
          code: 'file-invalid-type',
          message: `File type not supported. Allowed types: ${allowedExtensions.join(', ')}`
        };
      }
      
      // Check file size (200MB limit)
      if (file.size > 200 * 1024 * 1024) {
        return {
          code: 'file-too-large',
          message: 'File is larger than 200MB'
        };
      }
      
      return null;
    },
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles); // Debug logging
      rejectedFiles.forEach(({ file, errors }) => {
        console.log(`Rejected file: ${file.name}, type: ${file.type}, size: ${file.size}`, errors); // Debug logging
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            showError('File Too Large', `${file.name} is too large. Maximum size is 200MB.`);
          } else if (error.code === 'file-invalid-type') {
            showError('Invalid File Type', `${file.name} (${file.type}) is not a supported file type.`);
          } else {
            showError('Upload Rejected', `${file.name}: ${error.message}`);
          }
        });
      });
    },
    onDropAccepted: (acceptedFiles) => {
      // Show warning for video files if video processing is not available
      if (serverCapabilities && !serverCapabilities.videoProcessing) {
        const videoFiles = acceptedFiles.filter(file => file.type.startsWith('video/'));
        if (videoFiles.length > 0) {
          showError('Video Processing Warning', 
            `${videoFiles.length} video file(s) will be uploaded but cannot be processed for text extraction. Consider using image or document files instead.`, 
            8000);
        }
      }
    }
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="text-blue-500" />;
    if (fileType.startsWith('video/')) return <VideoIcon className="text-purple-500" />;
    if (fileType.startsWith('audio/')) return <FileIcon className="text-green-600" />;
    if (fileType === 'application/pdf') return <FileIcon className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileIcon className="text-green-500" />;
    if (fileType.startsWith('text/') || fileType.includes('json') || fileType.includes('markdown') || fileType.includes('yaml') || fileType.includes('javascript') || fileType.includes('css')) return <FileIcon className="text-orange-500" />;
    return <FileIcon className="text-gray-500" />;
  };

  const getFileTypeDisplayName = (mimeType: string) => {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/msword': 'Word Document',
      'text/plain': 'Text File',
      'text/csv': 'CSV File',
      'text/tab-separated-values': 'TSV File',
      'application/vnd.ms-excel': 'Excel File',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel File',
      'application/rtf': 'Rich Text',
      'text/html': 'HTML File',
      'text/xml': 'XML File',
      'application/json': 'JSON File',
      'text/markdown': 'Markdown',
      'text/yaml': 'YAML File',
      'text/javascript': 'JavaScript',
      'text/css': 'CSS File',
      'audio/wav': 'WAV Audio',
      'audio/mp3': 'MP3 Audio',
      'audio/mpeg': 'MP3 Audio',
      'audio/mp4': 'M4A Audio',
      'audio/aiff': 'AIFF Audio',
      'audio/aac': 'AAC Audio',
      'audio/ogg': 'OGG Audio',
      'audio/flac': 'FLAC Audio',
      'audio/x-wav': 'WAV Audio',
      'audio/x-mp3': 'MP3 Audio',
      'audio/x-aiff': 'AIFF Audio'
    };
    return typeMap[mimeType] || 'Unknown Type';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckIcon className="text-green-500" />;
      case 'FAILED':
        return <Cross1Icon className="text-red-500" />;
      case 'PENDING':
        return <ClockIcon className="text-yellow-500" />;
      default:
        return <ClockIcon className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'PENDING':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="space-y-4">
        <div>
          <Text size="5" weight="bold" className="mb-2 block">
            Upload Documents
          </Text>
          <Text size="2" color="gray" className="mb-4 block">
            Drag and drop files here, or click to select files
          </Text>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <Text size="3" className="text-gray-600">
            {isDragActive ? 'Drop the files here...' : 'Drag & drop files here, or click to select'}
          </Text>
          <Text size="2" color="gray" className="mt-2 block">
            Supports PDF, Word, Excel, text files, images, and videos up to 100MB
          </Text>
          {serverCapabilities && !serverCapabilities.videoProcessing && (
            <Text size="1" color="red" className="mt-1 block font-medium">
              ⚠️ Video files cannot be processed for text extraction on this server
            </Text>
          )}
          {serverCapabilities && (
            <div className="mt-1">
              <Text size="1" color="orange" className="block">
                ⚠️ Note: Video processing requires FFmpeg on the server. If unavailable, videos will show a processing error.
              </Text>
              {!serverCapabilities.videoProcessing && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                  <Text size="1" color="red" weight="bold" className="block mb-1">
                    🚫 Video Processing Currently Unavailable
                  </Text>
                  <Text size="1" color="red" className="block mb-1">
                    Video files can be uploaded but cannot be processed for text extraction.
                  </Text>
                  <Text size="1" color="red" className="block">
                    For best results, upload image or document files instead.
                  </Text>
                </div>
              )}
              {serverCapabilities.videoProcessingNote && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                  <Text size="1" color="orange" weight="bold" className="block mb-1">
                    💡 What this means:
                  </Text>
                  <Text size="1" color="orange" className="block mb-1">
                    {serverCapabilities.videoProcessingNote}
                  </Text>
                  <Text size="1" color="orange" className="block">
                    {serverCapabilities.installationInstructions}
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Supported formats */}
        <div className="space-y-2">
          <Text size="2" weight="bold" color="gray">
            Supported formats:
          </Text>
          <div className="flex flex-wrap gap-1">
            <Badge variant="soft" color="blue">PDF</Badge>
            <Badge variant="soft" color="green">Word (.doc, .docx)</Badge>
            <Badge variant="soft" color="green">Excel (.xls, .xlsx)</Badge>
            <Badge variant="soft" color="orange">Text (.txt, .csv, .tsv)</Badge>
            <Badge variant="soft" color="orange">Markdown (.md)</Badge>
            <Badge variant="soft" color="orange">JSON, YAML, HTML, XML</Badge>
            <Badge variant="soft" color="blue">Images (JPEG, PNG, BMP, TIFF, WebP)</Badge>
            <Badge variant="soft" color="purple">Videos (MP4, AVI, MOV, WMV, FLV, WebM)</Badge>
          </div>
          {serverCapabilities && (
            <Text size="1" color="orange" className="mt-1">
              ⚠️ Video processing may be limited based on server configuration
            </Text>
          )}
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <Text size="3" weight="bold">
              Uploaded Files:
            </Text>
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <Flex align="center" gap="3">
                  {getFileIcon(file.fileType)}
                  <div className="flex-1 min-w-0">
                    <Text size="2" weight="bold" className="block">
                      {file.fileName}
                    </Text>
                    <Text size="1" color="gray" className="block">
                      {formatFileSize(file.fileSize)} • {getFileTypeDisplayName(file.fileType)}
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.processingStatus)}
                    <Badge variant="soft" color={getStatusColor(file.processingStatus)}>
                      {file.processingStatus}
                    </Badge>
                  </div>
                </Flex>
                
                {file.processingStatus === 'PENDING' && (
                  <div className="mt-3">
                    <Text size="1" color="gray" className="block mb-2">
                      Processing document...
                    </Text>
                    <Progress value={file.progress || 0} className="w-full" />
                  </div>
                )}
                
                {file.processingStatus === 'FAILED' && file.errorDetails && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Text size="2" color="red" weight="bold" className="block mb-2">
                      Processing Failed
                    </Text>
                    <Text size="1" color="red" className="block mb-2">
                      {file.errorDetails.message}
                    </Text>
                    {file.errorDetails.type === 'FFMPEG_MISSING' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                        <Text size="1" color="orange" weight="bold" className="block mb-1">
                          💡 What this means:
                        </Text>
                        <Text size="1" color="orange" className="block mb-1">
                          Video files cannot be processed for text extraction on this server.
                        </Text>
                        <Text size="1" color="orange" className="block">
                          Try uploading an image or document file instead.
                        </Text>
                      </div>
                    )}
                    <Text size="1" color="gray" className="block">
                      <strong>Suggested action:</strong> {file.errorDetails.userAction}
                    </Text>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <Text size="2" color="red" className="font-medium">
              {error}
            </Text>
          </div>
        )}

        {/* Action buttons */}
        <Flex gap="3" justify="end">
          {onCancel && (
            <Button variant="soft" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
          )}
        </Flex>
      </div>
    </Card>
  );
};

export default DocumentUpload;
