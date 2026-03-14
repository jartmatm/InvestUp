import React from "react";

type BadgeProps = {
  children: React.ReactNode;
  color?: "primary" | "success" | "danger" | "warning";
};

export function Badge({ children, color = "primary" }: BadgeProps) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
  };

  return <span className={`px-3 py-1 rounded-lg text-sm ${colors[color]}`}>{children}</span>;
}
