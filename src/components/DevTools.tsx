import { lazy, Suspense } from "react";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

export const DevTools = () => {
  if (import.meta.env.PROD) return null;

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </Suspense>
  );
};

export default DevTools;
