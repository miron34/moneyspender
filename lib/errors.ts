// Custom error classes for the voice/NLP pipeline.
//
// Both extend Error so they can be thrown and caught normally; the `name`
// field lets callers do `if (e instanceof ParseExpenseError)` without
// importing the class everywhere (though importing is recommended for type
// narrowing). The optional `cause` carries the underlying transport error
// for logging / ErrorToast surfacing.

export class ParseExpenseError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ParseExpenseError';
    this.cause = cause;
  }
}

// Reserved for the next milestone: speech-to-text errors thrown by
// platform-specific recognizer wrappers (lib/voice/recognizer.{native,web}.ts).
// Kept here so the voice layer has one place for all error types.
export class STTError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'STTError';
    this.cause = cause;
  }
}
