import type React from "react";
import { cn } from "cn-utility";

type InputProps = React.ComponentPropsWithoutRef<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full p-2 rounded bg-gray-700 text-white",
        className
      )}
      {...props}
    />
  );
}
