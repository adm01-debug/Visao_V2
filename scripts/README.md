# Scripts

Utility scripts for VIS-O development and operations.

## Available Scripts

| Script | Description |
|--------|-------------|
| `setup.sh` | Initial project setup |
| `clean.sh` | Clean build artifacts |
| `analyze-bundle.sh` | Analyze bundle size |
| `health-check.sh` | Check application health |
| `generate-types.sh` | Generate TypeScript types from Supabase |

## Usage

```bash
# Make executable
chmod +x scripts/*.sh

# Run script
./scripts/setup.sh
```

## Adding New Scripts

1. Create script in `scripts/` directory
2. Add shebang (`#!/bin/bash`)
3. Make executable
4. Document in this README
