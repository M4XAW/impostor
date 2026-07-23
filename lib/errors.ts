import { logError } from "@/lib/logger";

export class PublicError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PublicError";
  }
}

export function publicErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof PublicError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  logError("request.unexpected_error", error, { fallbackMessage });
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
