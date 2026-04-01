import { SharedFile } from '../pages/DashboardPage';
import { fileService } from '../services/fileService';

export function FileList({ files, onRefresh }: { files: SharedFile[]; onRefresh: () => void }) {
  const handleDelete = async (id: string) => {
    await fileService.deleteFile(id);
    onRefresh();
  };

  return (
    <div className="card">
      <h2>文件列表</h2>
      <ul className="file-list">
        {files.map((file) => (
          <li key={file._id}>
            <span>{file.originalName}</span>
            <div>
              <a href={fileService.getDownloadUrl(file._id)} target="_blank" rel="noreferrer">
                下载
              </a>
              <button onClick={() => handleDelete(file._id)}>删除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
