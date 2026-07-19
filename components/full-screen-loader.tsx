import { RiLoaderFill } from "@remixicon/react";

interface FullScreenLoaderProps {
  label?: string;
}

function FullScreenLoader({ label = "Chargement en cours" }: FullScreenLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      role="status"
      aria-live="polite"
    >
      <RiLoaderFill className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { FullScreenLoader };
