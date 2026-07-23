type LogContext = Record<string, unknown>;

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
  };
}

function createLogEntry(
  level: "info" | "error",
  event: string,
  context: LogContext,
) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
}

export function logInfo(event: string, context: LogContext = {}) {
  console.log(createLogEntry("info", event, context));
}

export function logError(
  event: string,
  error: unknown,
  context: LogContext = {},
) {
  console.error(
    createLogEntry("error", event, {
      ...context,
      error: serializeError(error),
    }),
  );
}
