export class AppError extends Error {
  /**
   * Creates a new application error.
   *
   * @param statusCode - HTTP status code associated with the error.
   * @param message - Human-readable error message.
   * @param isOperational - Indicates whether this error is expected
   *                        and safe to handle gracefully.
   *                        Defaults to `true`.
   * @param details - Indicates the details of the error
   */
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
    public isOperational: boolean = true
  ) {
    super(message)

    // Set the error name to the class name
    this.name = this.constructor.name

    // Exclude constructor from stack trace for cleaner output
    Error.captureStackTrace(this, this.constructor)
  }
}
