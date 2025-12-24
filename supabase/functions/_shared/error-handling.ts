export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export function handleError(error: unknown): Response {
  console.error("Error:", error);

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: error.statusCode, headers: { "Content-Type": "application/json" } }
    );
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  return new Response(
    JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
