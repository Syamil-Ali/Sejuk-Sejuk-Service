export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = "APP_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function readableError(error: unknown) {
  if (error instanceof AppError || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
