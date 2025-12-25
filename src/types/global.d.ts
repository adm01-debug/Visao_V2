declare global {
  interface Window { __REDUX_DEVTOOLS_EXTENSION__?: () => unknown; }
  type Nullable<T> = T | null;
  type Optional<T> = T | undefined;
}
export {};
