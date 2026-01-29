/**
 * Custom error types for authentication and service failures
 * Following architecture rules: Section 7 - Error Handling Standards
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "AUTH_ERROR", 401, originalError);
    this.name = "AuthenticationError";
  }
}

export class DatabaseError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "DATABASE_ERROR", 500, originalError);
    this.name = "DatabaseError";
  }
}

export class NetworkError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "NETWORK_ERROR", 0, originalError);
    this.name = "NetworkError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "VALIDATION_ERROR", 400, originalError);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "NOT_FOUND_ERROR", 404, originalError);
    this.name = "NotFoundError";
  }
}

export class PermissionError extends ServiceError {
  constructor(message: string, originalError?: any) {
    super(message, "PERMISSION_ERROR", 403, originalError);
    this.name = "PermissionError";
  }
}

/**
 * Helper function to handle and categorize service errors
 * @param error - The error to handle
 * @param context - Optional context message to prepend
 * @throws {ServiceError} - Always throws a ServiceError or subclass
 */
export function handleServiceError(error: any, context?: string): never {
  const contextMessage = context ? `${context}: ` : "";

  // If it's already a ServiceError, re-throw it
  if (error instanceof ServiceError) {
    throw error;
  }

  // Handle Supabase errors
  if (error?.code) {
    switch (error.code) {
      case "PGRST301":
      case "PGRST116":
        throw new NotFoundError(`${contextMessage}Resource not found`, error);
      case "PGRST204":
        throw new PermissionError(
          `${contextMessage}Insufficient permissions`,
          error
        );
      case "23505":
        throw new ValidationError(`${contextMessage}Duplicate entry`, error);
      case "23503":
        throw new ValidationError(`${contextMessage}Invalid reference`, error);
      default:
        throw new DatabaseError(
          `${contextMessage}Database error: ${error.message}`,
          error
        );
    }
  }

  // Handle network errors
  if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
    throw new NetworkError(`${contextMessage}Network connection failed`, error);
  }

  // Handle authentication errors
  if (error?.status === 401 || error?.message?.includes("auth")) {
    throw new AuthenticationError(
      `${contextMessage}Authentication failed`,
      error
    );
  }

  // Generic service error
  throw new ServiceError(
    `${contextMessage}${error?.message || "Unknown service error"}`,
    "UNKNOWN_ERROR",
    error?.status,
    error
  );
}
