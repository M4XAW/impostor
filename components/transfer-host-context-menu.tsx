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
}

export function TransferHostContextMenu({
  children,
  playerName,
  disabled = false,
  onConfirm,
}: TransferHostContextMenuProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={disabled}
            onSelect={() => setConfirmationOpen(true)}
          >
            <Crown aria-hidden="true" />
            Transférer le rôle d’hôte
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer le rôle d’hôte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {playerName} pourra modifier les paramètres et lancer la partie. Tu perdras immédiatement ces droits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Confirmer le transfert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
