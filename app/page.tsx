import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import SimpleUpload from '@/components/ui/upload';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-lg text-center mb-8">
        <h1 className="text-3xl font-bold">Upload File</h1>
        <p className="text-gray-500 mt-2">
          Unggah file Anda dengan mudah. Mendukung file teks, gambar, dan video.
        </p>
      </div>
      
      <SimpleUpload />
      
      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/files">
            <FileText className="mr-2 h-4 w-4" />
            Lihat File yang Telah Diunggah
          </Link>
        </Button>
      </div>
    </main>
  );
}
