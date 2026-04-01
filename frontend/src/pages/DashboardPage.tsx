import { useEffect, useState } from 'react';
import { fileService } from '../services/fileService';
import { FileUpload } from '../components/FileUpload';
import { FileList } from '../components/FileList';

export interface SharedFile {
  _id: string;
  originalName: string;
  mimetype: string;
  size: number;
  downloads: number;
  createdAt: string;
}

export function DashboardPage() {
  const [files, setFiles] = useState<SharedFile[]>([]);

  const loadFiles = async () => {
    try {
      const result = await fileService.getFiles();
      setFiles(result.data);
    } catch (error) {
      setFiles([]);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <section>
      <FileUpload onUploaded={loadFiles} />
      <FileList files={files} onRefresh={loadFiles} />
    </section>
  );
}
