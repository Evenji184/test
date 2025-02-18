package com.memoryleak;

import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.memoryleak.core.MemoryLeakDetector;
import com.memoryleak.core.MemorySnapshot;
import com.memoryleak.report.LeakReport;

public class AnalysisActivity extends AppCompatActivity {
    private TextView memoryOverviewText;
    private TextView leakAnalysisText;
    private Button closeButton;
    private MemoryLeakDetector detector;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_analysis);

        memoryOverviewText = findViewById(R.id.memoryOverviewText);
        leakAnalysisText = findViewById(R.id.leakAnalysisText);
        closeButton = findViewById(R.id.closeButton);
        detector = new MemoryLeakDetector();

        // 获取并分析内存快照
        MemorySnapshot snapshot = detector.takeSnapshot();
        LeakReport report = detector.analyzeSnapshot(snapshot);

        // 显示内存概览
        String overview = String.format("当前内存使用情况:\n总内存: %.2f MB\n已用内存: %.2f MB\n空闲内存: %.2f MB",
                snapshot.getTotalMemory() / (1024.0 * 1024.0),
                snapshot.getUsedMemory() / (1024.0 * 1024.0),
                snapshot.getFreeMemory() / (1024.0 * 1024.0));
        memoryOverviewText.setText(overview);

        // 显示泄漏分析结果
        leakAnalysisText.setText(report.toString());

        // 设置关闭按钮点击事件
        closeButton.setOnClickListener(v -> finish());
    }
}