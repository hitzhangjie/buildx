import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "light";
  children: ReactNode;
};

export function OdButton({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  const cls =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "secondary"
        ? "btn btn-secondary"
        : "btn btn-light";
  return (
    <button className={`${cls} ${className}`.trim()} type="button" {...rest}>
      {children}
    </button>
  );
}

export function OdCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card card-custom ${className}`.trim()}>
      <div className="card-body">{children}</div>
    </div>
  );
}
