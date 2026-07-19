import { RiSpyFill } from "@remixicon/react";
import Link from "next/link";

export function Header() {
    return (
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-6 sm:px-8 lg:px-12">
            <Link className="flex items-center gap-3" href="/" aria-label="Impostor, accueil">
                <span
                    className="grid size-10 place-items-center rounded-xl bg-orange-500 text-xl shadow-lg shadow-orange-950/40"
                    aria-hidden="true"
                >
                    <RiSpyFill />
                </span>
                <span className="text-xl font-black tracking-tight">IMPOSTOR</span>
            </Link>
        </header>
    );
}
