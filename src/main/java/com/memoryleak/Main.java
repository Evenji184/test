package com.memoryleak;

import com.memoryleak.core.MemoryLeakDetector;
import com.memoryleak.core.MemorySnapshot;
import com.memoryleak.report.LeakReport;
import com.memoryleak.visualization.MemoryChart;

public class Main {
    public static void main(String[] args) {
        System.out.println("内存泄漏检测工具启动...");
        MainWindow.launch();
    }
}