"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Progress } from '@/components/ui/progress';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface UploadResult {
  status: string;
  message: string;
  file_data: {
    id: string;
    original_name: string;
    stored_name: string;
    type: string;
    size: number;
    upload_time: string;
    execution_time: string;
  };
  content?: string;
  file_url?: string;
  execution_time: string;
}

interface ProgressStatus {
  filename: string;
  progress: number;
}

const SimpleUpload = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inisialisasi koneksi Socket.IO
  useEffect(() => {
    const socketInstance = io(API_URL);
    
    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });
    
    socketInstance.on('upload_progress_update', (data: ProgressStatus) => {
      if (file && data.filename === file.name) {
        setUploadProgress(data.progress);
      }
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, [file]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
      setUploadProgress(0);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Silakan pilih file terlebih dahulu');
      return;
    }
    
    setUploading(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Kirim notifikasi mulai upload ke socket
      if (socket) {
        socket.emit('upload_progress', {
          filename: file.name,
          progress: 0
        });
      }
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        setUploadProgress(100);
      } else {
        setError(data.message || 'Terjadi kesalahan saat mengunggah file');
      }
    } catch (err) {
      setError('Gagal menghubungi server API. Pastikan server berjalan.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  
  const renderPreview = () => {
    if (!result) return null;
    
    if (result.file_data.type === 'text' && result.content) {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Isi File Teks:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-64 text-sm">{result.content}</pre>
        </div>
      );
    }
    
    if (result.file_data.type === 'image' && result.file_url) {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Preview Gambar:</h3>
          <img 
            src={`${API_URL}${result.file_url}`} 
            alt="Uploaded" 
            className="max-w-full max-h-64 rounded shadow-sm" 
          />
        </div>
      );
    }
    
    if (result.file_data.type === 'video' && result.file_url) {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Preview Video:</h3>
          <video 
            controls 
            className="max-w-full max-h-96 rounded shadow-sm"
          >
            <source src={`${API_URL}${result.file_url}`} />
            Browser Anda tidak mendukung tag video.
          </video>
        </div>
      );
    }
    
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragging ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload className="h-10 w-10 text-gray-400" />
              <p className="text-sm font-medium">
                Drag & drop file di sini, atau{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Mendukung: Teks (.txt), Gambar (.jpg, .png, .gif), Video (.mp4, .mov)
              </p>
            </div>
          </div>
          
          {file && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                {!result && !uploading && (
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    size="sm"
                  >
                    Upload
                  </Button>
                )}
              </div>
              
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Mengupload...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <div className="space-y-4">
              <Alert className={result.status === "success" ? "bg-green-50" : ""}>
                <AlertDescription>
                  {result.message} {result.execution_time && `(${result.execution_time})`}
                </AlertDescription>
              </Alert>
              
              {renderPreview()}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setUploadProgress(0);
                  }}
                >
                  Upload File Baru
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleUpload;