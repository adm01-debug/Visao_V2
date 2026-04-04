import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "isSecureContext", { value: true });

// Mock crypto.subtle for security utils
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    subtle: {
      digest: async (_algo: string, data: ArrayBuffer) => {
        const arr = new Uint8Array(32);
        const view = new Uint8Array(data);
        for (let i = 0; i < 32; i++) arr[i] = (view[i % view.length] ?? 0) ^ (i * 7);
        return arr.buffer;
      },
    },
  },
});
