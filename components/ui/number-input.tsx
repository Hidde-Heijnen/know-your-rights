"use client";

import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import {
  Button,
  FieldError,
  Group,
  Input,
  Label,
  NumberField,
} from "react-aria-components";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
  useController,
} from "react-hook-form";

export interface NumberInputProps {
  label?: string;
  defaultValue?: number;
  className?: string;
  inputClassName?: string;
  incrementClassName?: string;
  decrementClassName?: string;
  groupClassName?: string;
  labelClassName?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  name?: string;
  onChange?: (value: number) => void;
  value?: number;
}

export interface FormNumberInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<
    NumberInputProps,
    "name" | "onChange" | "value" | "defaultValue"
  > {
  name: TName;
  control: Control<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, TName>;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      defaultValue,
      className,
      inputClassName,
      incrementClassName,
      decrementClassName,
      groupClassName,
      labelClassName,
      minValue = 0,
      maxValue,
      step = 1,
      formatOptions,
      description,
      errorMessage,
      isRequired,
      isDisabled,
      isReadOnly,
      name,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    return (
      <NumberField
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        formatOptions={formatOptions}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        name={name}
        className={cn("flex flex-col items-start gap-1", className)}
        {...props}
      >
        {label && (
          <Label
            className={cn("font-semibold text-base", labelClassName)}
            htmlFor={name}
          >
            {label}
          </Label>
        )}

        <Group className={cn("flex", groupClassName)}>
          <Button
            slot="decrement"
            className={cn(
              "textured-button flex size-10 select-none items-center justify-center rounded-tl-md rounded-bl-md border border-gray-200 bg-accent text-gray-900 hover:bg-gray-100 active:bg-gray-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              decrementClassName
            )}
          >
            <MinusIcon className="size-4" aria-hidden="true" />
          </Button>

          <Input
            ref={ref}
            id={name}
            name={name}
            aria-label={label}
            className={cn(
              "focus:-outline-offset-1 h-10 w-20 border-gray-200 border-t border-b bg-accent text-center text-base text-gray-900 tabular-nums focus:z-1 focus:outline-2",
              inputClassName
            )}
          />

          <Button
            slot="increment"
            className={cn(
              "textured-button flex size-10 select-none items-center justify-center rounded-tr-md rounded-br-md border border-gray-200 bg-accent text-gray-900 hover:bg-gray-100 active:bg-gray-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              incrementClassName
            )}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Button>
        </Group>

        {description && (
          <div className="mt-1 text-muted-foreground text-xs">
            {description}
          </div>
        )}

        <FieldError className="mt-1 text-destructive text-xs" />
      </NumberField>
    );
  }
);

NumberInput.displayName = "NumberInput";

// React Hook Form compatible version
export function FormNumberInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  defaultValue,
  ...props
}: FormNumberInputProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
    defaultValue,
  });

  return (
    <NumberInput
      {...props}
      name={name}
      value={field.value as number}
      onChange={field.onChange}
      errorMessage={error?.message}
    />
  );
}

export default NumberInput;
