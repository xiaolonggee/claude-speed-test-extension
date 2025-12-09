import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-white/90 shadow-md backdrop-blur-sm',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4 pb-0', className)} {...props} />
)

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <h3 className={cn('text-base font-semibold leading-tight', className)} {...props} />
)

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
)

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4 pt-3', className)} {...props} />
)

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-between p-4 pt-0', className)}
    {...props}
  />
)

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription }
