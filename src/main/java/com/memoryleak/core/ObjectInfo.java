package com.memoryleak.core;

import java.lang.ref.WeakReference;

public class ObjectInfo {
    private final String className;
    private final long creationTime;
    private final Thread creationThread;
    private final WeakReference<Object> objectRef;
    private final long initialSize;
    private long lastAccessTime;
    private int accessCount;

    public ObjectInfo(Object obj) {
        this.className = obj.getClass().getName();
        this.creationTime = System.currentTimeMillis();
        this.creationThread = Thread.currentThread();
        this.objectRef = new WeakReference<>(obj);
        this.initialSize = calculateObjectSize(obj);
        this.lastAccessTime = this.creationTime;
        this.accessCount = 1;
    }

    public String getClassName() {
        return className;
    }

    public long getCreationTime() {
        return creationTime;
    }

    public Thread getCreationThread() {
        return creationThread;
    }

    public WeakReference<Object> getObjectRef() {
        return objectRef;
    }

    public long getInitialSize() {
        return initialSize;
    }

    public long getLastAccessTime() {
        return lastAccessTime;
    }

    public void updateAccessTime() {
        this.lastAccessTime = System.currentTimeMillis();
        this.accessCount++;
    }

    public int getAccessCount() {
        return accessCount;
    }

    public boolean isAlive() {
        return objectRef.get() != null;
    }

    public long getLifespan() {
        return System.currentTimeMillis() - creationTime;
    }

    private long calculateObjectSize(Object obj) {
        try {
            // 使用 Java Agent 的 Instrumentation 获取对象大小
            return MemoryLeakDetector.getInstance().getInstrumentation().getObjectSize(obj);
        } catch (Exception e) {
            return -1; // 如果无法获取大小，返回-1
        }
    }

    @Override
    public String toString() {
        return String.format("%s (created by %s, age: %d ms, size: %d bytes)",
            className, creationThread.getName(), getLifespan(), initialSize);
    }
}