package com.memoryleak.core;

import net.bytebuddy.agent.ByteBuddyAgent;
import net.bytebuddy.implementation.MethodDelegation;
import net.bytebuddy.matcher.ElementMatchers;

import java.lang.instrument.Instrumentation;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MemoryLeakDetector {
    private final Map<String, ObjectInfo> objectMap;
    private final List<MemorySnapshot> snapshots;
    private volatile boolean isMonitoring;
    private final Instrumentation instrumentation;

    public MemoryLeakDetector() {
        this.objectMap = new ConcurrentHashMap<>();
        this.snapshots = new ArrayList<>();
        this.isMonitoring = false;
        this.instrumentation = ByteBuddyAgent.install();
    }

    public void startMonitoring() {
        if (!isMonitoring) {
            isMonitoring = true;
            // 使用ByteBuddy注入监控代码
            new net.bytebuddy.ByteBuddy()
                .redefine(Object.class)
                .method(ElementMatchers.isConstructor())
                .intercept(MethodDelegation.to(ObjectCreationInterceptor.class))
                .make()
                .load(Object.class.getClassLoader(), instrumentation);
        }
    }

    public void stopMonitoring() {
        isMonitoring = false;
    }

    public MemorySnapshot takeSnapshot() {
        MemorySnapshot snapshot = new MemorySnapshot();
        snapshot.setTimestamp(System.currentTimeMillis());
        snapshot.setHeapUsage(Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());
        snapshot.setObjectCount(objectMap.size());
        snapshots.add(snapshot);
        return snapshot;
    }

    public LeakReport analyzeSnapshot(MemorySnapshot snapshot) {
        LeakReport report = new LeakReport();
        report.setSnapshot(snapshot);
        
        // 分析内存增长趋势
        if (snapshots.size() > 1) {
            MemorySnapshot previousSnapshot = snapshots.get(snapshots.size() - 2);
            long memoryGrowth = snapshot.getHeapUsage() - previousSnapshot.getHeapUsage();
            report.setMemoryGrowth(memoryGrowth);
            
            // 检测可能的内存泄漏
            if (memoryGrowth > 0) {
                report.setPotentialLeak(true);
                report.addWarning("检测到持续的内存增长，可能存在内存泄漏");
            }
        }
        
        return report;
    }

    // 用于记录对象创建信息的内部类
    private static class ObjectInfo {
        private final String className;
        private final long creationTime;
        private final Thread creationThread;

        public ObjectInfo(Object obj) {
            this.className = obj.getClass().getName();
            this.creationTime = System.currentTimeMillis();
            this.creationThread = Thread.currentThread();
        }
    }
}