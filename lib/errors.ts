export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

export function notFound(entity: string): AppError {
  return new AppError(`${entity} not found`, 404);
}

export function conflict(message: string): AppError {
  return new AppError(message, 409);
}

export function unauthorized(): AppError {
  return new AppError("Authentication required", 401);
}

export function forbidden(message = "You are not a member of this group"): AppError {
  return new AppError(message, 403);
}
