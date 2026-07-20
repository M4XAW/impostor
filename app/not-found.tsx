import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftUpLine } from "@remixicon/react";

export default function NotFound() {
    return (
        <main className="grid place-items-center flex-1">
            <div className="flex flex-col items-center">
                <h1 className="text-2xl mb-2">Page non trouvée</h1>
                <p className="text-sm text-muted-foreground mb-4">{"La page que vous cherchez n'existe pas."}</p>
                <Button asChild>
                    <Link href="/">
                        <RiArrowLeftUpLine />
                        {"Retour à l'accueil"}
                    </Link>
                </Button>
            </div>
        </main>
    )
}