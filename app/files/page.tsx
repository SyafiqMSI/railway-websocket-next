
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import FileList from '@/components/ui/file-list';

export default function FilesPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">File yang Telah Diunggah</h1>
          <Button variant="outline" asChild>
            <Link href="/">
              <Upload className="mr-2 h-4 w-4" />
              Unggah File Baru
            </Link>
          </Button>
        </div>
        
        <FileList />
      </div>
    </main>
  );
}