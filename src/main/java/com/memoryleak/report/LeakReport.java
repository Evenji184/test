package com.memoryleak.report;

import com.memoryleak.core.MemorySnapshot;

import java.util.ArrayList;
import java.util.List;

public class LeakReport {
    private MemorySnapshot snapshot;
    private long memoryGrowth;
    private boolean potentialLeak;
    private final List<String> warnings;
    private double growthRate;
    private Map<String, Integer> objectTypeCounts;

    public LeakReport() {
        this.warnings = new ArrayList<>();
        this.potentialLeak = false;
    }

    public MemorySnapshot getSnapshot() {
        return snapshot;
    }

    public void setSnapshot(MemorySnapshot snapshot) {
        this.snapshot = snapshot;
    }

    public long getMemoryGrowth() {
        return memoryGrowth;
    }

    public void setMemoryGrowth(long memoryGrowth) {
        this.memoryGrowth = memoryGrowth;
    }

    public boolean isPotentialLeak() {
        return potentialLeak;
    }

    public void setPotentialLeak(boolean potentialLeak) {
        this.potentialLeak = potentialLeak;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void addWarning(String warning) {
        this.warnings.add(warning);
    }

    public void setGrowthRate(double growthRate) {
        this.growthRate = growthRate;
    }

    public void setObjectTypeCounts(Map<String, Integer> objectTypeCounts) {
        this.objectTypeCounts = objectTypeCounts;
    }

    @Override
    public String toString() {
        StringBuilder report = new StringBuilder();
        report.append("内存泄漏分析报告\n");
        report.append("=================\n");
        report.append(snapshot.toString()).append("\n");
        report.append(String.format("内存增长: %d bytes\n", memoryGrowth));
        report.append(String.format("内存增长率: %.2f%%/s\n", growthRate));
        
        if (potentialLeak) {
            report.append("\n对象创建统计:\n");
            if (objectTypeCounts != null) {
                objectTypeCounts.entrySet().stream()
                    .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                    .limit(5)
                    .forEach(entry -> {
                        report.append(String.format("- %s: %d 个实例\n", 
                            entry.getKey(), entry.getValue()));
                    });
            }
            
            report.append("\n警告:\n");
            for (String warning : warnings) {
                report.append("- ").append(warning).append("\n");
            }
        } else {
            report.append("\n未检测到明显的内存泄漏\n");
        }
        
        return report.toString();
    }
}