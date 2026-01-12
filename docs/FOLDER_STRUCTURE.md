# Folder Structure

```
vis-o/
├── .github/              # GitHub configs
│   ├── workflows/        # CI/CD workflows
│   └── ISSUE_TEMPLATE/   # Issue templates
├── .storybook/           # Storybook config
├── docs/                 # Documentation
├── k8s/                  # Kubernetes configs
├── public/               # Static assets
├── scripts/              # Utility scripts
├── src/
│   ├── components/       # React components
│   │   ├── common/       # Shared components
│   │   ├── feedback/     # Feedback components
│   │   ├── layout/       # Layout components
│   │   └── ui/           # UI primitives
│   ├── config/           # App configuration
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── i18n/             # Internationalization
│   │   └── locales/      # Translation files
│   ├── integrations/     # External integrations
│   ├── lib/              # Utilities & helpers
│   ├── pages/            # Page components
│   ├── providers/        # Context providers
│   ├── services/         # API services
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── supabase/
│   ├── functions/        # Edge functions
│   └── migrations/       # Database migrations
└── tests/
    ├── e2e/              # End-to-end tests
    └── integration/      # Integration tests
```

## Conventions

- **Components**: PascalCase (e.g., `Button.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utils**: camelCase (e.g., `formatDate.ts`)
- **Tests**: Same name + `.test.ts` suffix
- **Stories**: Same name + `.stories.tsx` suffix

---

*Last updated: January 2026*
