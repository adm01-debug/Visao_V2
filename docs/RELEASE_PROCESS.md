# Release Process

## Version Numbering
We use Semantic Versioning (SemVer):
- MAJOR.MINOR.PATCH

## Steps

1. **Update Version**
   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**
   Add entry to CHANGELOG.md

3. **Create PR**
   - Title: `release: vX.Y.Z`
   - Update docs if needed

4. **Merge & Tag**
   After approval, merge and tag is created automatically.

5. **Deploy**
   CI/CD deploys to production.

## Hotfix Process

1. Branch from `main`
2. Fix issue
3. PR to `main`
4. Deploy immediately

---
*Last updated: January 2026*
