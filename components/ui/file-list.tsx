import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Image, Video, ExternalLink, RefreshCcw } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FileItem {
  id: string;
  original_name: string;
  stored_name: string;
  type: string;
  size: number;
  upload_time: string;
  execution_time: string;
}

const FileList = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io(API_URL);
    
    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
      socketInstance.emit('get_files');
    });
    
    socketInstance.on('files_list', (data: FileItem[]) => {
      const sortedFiles = [...data].sort((a, b) => {
        return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
      });
      setFiles(sortedFiles);
      setLoading(false);
    });
    
    socketInstance.on('file_uploaded', (fileData: FileItem) => {
      setFiles(prevFiles => {
        const newFiles = [fileData, ...prevFiles];
        return newFiles.sort((a, b) => {
          return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
        });
      });
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const fetchFiles = () => {
    setLoading(true);
    if (socket && socket.connected) {
      socket.emit('get_files');
    } else {
      fetchFilesHttp();
    }
  };

  const fetchFilesHttp = async () => {
    try {
      const response = await fetch(`${API_URL}/api/files`);
      const data = await response.json();

      if (response.ok) {
        const sortedFiles = data.data.sort((a: FileItem, b: FileItem) => {
          return new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime();
        });
        setFiles(sortedFiles);
      } else {
        setError(data.message || 'Gagal mengambil daftar file');
      }
    } catch (err) {
      setError('Gagal menghubungi server API. Pastikan server berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-green-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const openFile = (storedName: string) => {
    window.open(`${API_URL}/api/files/${storedName}`, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>File yang Telah Diunggah</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchFiles}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-center py-10 text-gray-500">
            Belum ada file yang diunggah
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium">{file.original_name}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.upload_time)}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => openFile(file.stored_name)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="p-4 mt-4 bg-red-50 text-red-500 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileList;