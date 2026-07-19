import type { Metadata } from "next";
import { GeistPixelSquare, } from 'geist/font/pixel';
import "./globals.css";

import { Header } from "@/components/header";
import appPackage from "@/package.json"

export const metadata: Metadata = {
    title: "Impostor — le jeu de déduction entre amis",
    description: "Créez une partie d'Impostor et trouvez l'intrus avant les autres.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="fr"
            className={`${GeistPixelSquare.variable} h-full antialiased`}
        >
            <body className="bg-background min-h-svh p-3 md:p-4">
                <div className="relative isolate flex flex-col border border-dotted md:min-h-[calc(100svh-2rem)]">
                    <span aria-hidden="true" className="pointer-events-none absolute -left-1.25 -top-1.25 z-20 size-2.25 border border-dotted border-border bg-background" />
                    <span aria-hidden="true" className="pointer-events-none absolute -right-1.25 -top-1.25 z-20 size-2.25 border border-dotted border-border bg-background" />
                    <span aria-hidden="true" className="pointer-events-none absolute -left-1.25 -bottom-1.25 z-20 size-2.25 border border-dotted border-border bg-background" />
                    <span aria-hidden="true" className="pointer-events-none absolute -right-1.25 -bottom-1.25 z-20 size-2.25 border border-dotted border-border bg-background" />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[22px_22px] text-border/60"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,rgba(0,0,0,0.05)_100%)] dark:bg-[radial-gradient(ellipse_at_top,transparent_35%,rgba(255,255,255,0.03)_100%)]"
                    />
                    <small className="pointer-events-none absolute bottom-4 left-4 z-20 text-xs text-muted-foreground">
                        {`//v${appPackage.version}`}
                    </small>
                    <Header />
                    <div className="relative z-10 flex flex-1 flex-col">
                        {children}
                    </div>
                </div>

            </body>
        </html>
    );
}
