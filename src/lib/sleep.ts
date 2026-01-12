/**
 * Sleep Utility
 * @module lib/sleep
 */

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sleepUntil(condition: () => boolean, interval = 100, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

export default { sleep, sleepUntil };
