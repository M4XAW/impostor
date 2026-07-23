"use client";

import { useEffect } from "react";
import Link from "next/link";
import { WarningDiamond } from "pixelarticons/react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unexpected application error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="grid flex-1 place-items-center px-5 pb-20 sm:px-8">
      <section className="w-full max-w-md border bg-card p-6 text-center" aria-labelledby="error-title">
        <WarningDiamond className="mx-auto size-12 text-rose-300" aria-hidden="true" />
        <h1 id="error-title" className="mt-4 text-2xl">Une erreur inattendue est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La partie n’a pas pu être affichée correctement. Tu peux réessayer sans quitter le salon.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">Référence : {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => unstable_retry()}>Réessayer</Button>
          <Button variant="outline" asChild>
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
