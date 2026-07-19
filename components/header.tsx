import { RiSpyFill } from "@remixicon/react";
import Link from "next/link";

export function Header() {
    return (
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-6 sm:px-8 lg:px-12">
            <Link className="flex items-center gap-3" href="/" aria-label="Impostor, accueil">
                <span
                    className="grid size-10 place-items-center bg-orange-300 text-xl"
                    aria-hidden="true"
                >
                    <RiSpyFill color="var(--color-background)" />
                </span>
                <span className="text-xl tracking-tight">IMPOSTOR</span>
            </Link>
        </header>
    );
}
