import type React from "react";
import { cn } from "cn-utility";

type ButtonProps = React.ComponentPropsWithoutRef<"button">;
export function Button({
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        " px-4 py-2 rounded text-sm",
        className
      )}
      {...props}
    >
      {children}{" "}
    </button>
  );
}
