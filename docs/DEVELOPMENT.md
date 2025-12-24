# Development Guide

## Prerequisites

- Node.js 18+
- npm 9+
- Docker (optional)
- Supabase CLI (optional)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/adm01-debug/vis-o.git
cd vis-o
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Start Development Server

```bash
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run storybook` | Start Storybook |

## Project Structure

```
src/
├── components/     # React components
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── lib/            # Utility libraries
├── pages/          # Page components
├── services/       # API services
├── stores/         # State management
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Code Style

- Use TypeScript for all new files
- Follow ESLint rules
- Use Prettier for formatting
- Write tests for new features

## Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Open Pull Request
4. Wait for CI checks
5. Request review
6. Merge after approval

## Troubleshooting

### Common Issues

1. **Port already in use**: Kill process on port 5173
2. **Module not found**: Run `npm install`
3. **Type errors**: Run `npm run typecheck`

## Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
