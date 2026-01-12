# Custom Hooks Guide

## Overview

VIS-O provides a comprehensive set of custom hooks for common functionality.

## Available Hooks

### State Management

#### useToggle
```tsx
const [isOpen, toggle, setIsOpen] = useToggle(false);
```

#### useDisclosure
```tsx
const { isOpen, open, close, toggle } = useDisclosure();
```

### Data Fetching

#### useFetch
```tsx
const { data, error, isLoading, refetch } = useFetch('/api/data');
```

#### useAsync
```tsx
const { data, error, isLoading, execute } = useAsync<Data>();
await execute(fetchData);
```

### Forms

#### useForm
```tsx
const { values, errors, handleChange, handleSubmit } = useForm({
  initialValues: { email: '' },
  validate: (values) => ({}),
  onSubmit: (values) => {},
});
```

### Browser APIs

#### useScript
```tsx
const status = useScript('https://cdn.example.com/script.js');
```

#### useTitle
```tsx
useTitle('Page Title'); // Sets document title
```

### Performance

#### useVirtualList
```tsx
const { virtualItems, containerProps } = useVirtualList({
  items: largeArray,
  itemHeight: 50,
});
```

#### useIntersectionObserver
```tsx
const { ref, isVisible } = useIntersectionObserver();
```

## Best Practices

1. Always provide TypeScript types
2. Handle cleanup in useEffect
3. Memoize callbacks with useCallback
4. Use proper dependency arrays

---

*Last updated: January 2026*
