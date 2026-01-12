# Routing Guide

## Overview

VIS-O uses React Router for client-side routing.

## Route Structure

```
/                    - Dashboard
/cameras             - Camera list
/cameras/:id         - Camera detail
/alerts              - Alerts
/recordings          - Recordings
/analytics           - Analytics
/settings            - Settings
/login               - Login
```

## Protected Routes

```tsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```

## Route Parameters

```tsx
// In component
const { id } = useParams();

// In navigation
navigate(`/cameras/${camera.id}`);
```

## Query Parameters

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get('page') || '1';
```

## Navigation

```tsx
import { useNavigate, Link } from 'react-router-dom';

// Programmatic
const navigate = useNavigate();
navigate('/dashboard');

// Declarative
<Link to="/cameras">Cameras</Link>
```

## Lazy Loading

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

---

*Last updated: January 2026*
