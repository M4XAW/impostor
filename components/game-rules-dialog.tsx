"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const gameRules = [
  {
    title: "Découvre ton mot",
    description:
      "Les civils reçoivent le même mot. Les imposteurs reçoivent un mot proche, sans savoir qu’ils sont imposteurs.",
  },
  {
    title: "Donne un indice",
    description:
      "À ton tour, propose un indice qui évoque ton mot sans le révéler. Un indice déjà joué pour le mot en cours ne peut pas être réutilisé.",
  },
  {
    title: "Repère les imposteurs",
    description:
      "Écoute les indices des autres joueurs et cherche ceux qui semblent correspondre à un mot légèrement différent.",
  },
  {
    title: "Vote",
    description:
      "Vote pour un autre joueur. Les civils gagnent si un imposteur fait partie des joueurs les plus votés ; sinon, les imposteurs gagnent.",
  },
] as const

export function GameRulesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Règles du jeu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Règles du jeu</DialogTitle>
          <DialogDescription>
            Trouve les imposteurs sans dévoiler ton propre mot.
          </DialogDescription>
        </DialogHeader>

        <ol className="grid gap-4">
          {gameRules.map((rule, index) => (
            <li key={rule.title} className="grid grid-cols-[2rem_1fr] gap-3">
              <span
                className="grid size-8 place-items-center bg-orange-400/10 font-medium text-orange-300"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-medium text-foreground">{rule.title}</h3>
                <p className="mt-1 text-muted-foreground">{rule.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="border-l-2 border-orange-400 bg-orange-400/10 px-4 py-3 text-orange-300">
          Après un tour complet, l’hôte peut ouvrir le vote à tout moment.
          Sans intervention de sa part, le vote s’ouvre automatiquement une
          fois tous les mots et tous les tours configurés terminés.
        </p>
      </DialogContent>
    </Dialog>
  )
}
