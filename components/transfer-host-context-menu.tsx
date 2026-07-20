"use client";

import { useState, type ReactNode } from "react";
import { Crown } from "pixelarticons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface TransferHostContextMenuProps {
  children: ReactNode;
  playerName: string;
  disabled?: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}

export function TransferHostContextMenu({
  children,
  playerName,
  disabled = false,
  onConfirm,
  onRemove,
}: TransferHostContextMenuProps) {
  const [pendingAction, setPendingAction] = useState<"transfer" | "remove" | null>(null);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={disabled}
            onSelect={() => setPendingAction("transfer")}
          >
            <Crown aria-hidden="true" />
            Transférer le rôle d’hôte
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setPendingAction("remove")}>
            Retirer du salon
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "remove" ? "Retirer ce joueur ?" : "Transférer le rôle d’hôte ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "remove"
                ? `${playerName} sera retiré du salon et devra le rejoindre à nouveau.`
                : `${playerName} pourra modifier les paramètres et lancer la partie. Tu perdras immédiatement ces droits.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingAction === "remove" ? "destructive" : "default"}
              onClick={pendingAction === "remove" ? onRemove : onConfirm}
            >
              {pendingAction === "remove" ? "Retirer" : "Confirmer le transfert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
