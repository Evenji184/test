package com.memoryleak;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;

import androidx.appcompat.app.AppCompatActivity;

import com.github.mikephil.charting.charts.LineChart;
import com.github.mikephil.charting.components.XAxis;
import com.github.mikephil.charting.components.YAxis;
import com.github.mikephil.charting.data.Entry;
import com.github.mikephil.charting.data.LineData;
import com.github.mikephil.charting.data.LineDataSet;

import com.memoryleak.core.MemoryLeakDetector;
import com.memoryleak.core.MemorySnapshot;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private LineChart memoryChart;
    private Button startButton;
    private MemoryLeakDetector detector;
    private Handler handler;
    private boolean isMonitoring = false;
    private List<Entry> memoryEntries;
    private LineDataSet dataSet;
    private LineData lineData;
    private int timeCounter = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        memoryChart = findViewById(R.id.memoryChart);
        startButton = findViewById(R.id.startButton);
        handler = new Handler(Looper.getMainLooper());
        detector = MemoryLeakDetector.getInstance(); // 使用单例模式
        memoryEntries = new ArrayList<>();

        setupChart();
        setupButton();
    }

    private void setupChart() {
        memoryChart.getDescription().setEnabled(false);
        memoryChart.setTouchEnabled(true);
        memoryChart.setDragEnabled(true);
        memoryChart.setScaleEnabled(true);

        XAxis xAxis = memoryChart.getXAxis();
        xAxis.setPosition(XAxis.XAxisPosition.BOTTOM);
        xAxis.setDrawGridLines(false);
        xAxis.setLabelRotationAngle(0);

        YAxis leftAxis = memoryChart.getAxisLeft();
        leftAxis.setAxisMinimum(0f);
        leftAxis.setDrawGridLines(true);
        leftAxis.enableGridDashedLine(10f, 10f, 0f);
        memoryChart.getAxisRight().setEnabled(false);

        dataSet = new LineDataSet(memoryEntries, "内存使用量 (MB)");
        dataSet.setColor(Color.BLUE);
        dataSet.setCircleColor(Color.BLUE);
        dataSet.setDrawValues(false);
        dataSet.setLineWidth(2f);
        dataSet.setCircleRadius(4f);
        dataSet.setDrawCircleHole(true);
        dataSet.setValueTextSize(9f);
        dataSet.setDrawFilled(true);
        dataSet.setFillColor(Color.parseColor("#4D0000FF"));

        lineData = new LineData(dataSet);
        memoryChart.setData(lineData);
        memoryChart.getLegend().setEnabled(true);
        memoryChart.invalidate();
    }

    private void setupButton() {
        startButton.setOnClickListener(v -> {
            if (!isMonitoring) {
                startMonitoring();
                startButton.setText("停止检测");
            } else {
                stopMonitoring();
                startButton.setText("开始检测");
            }
            isMonitoring = !isMonitoring;
        });

        Button analyzeButton = findViewById(R.id.analyzeButton);
        analyzeButton.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, AnalysisActivity.class);
            startActivity(intent);
        });
    }

    private void startMonitoring() {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (isMonitoring) {
                    MemorySnapshot snapshot = detector.takeSnapshot();
                    float memoryUsage = snapshot.getUsedMemory() / (1024f * 1024f); // Convert to MB
                    memoryEntries.add(new Entry(timeCounter++, memoryUsage));

                    // 限制数据点数量，保持图表流畅
                    if (memoryEntries.size() > 60) {
                        memoryEntries.remove(0);
                        timeCounter = 60;
                        for (int i = 0; i < memoryEntries.size(); i++) {
                            memoryEntries.get(i).setX(i);
                        }
                    }

                    dataSet.notifyDataSetChanged();
                    lineData.notifyDataChanged();
                    memoryChart.notifyDataSetChanged();
                    memoryChart.invalidate();

                    handler.postDelayed(this, 1000); // Update every second
                }
            }
        });
    }

    private void stopMonitoring() {
        handler.removeCallbacksAndMessages(null);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopMonitoring();
    }
}