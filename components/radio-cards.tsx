"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useId } from "react";

export interface OptionObject {
  value: string;
  label: string;
}

export interface RadioCardsProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroup> {
  legend?: string;
  options?: string[] | OptionObject[];
  leftLabel?: string;
  middleLabel?: string;
  rightLabel?: string;
  showLabel?: boolean;
  className?: string;
  radioGroupClassName?: string;
  labelClassName?: string;
  legendClassName?: string;
  optionLabelsClassName?: string;
}

const RadioCards = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  RadioCardsProps
>(
  (
    {
      legend = "Select an option",
      options = ["1", "2", "3", "4", "5"],
      leftLabel,
      middleLabel,
      rightLabel,
      showLabel = false,
      className,
      radioGroupClassName,
      labelClassName,
      legendClassName,
      optionLabelsClassName,
      ...props
    },
    ref
  ) => {
    const id = useId();

    // Normalize options to always be objects with value and label
    const normalizedOptions = options.map((option) => {
      if (typeof option === "string") {
        return { value: option, label: option };
      }
      return option;
    });

    return (
      <div className={cn("space-y-1", className)}>
        <fieldset className="space-y-3">
          {legend && (
            <legend
              className={cn(
                "font-semibold text-base text-foreground leading-tight",
                legendClassName
              )}
            >
              {legend}
            </legend>
          )}
          <RadioGroup
            ref={ref}
            className={cn(
              "-space-x-px textured-button flex gap-0 rounded-md shadow-xs",
              radioGroupClassName
            )}
            {...props}
          >
            {normalizedOptions.map((option) => (
              <Label
                key={option.value}
                className={cn(
                  "has-data-[state=checked]:textured-button relative flex size-9 flex-1 cursor-pointer flex-col items-center justify-center gap-3 border border-input bg-accent text-center font-medium text-sm outline-none transition-[color,box-shadow] first:rounded-s-md last:rounded-e-md focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-data-[state=checked]:z-10 has-data-disabled:cursor-not-allowed has-data-[state=checked]:bg-primary/90 has-data-[state=checked]:text-primary-foreground has-data-disabled:opacity-50",
                  labelClassName
                )}
              >
                <RadioGroupItem
                  id={`${id}-${option.value}`}
                  value={option.value}
                  className="sr-only after:absolute after:inset-0"
                />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        {showLabel && leftLabel && rightLabel && (
          <div
            className={cn(
              "mt-1 grid grid-cols-3 text-center font-medium text-sm",
              optionLabelsClassName
            )}
          >
            <p className="text-left">{leftLabel}</p>
            <p className="text-center">{middleLabel}</p>
            <p className="text-right">{rightLabel}</p>
          </div>
        )}
      </div>
    );
  }
);

RadioCards.displayName = "RadioCards";

export { RadioCards };

// Export LikertScale as an alias for backward compatibility
export const LikertScale = RadioCards;
