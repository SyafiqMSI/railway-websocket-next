import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Image, Video, ExternalLink, RefreshCcw, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './alert-dialog';

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

  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteFile, setDeleteFile] = useState<FileItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    
    socketInstance.on('file_deleted', (fileId: string) => {
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    });
    
    socketInstance.on('file_updated', (fileData: FileItem) => {
      setFiles(prevFiles => 
        prevFiles.map(file => file.id === fileData.id ? fileData : file)
      );
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

  const formatExecutionTime = (executionTime: string) => {
    const timeValue = parseFloat(executionTime);
    
    if (isNaN(timeValue)) return executionTime;
    
    if (timeValue < 0.001) return `${(timeValue * 1000).toFixed(2)} μs`;
    if (timeValue < 1) return `${(timeValue * 1000).toFixed(2)} ms`;
    return `${timeValue.toFixed(3)} detik`;
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

  const handleEditClick = (file: FileItem) => {
    setEditingFile(file);
    setEditName(file.original_name);
  };
  
  const handleDeleteClick = (file: FileItem) => {
    setDeleteFile(file);
  };
  
  const handleEditSave = async () => {
    if (!editingFile) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/files/${editingFile.stored_name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_name: editName
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFiles(prevFiles => 
          prevFiles.map(file => 
            file.id === editingFile.id ? { ...file, original_name: editName } : file
          )
        );
        setEditingFile(null);
      } else {
        setError(data.message || 'Gagal mengubah nama file');
      }
    } catch (err) {
      setError('Gagal menghubungi server API');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!deleteFile) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/files/${deleteFile.stored_name}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setFiles(prevFiles => prevFiles.filter(file => file.id !== deleteFile.id));
        setDeleteFile(null);
      } else {
        const data = await response.json();
        setError(data.message || 'Gagal menghapus file');
      }
    } catch (err) {
      setError('Gagal menghubungi server API');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
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
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatExecutionTime(file.execution_time)}</span>
                        <span>•</span>
                        <span>{formatDate(file.upload_time)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openFile(file.stored_name)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          <span>Lihat</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(file)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(file)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        
        <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit File</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="filename">Nama File</Label>
              <Input
                id="filename"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingFile(null)}
                disabled={actionLoading}
              >
                Batal
              </Button>
              <Button 
                onClick={handleEditSave}
                disabled={actionLoading || !editName.trim()}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus file "{deleteFile?.original_name}"? 
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
};

export default FileList;