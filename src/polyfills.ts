// Polyfill Promise.try globally for PDF.js v6+ and modern ESM runtimes
const promiseTryPolyfill = function <T>(fn: (...args: any[]) => T | PromiseLike<T>, ...args: any[]): Promise<T> {
  return new Promise(resolve => {
    resolve(fn(...args));
  });
};

if (typeof Promise !== 'undefined' && typeof (Promise as any).try !== 'function') {
  (Promise as any).try = promiseTryPolyfill;
}

if (typeof globalThis !== 'undefined' && globalThis.Promise && typeof (globalThis.Promise as any).try !== 'function') {
  (globalThis.Promise as any).try = promiseTryPolyfill;
}

if (typeof global !== 'undefined' && (global as any).Promise && typeof ((global as any).Promise as any).try !== 'function') {
  ((global as any).Promise as any).try = promiseTryPolyfill;
}

export {};
