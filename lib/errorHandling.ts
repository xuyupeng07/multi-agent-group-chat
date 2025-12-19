// 全局错误处理工具

// 处理未捕获的Promise拒绝
export const setupGlobalErrorHandlers = () => {
  // 处理未捕获的Promise拒绝
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 防止默认的控制台错误输出
    event.preventDefault();
    
    // 这里可以添加错误报告逻辑，如发送到错误追踪服务
    // reportError(event.reason);
  };

  // 处理全局JavaScript错误
  const handleGlobalError = (event: ErrorEvent) => {
    console.error('全局JavaScript错误:', event.error);
    
    // 这里可以添加错误报告逻辑
    // reportError(event.error);
  };

  // 注册事件监听器
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleGlobalError);

  // 返回清理函数，用于移除事件监听器
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleGlobalError);
  };
};

// 错误报告函数（可根据需要实现）
export const reportError = (error: Error, context?: string) => {
  // 这里可以实现错误报告逻辑，如发送到错误追踪服务
  console.error('报告错误:', error, context);
  
  // 示例：发送到错误追踪服务
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     message: error.message,
  //     stack: error.stack,
  //     context,
  //     timestamp: new Date().toISOString(),
  //     userAgent: navigator.userAgent,
  //     url: window.location.href
  //   })
  // }).catch(err => console.error('错误报告失败:', err));
};

// 创建带重试功能的异步函数包装器
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // 计算延迟时间（指数退避）
      const currentDelay = delay * Math.pow(backoff, i);
      console.warn(`操作失败，${currentDelay}ms后重试 (${i + 1}/${maxRetries}):`, error);
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
};

// 创建带超时的Promise包装器
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error(`操作超时 (${timeoutMs}ms)`)
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(timeoutError), timeoutMs);
    })
  ]);
};