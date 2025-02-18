package com.memoryleak.ui;

import com.memoryleak.core.MemoryLeakDetector;
import com.memoryleak.core.MemorySnapshot;
import com.memoryleak.report.LeakReport;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Button;
import javafx.scene.control.Menu;
import javafx.scene.control.MenuBar;
import javafx.scene.control.MenuItem;
import javafx.scene.control.TextArea;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import javafx.scene.image.Image;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MainWindow extends Application {
    private MemoryLeakDetector detector;
    private LineChart<Number, Number> memoryChart;
    private XYChart.Series<Number, Number> memorySeries;
    private TextArea reportArea;
    private ScheduledExecutorService scheduler;
    private long startTime;

    @Override
    public void start(Stage stage) {
        detector = new MemoryLeakDetector();
        startTime = System.currentTimeMillis();

        // 创建内存使用图表
        final NumberAxis xAxis = new NumberAxis("时间 (秒)", 0, 60, 10);
        final NumberAxis yAxis = new NumberAxis("内存使用 (MB)", 0, 1000, 100);
        memoryChart = new LineChart<>(xAxis, yAxis);
        memoryChart.setTitle("实时内存监控");
        memoryChart.setAnimated(false);

        memorySeries = new XYChart.Series<>();
        memorySeries.setName("堆内存使用");
        memoryChart.getData().add(memorySeries);

        // 创建控制按钮
        Button startButton = new Button("开始监控");
        Button stopButton = new Button("停止监控");
        Button analyzeButton = new Button("分析内存");

        // 创建报告区域
        reportArea = new TextArea();
        reportArea.setEditable(false);
        reportArea.setPrefRowCount(10);

        // 创建菜单栏
        MenuBar menuBar = new MenuBar();
        Menu fileMenu = new Menu("文件");
        MenuItem exitItem = new MenuItem("退出");
        exitItem.setOnAction(e -> Platform.exit());
        fileMenu.getItems().add(exitItem);

        Menu helpMenu = new Menu("帮助");
        MenuItem aboutItem = new MenuItem("关于");
        aboutItem.setOnAction(e -> showAboutDialog());
        helpMenu.getItems().add(aboutItem);

        menuBar.getMenus().addAll(fileMenu, helpMenu);

        // 控制按钮区域
        VBox controlBox = new VBox(10);
        controlBox.setPadding(new Insets(10));
        controlBox.getChildren().addAll(memoryChart, startButton, stopButton, analyzeButton, reportArea);

        // 主布局
        BorderPane root = new BorderPane();
        root.setTop(menuBar);
        root.setCenter(controlBox);

        // 事件处理
        startButton.setOnAction(e -> startMonitoring());
        stopButton.setOnAction(e -> stopMonitoring());
        analyzeButton.setOnAction(e -> analyzeMemory());

        // 场景设置
        Scene scene = new Scene(root, 800, 600);
        // 设置窗口图标
        stage.getIcons().add(new Image(getClass().getResourceAsStream("/images/app_icon.png")));
        stage.setTitle("内存泄漏检测工具");
        stage.setScene(scene);
        stage.show();
    }

    private void startMonitoring() {
        detector.startMonitoring();
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::updateChart, 0, 1, TimeUnit.SECONDS);
    }

    private void stopMonitoring() {
        detector.stopMonitoring();
        if (scheduler != null) {
            scheduler.shutdown();
        }
    }

    private void updateChart() {
        MemorySnapshot snapshot = detector.takeSnapshot();
        final double timeInSeconds = (System.currentTimeMillis() - startTime) / 1000.0;
        final double memoryInMB = snapshot.getHeapUsage() / (1024.0 * 1024.0);

        Platform.runLater(() -> {
            memorySeries.getData().add(new XYChart.Data<>(timeInSeconds, memoryInMB));
            // 保持最近60秒的数据
            if (memorySeries.getData().size() > 60) {
                memorySeries.getData().remove(0);
            }
        });
    }

    private void analyzeMemory() {
        MemorySnapshot snapshot = detector.takeSnapshot();
        LeakReport report = detector.analyzeSnapshot(snapshot);
        Platform.runLater(() -> reportArea.setText(report.toString()));
    }

    @Override
    public void stop() {
        stopMonitoring();
    }

    public static void launch() {
        Application.launch(MainWindow.class);
    }
}