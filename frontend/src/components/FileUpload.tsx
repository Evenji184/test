import { useEffect, useState } from 'react';
import { fileService } from '../services/fileService';

export function FileUpload({ onUploaded }: { onUploaded: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [spaceType, setSpaceType] = useState<'personal' | 'public'>('public');

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      formData.append('spaceType', spaceType);
      await fileService.uploadFiles(formData);
      setMessage('上传成功');
      setFiles(null);
      onUploaded();
    } catch (error: any) {
      setMessage(error.response?.data?.error || '上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2>上传文件</h2>
      <p className="upload-tip">支持所有文件类型上传，单文件默认最大 5GB。</p>
      <select value={spaceType} onChange={(e) => setSpaceType(e.target.value as 'personal' | 'public')}>
        <option value="public">公共空间</option>
        <option value="personal">个人空间</option>
      </select>
      <input
        type="file"
        multiple
        onChange={(e) => {
          setMessage('');
          setFiles(e.target.files);
        }}
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? '上传中...' : '上传'}
      </button>
      {message && <p className={message === '上传成功' ? 'status-message success-text' : 'status-message error-text'}>{message}</p>}
    </div>
  );
}
