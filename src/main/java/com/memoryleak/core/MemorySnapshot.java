package com.memoryleak.core;

public class MemorySnapshot {
    private long timestamp;
    private long heapUsage;
    private int objectCount;
    private long totalMemory;
    private long freeMemory;
    private long maxMemory;
    private double memoryUsagePercentage;

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

    public long getTotalMemory() {
        return totalMemory;
    }

    public void setTotalMemory(long totalMemory) {
        this.totalMemory = totalMemory;
        updateMemoryUsagePercentage();
    }

    public long getFreeMemory() {
        return freeMemory;
    }

    public void setFreeMemory(long freeMemory) {
        this.freeMemory = freeMemory;
        updateMemoryUsagePercentage();
    }

    public long getMaxMemory() {
        return maxMemory;
    }

    public void setMaxMemory(long maxMemory) {
        this.maxMemory = maxMemory;
        updateMemoryUsagePercentage();
    }

    public double getMemoryUsagePercentage() {
        return memoryUsagePercentage;
    }

    private void updateMemoryUsagePercentage() {
        if (totalMemory > 0) {
            this.memoryUsagePercentage = ((double)(totalMemory - freeMemory) / totalMemory) * 100;
        }
    }

    @Override
    public String toString() {
        return String.format("内存快照[时间: %d\n总内存: %.2f MB\n已用内存: %.2f MB\n空闲内存: %.2f MB\n内存使用率: %.2f%%\n对象数量: %d]",
                timestamp,
                totalMemory / (1024.0 * 1024.0),
                (totalMemory - freeMemory) / (1024.0 * 1024.0),
                freeMemory / (1024.0 * 1024.0),
                memoryUsagePercentage,
                objectCount);
    }
}