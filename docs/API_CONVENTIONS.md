# API Conventions

## Endpoints
- `GET /api/resource` - List
- `GET /api/resource/:id` - Get one
- `POST /api/resource` - Create
- `PUT /api/resource/:id` - Update
- `DELETE /api/resource/:id` - Delete

## Response Format
```json
{
  "data": {},
  "meta": { "total": 100 },
  "error": null
}
```

## Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```

## Status Codes
- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 500 - Server Error

---
*Last updated: January 2026*
