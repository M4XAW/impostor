"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { RiCheckboxCircleLine, RiInformationLine, RiErrorWarningLine, RiCloseCircleLine, RiLoaderLine } from "@remixicon/react"
import {
  createNotificationSound,
  disposeNotificationSound,
  playNotificationSound,
} from "@/lib/notification-sound"

const TOAST_SELECTOR = "[data-sonner-toast]"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  useEffect(() => {
    const sound = createNotificationSound()
    const knownToasts = new WeakSet<Element>()

    document.querySelectorAll(TOAST_SELECTOR).forEach((toast) => {
      knownToasts.add(toast)
    })

    const playSoundForNewToast = (toast: Element) => {
      if (knownToasts.has(toast)) {
        return
      }

      knownToasts.add(toast)
      playNotificationSound(sound)
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return
          }

          if (node.matches(TOAST_SELECTOR)) {
            playSoundForNewToast(node)
          }

          node.querySelectorAll(TOAST_SELECTOR).forEach(playSoundForNewToast)
        })
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      disposeNotificationSound(sound)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <RiCheckboxCircleLine className="size-4" />
        ),
        info: (
          <RiInformationLine className="size-4" />
        ),
        warning: (
          <RiErrorWarningLine className="size-4" />
        ),
        error: (
          <RiCloseCircleLine className="size-4" />
        ),
        loading: (
          <RiLoaderLine className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
