import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-none bg-[#2a2a2a]", className)}
      {...props}
    />
  )
}

export { Skeleton }
