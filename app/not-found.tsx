import Link from "next/link";
import { buttonVariants } from "@/components/ui/button"
import { RiArrowLeftUpLine } from "@remixicon/react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl mb-2">Page non trouvée</h1>
            <p className="text-sm text-muted-foreground mb-4">La page que vous cherchez n'existe pas.</p>
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
                <RiArrowLeftUpLine />
                Retour à l'accueil
            </Link>
        </div>
    )
}