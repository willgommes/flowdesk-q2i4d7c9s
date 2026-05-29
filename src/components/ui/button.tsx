/* Button Component primitives - A component that displays a button - from shadcn/ui (exposes Button, buttonVariants) */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative text-gray-100',
  {
    variants: {
      variant: {
        default:
          'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 active:bg-white/15',
        solid:
          'bg-blue-500 text-white hover:bg-blue-600 border border-transparent hover:border-white/50 duration-200 active:bg-blue-700',
        ghost:
          'bg-transparent border border-transparent hover:border-white/10 hover:bg-white/5 active:bg-white/10',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 backdrop-blur-xl active:bg-destructive/30',
        outline:
          'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 active:bg-white/15',
        secondary:
          'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 active:bg-white/15',
        link: 'underline-offset-4 hover:underline border border-transparent active:text-white/70',
      },
      size: {
        default: 'px-7 py-1.5',
        sm: 'px-4 py-0.5',
        lg: 'px-10 py-2.5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  withNeon?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, withNeon = true, loading = false, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'

    const neonStyles = withNeon
      ? 'before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-3/4 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-blue-500 dark:before:via-blue-500 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 before:ease-in-out hover:before:opacity-100 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-3/4 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-blue-600 dark:after:via-blue-500 after:to-transparent after:opacity-0 after:transition-opacity after:duration-500 after:ease-in-out hover:after:opacity-30'
      : ''

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }), neonStyles)}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), neonStyles)}
        ref={ref}
        disabled={loading || props.disabled}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
        {loading ? <span className="opacity-70 truncate">{props.children}</span> : props.children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
