import { useEffect, useRef, useState } from 'react';
import { fileService } from '../services/fileService';

const CHUNK_SIZE = 1024 * 1024;

interface UploadTask {
  key: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled';
  file: File;
  uploadId?: string;
  currentChunkIndex: number;
  totalChunks: number;
}

export function FileUpload({ onUploaded }: { onUploaded: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [spaceType, setSpaceType] = useState<'personal' | 'public'>('public');
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const controllersRef = useRef<Record<string, AbortController | null>>({});
  const tasksRef = useRef<UploadTask[]>([]);

  const setTasksState = (updater: UploadTask[] | ((current: UploadTask[]) => UploadTask[])) => {
    if (typeof updater !== 'function') {
      tasksRef.current = updater;
    }
    setTasks((current) => {
      const next = typeof updater === 'function' ? (updater as (current: UploadTask[]) => UploadTask[])(current) : updater;
      tasksRef.current = next;
      console.log('[FileUpload] setTasksState', { nextTasks: next });
      return next;
    });
  };

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const updateTask = (key: string, patch: Partial<UploadTask>) => {
    tasksRef.current = tasksRef.current.map((task) => (task.key === key ? { ...task, ...patch } : task));
    setTasks((current) => {
      const next = tasksRef.current.map((task) => (task.key === key ? { ...task } : task));
      tasksRef.current = next;
      console.log('[FileUpload] updateTask', {
        key,
        patch,
        nextTask: next.find((task) => task.key === key)
      });
      return next;
    });
  };

  const syncUploadingState = (nextTasks: UploadTask[]) => {
    setUploading(nextTasks.some((task) => task.status === 'uploading'));
  };

  const uploadTask = async (taskKey: string) => {
    const task = tasksRef.current.find((item) => item.key === taskKey);
    console.log('[FileUpload] uploadTask start', { taskKey, task });
    if (!task || task.status === 'cancelled' || task.status === 'success') {
      return;
    }

    try {
      let activeTask = task;

      if (!activeTask.uploadId) {
        const initResult = await fileService.initUpload({
          originalName: activeTask.file.name,
          mimetype: activeTask.file.type || 'application/octet-stream',
          size: activeTask.file.size,
          totalChunks: activeTask.totalChunks,
          chunkSize: CHUNK_SIZE,
          spaceType
        });

        const uploadedChunks = new Set<number>((initResult.data.uploadedChunks || []) as number[]);
        const nextChunkIndex = uploadedChunks.size > 0 ? Math.max(...uploadedChunks) + 1 : 0;

        console.log('[FileUpload] initUpload success', {
          taskKey,
          uploadId: initResult.data.uploadId,
          uploadedChunks: Array.from(uploadedChunks),
          nextChunkIndex,
          totalChunks: activeTask.totalChunks
        });

        updateTask(taskKey, {
          uploadId: initResult.data.uploadId as string,
          currentChunkIndex: nextChunkIndex,
          progress: Math.round((uploadedChunks.size / activeTask.totalChunks) * 100),
          status: 'uploading'
        });

        activeTask = {
          ...activeTask,
          uploadId: initResult.data.uploadId as string,
          currentChunkIndex: nextChunkIndex,
          status: 'uploading'
        };

        console.log('[FileUpload] activeTask prepared', {
          taskKey,
          uploadId: activeTask.uploadId,
          currentChunkIndex: activeTask.currentChunkIndex,
          totalChunks: activeTask.totalChunks,
          status: activeTask.status
        });
      }

      console.log('[FileUpload] enter chunk loop', {
        taskKey,
        uploadId: activeTask.uploadId,
        currentChunkIndex: activeTask.currentChunkIndex,
        totalChunks: activeTask.totalChunks
      });

      for (let chunkIndex = activeTask.currentChunkIndex; chunkIndex < activeTask.totalChunks; chunkIndex += 1) {
        const latestTask = tasksRef.current.find((item) => item.key === taskKey);
        const latestStatus = latestTask?.status ?? activeTask.status;

        console.log('[FileUpload] chunk loop check', {
          taskKey,
          chunkIndex,
          latestTask,
          activeTaskUploadId: activeTask.uploadId,
          latestStatus
        });

        if (latestStatus !== 'uploading') {
          console.warn('[FileUpload] chunk loop stopped by status', {
            taskKey,
            chunkIndex,
            latestStatus
          });
          return;
        }

        if (!activeTask.uploadId) {
          console.error('[FileUpload] missing uploadId before chunk upload', {
            taskKey,
            chunkIndex,
            activeTask,
            latestTask
          });
          return;
        }

        const controller = new AbortController();
        controllersRef.current[taskKey] = controller;

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(activeTask.file.size, start + CHUNK_SIZE);
        const chunk = activeTask.file.slice(start, end);

        console.log('[FileUpload] upload chunk request', {
          taskKey,
          uploadId: activeTask.uploadId,
          chunkIndex,
          start,
          end,
          chunkSize: chunk.size
        });

        await fileService.uploadChunk(activeTask.uploadId, chunkIndex, chunk, (chunkProgress) => {
          const completed = chunkIndex / activeTask.totalChunks;
          const currentChunkWeight = (chunkProgress / 100) * (1 / activeTask.totalChunks);
          updateTask(taskKey, {
            progress: Math.min(99, Math.round((completed + currentChunkWeight) * 100)),
            currentChunkIndex: chunkIndex
          });
        }, controller.signal);

        updateTask(taskKey, {
          progress: Math.round(((chunkIndex + 1) / activeTask.totalChunks) * 100),
          currentChunkIndex: chunkIndex + 1
        });

        activeTask = {
          ...activeTask,
          currentChunkIndex: chunkIndex + 1
        };
      }

      const completedTask = tasksRef.current.find((item) => item.key === taskKey);
      if (!completedTask?.uploadId || completedTask.status !== 'uploading') {
        return;
      }

      await fileService.mergeChunks(completedTask.uploadId);
      controllersRef.current[taskKey] = null;
      updateTask(taskKey, { status: 'success', progress: 100 });
      const nextUploading = tasksRef.current.some((item) => item.key !== taskKey && item.status === 'uploading');
      setUploading(nextUploading);
      if (!nextUploading) {
        setFiles(null);
        setTasksState([]);
      }
      onUploaded();
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return;
      }

      updateTask(taskKey, { status: 'error' });
      setMessage(error.response?.data?.error || '上传失败，请稍后重试');
    } finally {
      controllersRef.current[taskKey] = null;
      syncUploadingState(tasksRef.current);
    }
  };

  const handlePrepareUpload = () => {
    if (!files || files.length === 0) return;
    setMessage('');

    const selectedFiles = Array.from(files);
    const nextTasks = selectedFiles.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      progress: 0,
      status: 'uploading' as const,
      file,
      currentChunkIndex: 0,
      totalChunks: Math.max(1, Math.ceil(file.size / CHUNK_SIZE))
    }));
    console.log('[FileUpload] prepare upload tasks', { nextTasks });
    setTasksState(nextTasks);
    setUploading(true);

    nextTasks.forEach((task) => {
      void uploadTask(task.key);
    });
  };

  const handleStart = async (taskKey: string) => {
    updateTask(taskKey, { status: 'uploading' });
    await uploadTask(taskKey);
    const allDone = tasksRef.current.every((task) => ['success', 'cancelled'].includes(task.status));
    if (allDone) {
      setMessage('上传任务已处理完成');
      setFiles(null);
      setTasksState([]);
      setUploading(false);
    }
  };

  const handlePause = (taskKey: string) => {
    controllersRef.current[taskKey]?.abort();
    updateTask(taskKey, { status: 'paused' });
  };

  const handleCancel = async (taskKey: string) => {
    const task = tasksRef.current.find((item) => item.key === taskKey);
    controllersRef.current[taskKey]?.abort();

    if (task?.uploadId) {
      try {
        await fileService.cancelUpload(task.uploadId);
      } catch (error) {
        // ignore cleanup failure to keep UI responsive
      }
    }

    updateTask(taskKey, { status: 'cancelled', progress: 0 });
    onUploaded();
    window.location.reload();
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
      <button onClick={handlePrepareUpload} disabled={uploading}>
        {tasks.length > 0 ? '重新选择任务' : '创建上传任务'}
      </button>
      {tasks.length > 0 && (
        <div className="upload-task-list">
          {tasks.map((task) => (
            <div key={task.key} className="upload-task-item">
              <div className="upload-task-header">
                <span className="file-name" title={task.name}>{task.name}</span>
                <span>{task.status} / {task.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-bar-inner ${task.status}`} style={{ width: `${task.progress}%` }} />
              </div>
              <div className="task-action-row">
                {(task.status === 'paused' || task.status === 'error') && (
                  <button type="button" onClick={() => handleStart(task.key)} disabled={uploading && task.status !== 'paused'}>
                    继续
                  </button>
                )}
                {task.status === 'uploading' && (
                  <button type="button" onClick={() => handlePause(task.key)}>暂停</button>
                )}
                {!['success', 'cancelled'].includes(task.status) && (
                  <button type="button" className="danger-button" onClick={() => handleCancel(task.key)}>终止</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {message && <p className={message.includes('完成') ? 'status-message success-text' : 'status-message error-text'}>{message}</p>}
    </div>
  );
}
