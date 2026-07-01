"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { LeafIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <LeafIcon className="size-4" style={{ color: "var(--color-leaf, var(--primary))" }} />
        ),
        info: (
          <InfoIcon className="size-4" style={{ color: "var(--color-sky)" }} />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" style={{ color: "var(--color-cinnamon)" }} />
        ),
        error: (
          <OctagonXIcon className="size-4" style={{ color: "var(--color-cinnamon)" }} />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" style={{ color: "var(--muted-foreground)" }} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
        style: {
          borderRadius: "12px",
          boxShadow:
            "0 1px 2px rgba(30,28,22,0.06), 0 18px 36px -26px rgba(30,28,22,0.55)",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
