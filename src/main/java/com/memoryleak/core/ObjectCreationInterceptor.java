package com.memoryleak.core;

import net.bytebuddy.implementation.bind.annotation.Origin;
import net.bytebuddy.implementation.bind.annotation.RuntimeType;
import net.bytebuddy.implementation.bind.annotation.SuperCall;
import net.bytebuddy.implementation.bind.annotation.This;

import java.lang.reflect.Method;
import java.util.concurrent.Callable;

public class ObjectCreationInterceptor {
    @RuntimeType
    public static Object intercept(@This Object obj,
                                 @Origin Method method,
                                 @SuperCall Callable<?> superCall) throws Exception {
        // 调用原始构造方法
        Object result = superCall.call();
        
        // 记录对象创建信息
        String objectId = System.identityHashCode(result) + "@" + result.getClass().getName();
        MemoryLeakDetector.getInstance().recordObjectCreation(objectId, new ObjectInfo(result));
        
        return result;
    }
}