import { useEffect, useRef, useState } from 'react';
import { SharedFile } from '../pages/DashboardPage';
import { fileService } from '../services/fileService';

interface DownloadTask {
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'success' | 'error' | 'cancelled';
  controller?: AbortController | null;
  downloadedBytes?: number;
  totalBytes?: number;
  chunks?: Array<Blob | null>;
  fileName?: string;
}

export function FileList({ files, onRefresh, currentUserId, isAdmin }: { files: SharedFile[]; onRefresh: () => void; currentUserId?: number; isAdmin?: boolean }) {
  const DOWNLOAD_CHUNK_SIZE = 2 * 1024 * 1024;
  const MAX_CONCURRENT_DOWNLOADS = 3;
  const [message, setMessage] = useState('');
  const [downloadTasks, setDownloadTasks] = useState<Record<string, DownloadTask>>({});
  const downloadTasksRef = useRef<Record<string, DownloadTask>>({});

  const getUploaderId = (uploadedBy: SharedFile['uploadedBy']) => {
    if (typeof uploadedBy === 'number') {
      return uploadedBy;
    }

    return uploadedBy?.id;
  };

  useEffect(() => {
    downloadTasksRef.current = downloadTasks;
  }, [downloadTasks]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const updateDownloadTask = (id: string, patch: Partial<DownloadTask>) => {
    console.log('[Download] 更新任务状态', {
      fileId: id,
      patch,
      before: downloadTasksRef.current[id],
      after: {
        ...(downloadTasksRef.current[id] ?? { progress: 0, status: 'pending' as const, controller: null }),
        ...patch
      }
    });
    downloadTasksRef.current = {
      ...downloadTasksRef.current,
      [id]: {
        ...(downloadTasksRef.current[id] ?? { progress: 0, status: 'pending' as const, controller: null, downloadedBytes: 0, totalBytes: 0, chunks: [] }),
        ...patch
      }
    };
    setDownloadTasks((current) => ({
      ...downloadTasksRef.current
    }));
  };

  const saveDownloadedFile = (blob: Blob, fileName: string) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const removeDownloadTask = (id: string) => {
    setDownloadTasks((current) => {
      const next = { ...current };
      delete next[id];
      downloadTasksRef.current = next;
      return next;
    });
  };

  const runChunkedDownload = async (id: string, originalName: string, startByte: number, existingChunks: Array<Blob | null> = [], knownTotalBytes?: number) => {
    const controller = new AbortController();
    const currentTask = downloadTasksRef.current[id];
    const fileName = currentTask?.fileName || originalName;
    let totalBytes = knownTotalBytes ?? currentTask?.totalBytes ?? 0;
    let chunks = [...existingChunks];

    const getCompletedBytes = (targetChunks: Array<Blob | null>) => targetChunks.reduce((sum, chunk) => sum + (chunk?.size ?? 0), 0);

    if (totalBytes <= 0) {
      updateDownloadTask(id, {
        status: 'downloading',
        controller,
        fileName,
        downloadedBytes: 0,
        totalBytes: 0,
        chunks: []
      });

      const probeResult = await fileService.downloadFileChunk(id, fileName, {
        signal: controller.signal,
        startByte: 0,
        endByte: DOWNLOAD_CHUNK_SIZE - 1,
        onProgress: ({ progress, loadedBytes, totalBytes: progressTotalBytes }) => {
          const task = downloadTasksRef.current[id];
          if (task?.controller !== controller || task.status !== 'downloading') {
            return;
          }

          updateDownloadTask(id, {
            progress,
            status: 'downloading',
            controller,
            downloadedBytes: loadedBytes,
            totalBytes: progressTotalBytes,
            fileName
          });
        }
      });

      totalBytes = probeResult.totalBytes;
      chunks = new Array<Blob | null>(Math.ceil(totalBytes / DOWNLOAD_CHUNK_SIZE)).fill(null);
      chunks[0] = probeResult.blob;
    }

    const totalChunks = Math.ceil(totalBytes / DOWNLOAD_CHUNK_SIZE);
    if (chunks.length !== totalChunks) {
      const normalizedChunks = new Array<Blob | null>(totalChunks).fill(null);
      chunks.forEach((chunk, index) => {
        if (index < totalChunks) {
          normalizedChunks[index] = chunk;
        }
      });
      chunks = normalizedChunks;
    }

    const chunkProgressMap: Record<number, number> = {};
    const pendingChunkIndexes = chunks
      .map((chunk, index) => (chunk ? -1 : index))
      .filter((index) => index >= 0);
    const updateAggregateProgress = (resultFileName?: string) => {
      const finishedBytes = getCompletedBytes(chunks);
      const inflightBytes = Object.entries(chunkProgressMap).reduce((sum, [index, loaded]) => {
        return chunks[Number(index)] ? sum : sum + loaded;
      }, 0);
      const loadedBytes = Math.min(finishedBytes + inflightBytes, totalBytes);

      updateDownloadTask(id, {
        progress: totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0,
        status: 'downloading',
        controller,
        downloadedBytes: loadedBytes,
        totalBytes,
        chunks: [...chunks],
        fileName: resultFileName || fileName
      });
    };

    updateDownloadTask(id, {
      status: 'downloading',
      controller,
      fileName,
      downloadedBytes: getCompletedBytes(chunks),
      totalBytes,
      chunks: [...chunks],
      progress: totalBytes > 0 ? Math.round((getCompletedBytes(chunks) / totalBytes) * 100) : 0
    });

    const downloadChunk = async (chunkIndex: number) => {
      const latestTask = downloadTasksRef.current[id];
      if (latestTask?.controller !== controller || latestTask.status !== 'downloading') {
        console.log('[Download] 分片任务终止', { fileId: id, chunkIndex, latestTask });
        return;
      }

      const chunkStartByte = chunkIndex * DOWNLOAD_CHUNK_SIZE;
      const endByte = Math.min(chunkStartByte + DOWNLOAD_CHUNK_SIZE - 1, totalBytes - 1);
      const result = await fileService.downloadFileChunk(id, fileName, {
        signal: controller.signal,
        startByte: chunkStartByte,
        endByte,
        totalBytes: totalBytes || undefined,
        onProgress: ({ chunkLoadedBytes }) => {
          const task = downloadTasksRef.current[id];
          if (task?.controller !== controller || task.status !== 'downloading') {
            return;
          }

          chunkProgressMap[chunkIndex] = chunkLoadedBytes;
          updateAggregateProgress();
        }
      });

      chunks[chunkIndex] = result.blob;
      delete chunkProgressMap[chunkIndex];
      updateAggregateProgress(result.fileName);
    };

    const executing = new Set<Promise<void>>();
    for (const chunkIndex of pendingChunkIndexes) {
      const taskPromise = downloadChunk(chunkIndex).finally(() => {
        executing.delete(taskPromise);
      });
      executing.add(taskPromise);

      if (executing.size >= MAX_CONCURRENT_DOWNLOADS) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    const finalChunks = chunks.filter((chunk): chunk is Blob => Boolean(chunk));
    const finalBytes = finalChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (finalBytes >= totalBytes) {
      updateDownloadTask(id, {
        progress: 100,
        status: 'success',
        controller: null,
        downloadedBytes: totalBytes,
        totalBytes,
        chunks: [...chunks],
        fileName
      });
      saveDownloadedFile(new Blob(finalChunks), fileName);
    }
  };

  const handleDownload = async (id: string, originalName: string) => {
    try {
      setMessage('');
      console.log('[Download] 开始下载', { fileId: id, currentTask: downloadTasksRef.current[id], isResume: false });
      updateDownloadTask(id, { progress: 0, status: 'pending', controller: null, downloadedBytes: 0, totalBytes: 0, chunks: [], fileName: originalName });
      await runChunkedDownload(id, originalName, 0, [], 0);
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return;
      }

      updateDownloadTask(id, { status: 'error', controller: null });
      setMessage(error.response?.data?.error || '下载失败');
    } finally {
      const currentTask = downloadTasksRef.current[id];
      if (currentTask?.status === 'success') {
        removeDownloadTask(id);
      } else if (currentTask?.status === 'cancelled') {
        window.setTimeout(() => {
          removeDownloadTask(id);
        }, 1500);
      }
    }
  };

  const handlePauseDownload = (id: string) => {
    console.log('[Download] 暂停下载', { fileId: id, currentProgress: downloadTasksRef.current[id]?.progress, downloadedBytes: downloadTasksRef.current[id]?.downloadedBytes });
    downloadTasksRef.current[id]?.controller?.abort();
    updateDownloadTask(id, { status: 'paused', controller: null });
  };

  const handleResumeDownload = async (id: string, originalName: string) => {
    try {
      setMessage('');
      const currentTask = downloadTasksRef.current[id];
      const startByte = currentTask?.downloadedBytes ?? 0;
      console.log('[Download] 开始下载', { fileId: id, currentTask, isResume: true, startByte });

      if (!currentTask || startByte <= 0) {
        await handleDownload(id, originalName);
        return;
      }

      await runChunkedDownload(id, currentTask.fileName || originalName, startByte, currentTask.chunks ?? [], currentTask.totalBytes);
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return;
      }

      updateDownloadTask(id, { status: 'error', controller: null });
      setMessage(error.response?.data?.error || '继续下载失败');
    } finally {
      const currentTask = downloadTasksRef.current[id];
      if (currentTask?.status === 'success') {
        removeDownloadTask(id);
      }
    }
  };

  const handleCancelDownload = (id: string) => {
    downloadTasksRef.current[id]?.controller?.abort();
    updateDownloadTask(id, { status: 'cancelled', progress: 0, controller: null });
    onRefresh();
    window.setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleDelete = async (id: string) => {
    try {
      setMessage('');
      await fileService.deleteFile(id);
      setMessage('删除成功');
      onRefresh();
    } catch (error: any) {
      setMessage(error.response?.data?.error || '删除失败');
    }
  };

  return (
    <div className="card">
      <h2>文件列表</h2>
      {message && <p className={message === '删除成功' ? 'status-message success-text' : 'status-message error-text'}>{message}</p>}
      <ul className="file-list">
        {files.map((file) => (
          <li key={file.id} className="file-list-item">
            {(() => {
              const task = downloadTasks[String(file.id)];

              return (
                <>
            <div className="file-list-meta">
              <span className="file-name" title={file.originalName}>{file.originalName}</span>
              <small>[{file.spaceType === 'personal' ? '个人空间' : '公共空间'}]</small>
              {file.uploadedBy && typeof file.uploadedBy === 'object' && (
                <small> 上传者：{file.uploadedBy.username}</small>
              )}
            </div>
            <div className="file-actions">
              {(!task || ['pending', 'paused', 'error'].includes(task.status)) && (
                <button type="button" onClick={() => (task?.status === 'paused' ? handleResumeDownload(String(file.id), file.originalName) : handleDownload(String(file.id), file.originalName))}>
                  {!task ? '下载' : task.status === 'paused' ? '继续下载' : '重新下载'}
                </button>
              )}
              {task?.status === 'downloading' && (
                <button type="button" onClick={() => handlePauseDownload(String(file.id))}>暂停下载</button>
              )}
              {task && !['success', 'cancelled'].includes(task.status) && (
                <button type="button" className="danger-button" onClick={() => handleCancelDownload(String(file.id))}>终止下载</button>
              )}
              {(isAdmin || getUploaderId(file.uploadedBy) === currentUserId) && (
                <button type="button" onClick={() => handleDelete(String(file.id))}>删除</button>
              )}
            </div>
            {task && (
              <div className="download-progress-row">
                <div className="upload-task-header">
                  <span>{task.status}</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-inner ${task.status === 'error' ? 'error' : 'success'}`} style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            )}
                </>
              );
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
