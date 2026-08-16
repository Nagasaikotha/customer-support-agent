// error + status code bundled together. throw these for anything expected
// (not found, bad input, etc) and the error middleware does the rest -
// no per-route try/catch needed
export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const NotFoundError = (resource: string) => new AppError(404, `${resource} not found`);
export const UnauthorizedError = (message = "Unauthorized") => new AppError(401, message);
export const BadRequestError = (message: string) => new AppError(400, message);
export const ForbiddenError = (message = "Forbidden") => new AppError(403, message);
export const TooManyRequestsError = (message = "Too many requests") => new AppError(429, message);
