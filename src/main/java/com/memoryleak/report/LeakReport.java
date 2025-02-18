package com.memoryleak.report;

import com.memoryleak.core.MemorySnapshot;

import java.util.ArrayList;
import java.util.List;

public class LeakReport {
    private MemorySnapshot snapshot;
    private long memoryGrowth;
    private boolean potentialLeak;
    private final List<String> warnings;

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

    @Override
    public String toString() {
        StringBuilder report = new StringBuilder();
        report.append("内存泄漏分析报告\n");
        report.append("=================\n");
        report.append(snapshot.toString()).append("\n");
        report.append(String.format("内存增长: %d bytes\n", memoryGrowth));
        
        if (potentialLeak) {
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