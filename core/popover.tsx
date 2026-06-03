import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/utils/cn";

type PopoverContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div className="relative w-full">{children}</div>
    </PopoverContext.Provider>
  );
}

type PopoverTriggerProps = ComponentProps<"button"> & {
  asChild?: boolean;
  children: ReactNode;
};

export function PopoverTrigger({ asChild, children, onClick, ...props }: PopoverTriggerProps) {
  const context = useContext(PopoverContext);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<ComponentProps<"button">>;

    return cloneElement(child, {
      ...props,
      onClick: (event) => {
        child.props.onClick?.(event);
        onClick?.(event);
        context?.onOpenChange(!context.open);
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        context?.onOpenChange(!context.open);
      }}
    >
      {children}
    </button>
  );
}

type PopoverContentProps = ComponentProps<"div">;

export function PopoverContent({ className, children, ...props }: PopoverContentProps) {
  const context = useContext(PopoverContext);

  if (!context?.open) return null;

  return (
    <div
      className={cn("absolute left-0 top-full z-50 mt-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
