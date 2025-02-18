package com.memoryleak.core;

public class MemorySnapshot {
    private long timestamp;
    private long heapUsage;
    private int objectCount;

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public long getHeapUsage() {
        return heapUsage;
    }

    public void setHeapUsage(long heapUsage) {
        this.heapUsage = heapUsage;
    }

    public int getObjectCount() {
        return objectCount;
    }

    public void setObjectCount(int objectCount) {
        this.objectCount = objectCount;
    }

    @Override
    public String toString() {
        return String.format("内存快照[时间: %d, 堆内存使用: %d bytes, 对象数量: %d]",
                timestamp, heapUsage, objectCount);
    }
}