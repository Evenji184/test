package com.memoryleak.visualization;

import com.memoryleak.report.LeakReport;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.ChartUtils;
import org.jfree.chart.JFreeChart;
import org.jfree.data.time.Second;
import org.jfree.data.time.TimeSeries;
import org.jfree.data.time.TimeSeriesCollection;

import java.io.File;
import java.io.IOException;
import java.util.Date;

public class MemoryChart {
    public static void createChart(LeakReport report) {
        // 创建时间序列数据集
        TimeSeries series = new TimeSeries("堆内存使用");
        series.add(new Second(new Date(report.getSnapshot().getTimestamp())),
                report.getSnapshot().getHeapUsage() / (1024.0 * 1024.0)); // 转换为MB

        TimeSeriesCollection dataset = new TimeSeriesCollection();
        dataset.addSeries(series);

        // 创建图表
        JFreeChart chart = ChartFactory.createTimeSeriesChart(
                "内存使用趋势",
                "时间",
                "内存使用量 (MB)",
                dataset,
                true,
                true,
                false
        );

        try {
            // 保存图表为PNG文件
            ChartUtils.saveChartAsPNG(
                    new File("memory_usage.png"),
                    chart,
                    800,  // 宽度
                    600   // 高度
            );
            System.out.println("内存使用趋势图已保存为 memory_usage.png");
        } catch (IOException e) {
            System.err.println("保存图表时发生错误: " + e.getMessage());
        }
    }
}