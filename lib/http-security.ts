import { NextRequest } from "next/server";
import { PublicError } from "@/lib/errors";

const JSON_CONTENT_TYPE_PATTERN = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json(?:\s*;|$)/i;

export function getClientAddress(request: NextRequest) {
  return request.headers.get("x-impostor-client-ip") ?? "unknown";
}

export function validateMutationOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new PublicError("Origine de requête refusée.", 403);

  const origin = request.headers.get("origin");
  if (!origin) return;

  const configuredOrigin = process.env.APP_ORIGIN?.replace(/\/$/, "");
  const expectedOrigin = configuredOrigin ?? new URL(request.url).origin;
  if (origin !== expectedOrigin) throw new PublicError("Origine de requête refusée.", 403);
}

export async function readJsonBody(request: NextRequest, maxBytes = 4_096): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!JSON_CONTENT_TYPE_PATTERN.test(contentType)) {
    throw new PublicError("Le type de contenu doit être application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicError("Corps de requête trop volumineux.", 413);
  }

  if (!request.body) throw new PublicError("Corps JSON invalide.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new PublicError("Corps de requête trop volumineux.", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new PublicError("Corps JSON invalide.");
  }
}
