import { useState } from 'react';
import { fileService } from '../services/fileService';

export function FileUpload({ onUploaded }: { onUploaded: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    await fileService.uploadFiles(formData);
    onUploaded();
  };

  return (
    <div className="card">
      <h2>上传文件</h2>
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <button onClick={handleUpload}>上传</button>
    </div>
  );
}
