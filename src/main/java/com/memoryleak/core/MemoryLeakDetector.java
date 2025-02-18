package com.memoryleak.core;

import net.bytebuddy.agent.ByteBuddyAgent;
import net.bytebuddy.implementation.MethodDelegation;
import net.bytebuddy.matcher.ElementMatchers;

import java.lang.instrument.Instrumentation;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

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
        Runtime runtime = Runtime.getRuntime();
        MemorySnapshot snapshot = new MemorySnapshot();
        snapshot.setTimestamp(System.currentTimeMillis());
        snapshot.setTotalMemory(runtime.totalMemory());
        snapshot.setFreeMemory(runtime.freeMemory());
        snapshot.setMaxMemory(runtime.maxMemory());
        snapshot.setHeapUsage(runtime.totalMemory() - runtime.freeMemory());
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
            
            // 计算内存增长率
            double growthRate = calculateGrowthRate(snapshot, previousSnapshot);
            report.setGrowthRate(growthRate);
            
            // 检测可能的内存泄漏
            if (memoryGrowth > 0) {
                report.setPotentialLeak(true);
                
                // 分析对象创建趋势
                Map<String, Integer> objectTypeCounts = analyzeObjectTypes();
                report.setObjectTypeCounts(objectTypeCounts);
                
                // 检测长期存活对象
                List<String> longLivedObjects = detectLongLivedObjects();
                if (!longLivedObjects.isEmpty()) {
                    report.addWarning("发现以下类型的对象可能存在内存泄漏:");
                    for (String objType : longLivedObjects) {
                        report.addWarning("- " + objType);
                    }
                }
                
                // 分析内存增长模式
                if (growthRate > 10.0) {
                    report.addWarning(String.format("内存增长率异常：%.2f%%/s", growthRate));
                }
                
                // 检测可疑的对象创建模式
                Map<Thread, Integer> threadAllocationMap = analyzeThreadAllocations();
                threadAllocationMap.forEach((thread, count) -> {
                    if (count > 1000) {
                        report.addWarning(String.format("线程 '%s' 创建了大量对象: %d", thread.getName(), count));
                    }
                });
                
                // 分析内存使用效率
                double memoryEfficiency = calculateMemoryEfficiency(snapshot);
                if (memoryEfficiency < 0.4) { // 内存使用效率低于40%
                    report.addWarning(String.format("内存使用效率较低：%.1f%%", memoryEfficiency * 100));
                }
            }
        }
        
        return report;
    }
    
    private double calculateMemoryEfficiency(MemorySnapshot snapshot) {
        return (double) snapshot.getHeapUsage() / snapshot.getTotalMemory();
    }
    
    private double calculateGrowthRate(MemorySnapshot current, MemorySnapshot previous) {
        long timeDiff = current.getTimestamp() - previous.getTimestamp();
        if (timeDiff == 0) return 0.0;
        
        double memoryDiff = current.getHeapUsage() - previous.getHeapUsage();
        return (memoryDiff / previous.getHeapUsage()) * 100.0 / (timeDiff / 1000.0);
    }
    
    private Map<String, Integer> analyzeObjectTypes() {
        Map<String, Integer> typeCounts = new ConcurrentHashMap<>();
        objectMap.forEach((id, info) -> {
            typeCounts.merge(info.className, 1, Integer::sum);
        });
        
        // 分析对象创建频率
        long currentTime = System.currentTimeMillis();
        Map<String, Double> creationRates = new ConcurrentHashMap<>();
        objectMap.values().forEach(info -> {
            long age = currentTime - info.creationTime;
            if (age > 0) {
                String className = info.className;
                double rate = 1000.0 / age; // 每秒创建率
                creationRates.merge(className, rate, Double::sum);
            }
        });

        // 标记高频创建的对象类型
        creationRates.forEach((className, rate) -> {
            if (rate > 10.0) { // 如果每秒创建超过10个
                typeCounts.merge(className, 1000, Integer::sum); // 提高权重
            }
        });
        
        return typeCounts;
    }
    
    private List<String> detectLongLivedObjects() {
        long currentTime = System.currentTimeMillis();
        long threshold = 60000; // 60秒
        Map<String, Integer> suspiciousObjects = new HashMap<>();
        
        objectMap.values().stream()
            .filter(info -> (currentTime - info.creationTime) > threshold)
            .forEach(info -> {
                suspiciousObjects.merge(info.className, 1, Integer::sum);
            });
        
        // 只返回具有多个实例的长期存活对象类型
        return suspiciousObjects.entrySet().stream()
            .filter(entry -> entry.getValue() >= 3) // 至少有3个实例
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
    
    private Map<Thread, Integer> analyzeThreadAllocations() {
        Map<Thread, Integer> threadCounts = new ConcurrentHashMap<>();
        Map<Thread, Set<String>> threadObjectTypes = new ConcurrentHashMap<>();
        
        objectMap.values().forEach(info -> {
            threadCounts.merge(info.creationThread, 1, Integer::sum);
            threadObjectTypes.computeIfAbsent(info.creationThread, k -> new HashSet<>())
                .add(info.className);
        });
        
        // 分析线程的对象分配模式
        threadObjectTypes.forEach((thread, types) -> {
            if (types.size() < 3 && threadCounts.get(thread) > 1000) {
                // 如果一个线程创建大量相同类型的对象，增加其计数以提高警告优先级
                threadCounts.merge(thread, 500, Integer::sum);
            }
        });
        
        return threadCounts;
    }

    private static volatile MemoryLeakDetector instance;

    public static MemoryLeakDetector getInstance() {
        if (instance == null) {
            synchronized (MemoryLeakDetector.class) {
                if (instance == null) {
                    instance = new MemoryLeakDetector();
                }
            }
        }
        return instance;
    }

    public Instrumentation getInstrumentation() {
        return instrumentation;
    }

    public void recordObjectCreation(String objectId, ObjectInfo info) {
        if (isMonitoring) {
            objectMap.put(objectId, info);
        }
    }

    public void recordLeakedActivity(String activityName, Activity activity) {
        if (isMonitoring) {
            // 记录泄漏的Activity信息
            ObjectInfo info = new ObjectInfo();
            info.className = activityName;
            info.creationThread = Thread.currentThread();
            info.creationTime = System.currentTimeMillis();
            info.isActivity = true;
            info.retainedInstance = activity;

            String objectId = activityName + "@" + System.identityHashCode(activity);
            objectMap.put(objectId, info);

            // 立即触发一次内存分析
            MemorySnapshot snapshot = takeSnapshot();
            LeakReport report = analyzeSnapshot(snapshot);
            report.addWarning(String.format("检测到Activity可能泄漏: %s", activityName));
        }
    }
}