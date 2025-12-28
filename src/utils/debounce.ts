/**
 * 防抖工具函式
 * 
 * @description 用於延遲執行頻繁觸發的事件處理
 * @module utils/debounce
 */

/**
 * 防抖函式
 * 
 * @param fn - 要執行的函式
 * @param delay - 延遲時間（毫秒）
 * @returns 防抖後的函式
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 節流函式
 * 
 * @param fn - 要執行的函式
 * @param limit - 最小間隔時間（毫秒）
 * @returns 節流後的函式
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 可取消的防抖函式
 * 
 * @param fn - 要執行的函式
 * @param delay - 延遲時間（毫秒）
 * @returns 包含 cancel 方法的防抖函式
 */
export function debounceCancellable<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
  
  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}
