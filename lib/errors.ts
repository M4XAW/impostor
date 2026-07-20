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

  console.error(fallbackMessage, error);
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
