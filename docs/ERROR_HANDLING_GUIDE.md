# Error Handling Guide

## Overview

VIS-O uses a centralized error handling system.

## Error Boundary

Wrap components with ErrorBoundary:
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</ErrorBoundary>
```

## Error Reporting

```tsx
import { reportError } from '@/lib/errorReporting';

try {
  await riskyOperation();
} catch (error) {
  reportError(error, { context: 'user action' });
}
```

## Crash Detection

```tsx
import { setupCrashDetection } from '@/lib/crashReporting';
setupCrashDetection();
```

## Best Practices

1. Never expose stack traces to users
2. Log errors with context
3. Provide user-friendly messages
4. Implement retry logic for transient failures

## Error Types

| Type | Action |
|------|--------|
| Network | Retry with backoff |
| Auth | Redirect to login |
| Validation | Show field errors |
| Server | Show generic message |

---
*Last updated: January 2026*
