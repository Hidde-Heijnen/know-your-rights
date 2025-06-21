"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import IconCheckAnimation, {
  useCopyAnimation,
} from "@/components/ui/icon-check-animation";
import { CopyIcon, type LucideIcon } from "lucide-react";
import React from "react";

type CopyButtonProps = ButtonProps & {
  icon?: LucideIcon;
  text: string;
};

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({
    variant = "ghost",
    text,
    icon = CopyIcon,
    size = "iconSmall",
    children,
    ...props
  }) => {
    const [trigger, copy] = useCopyAnimation(text);
    return (
      <Button size={size} variant={variant} onClick={copy} {...props}>
        <IconCheckAnimation isActive={trigger} icon={icon} />
        {children}
      </Button>
    );
  }
);
CopyButton.displayName = "Button";

export default CopyButton;
