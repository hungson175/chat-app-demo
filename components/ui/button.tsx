import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost"
  size?: "default" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = "default", size = "default", ...props }, ref) => {
    let buttonClass =
      "rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"

    if (variant === "ghost") {
      buttonClass += " hover:bg-accent hover:text-muted-foreground"
    } else {
      buttonClass += " bg-primary text-primary-foreground shadow hover:bg-primary/90"
    }

    if (size === "icon") {
      buttonClass += " h-9 w-9 p-0"
    } else {
      buttonClass += " h-10 py-2 px-4"
    }

    return (
      <button className={`${buttonClass} ${className}`} ref={ref} {...props}>
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

