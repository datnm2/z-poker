"use client";

type LoadingProps = {
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
};

const SIZE: Record<NonNullable<LoadingProps["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function Loading({ size = "md", fullscreen, className = "" }: LoadingProps) {
  const chip = (
    <div
      role="status"
      aria-label="Loading"
      className={`poker-chip animate-chip-spin ${SIZE[size]} ${className}`}
    />
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        {chip}
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-10">
      {chip}
    </div>
  );
}
