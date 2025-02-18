package com.memoryleak.core;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;

public class ActivityLifecycleTracker implements Application.ActivityLifecycleCallbacks {
    private final Map<String, ActivityInfo> activityMap;
    private final Handler handler;
    private final MemoryLeakDetector detector;
    private static final long DESTROY_TIMEOUT = 5000; // 5秒

    public ActivityLifecycleTracker(MemoryLeakDetector detector) {
        this.activityMap = new HashMap<>();
        this.handler = new Handler(Looper.getMainLooper());
        this.detector = detector;
    }

    @Override
    public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        String activityName = activity.getClass().getName();
        ActivityInfo info = new ActivityInfo(activity);
        activityMap.put(activityName, info);
    }

    @Override
    public void onActivityStarted(Activity activity) {
        // 记录Activity启动时间
        String activityName = activity.getClass().getName();
        ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            info.startTime = System.currentTimeMillis();
        }
    }

    @Override
    public void onActivityResumed(Activity activity) {
        String activityName = activity.getClass().getName();
        ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            // 记录Activity恢复时的内存使用情况
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();
            detector.recordMemoryUsage(activityName, "resumed", usedMemory);
        }
    }

    @Override
    public void onActivityPaused(Activity activity) {
        String activityName = activity.getClass().getName();
        ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            // 记录Activity暂停时的性能指标
            long duration = System.currentTimeMillis() - info.startTime;
            detector.recordActivityDuration(activityName, "active", duration);
        }
    }

    @Override
    public void onActivityStopped(Activity activity) {
        String activityName = activity.getClass().getName();
        ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            // 检查Activity停止时的对象引用情况
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();
            detector.recordMemoryUsage(activityName, "stopped", usedMemory);
            
            // 触发GC以检测可能的内存泄漏
            System.gc();
            handler.postDelayed(() -> {
                if (info.activityRef.get() != null) {
                    detector.recordPotentialLeak(activityName, "stopped_state");
                }
            }, 1000);
        }
    }

    @Override
    public void onActivitySaveInstanceState(Activity activity, Bundle outState) {
        String activityName = activity.getClass().getName();
        ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            // 记录状态保存时的内存使用情况
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();
            detector.recordMemoryUsage(activityName, "save_state", usedMemory);
            
            // 检查对象引用状态
            WeakReference<Activity> weakRef = info.activityRef;
            Activity retainedActivity = weakRef.get();
            if (retainedActivity != null) {
                // 记录状态保存时的对象引用情况
                detector.recordObjectState(activityName, "save_state", outState.size());
            }
        }
    }

    @Override
    public void onActivityDestroyed(Activity activity) {
        final String activityName = activity.getClass().getName();
        final ActivityInfo info = activityMap.get(activityName);
        if (info != null) {
            info.destroyTime = System.currentTimeMillis();
            
            // 延迟检查Activity是否被正确回收
            handler.postDelayed(() -> {
                WeakReference<Activity> weakRef = info.activityRef;
                Activity retainedActivity = weakRef.get();
                
                if (retainedActivity != null) {
                    // Activity在销毁后仍然被引用，可能存在内存泄漏
                    detector.recordLeakedActivity(activityName, retainedActivity);
                }
            }, DESTROY_TIMEOUT);
        }
    }

    private static class ActivityInfo {
        WeakReference<Activity> activityRef;
        long startTime;
        long destroyTime;

        ActivityInfo(Activity activity) {
            this.activityRef = new WeakReference<>(activity);
            this.startTime = System.currentTimeMillis();
        }
    }

    public void register(Application application) {
        application.registerActivityLifecycleCallbacks(this);
    }

    public void unregister(Application application) {
        application.unregisterActivityLifecycleCallbacks(this);
    }
}