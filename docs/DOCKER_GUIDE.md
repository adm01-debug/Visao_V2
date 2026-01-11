# Docker Guide

## Development
```bash
docker-compose -f docker-compose.dev.yml up
```

## Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Build Image
```bash
docker build -t vis-o:latest .
```

## Environment Variables
Copy `.env.example` to `.env` and configure.

---
*Last updated: January 2026*
