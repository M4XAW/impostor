"use client"

import {
  createContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Minus, Plus } from "pixelarticons/react"

import { cn } from "@/lib/utils"

type NumberFieldValue = number | null

interface NumberFieldContextValue {
  changeByStep: (
    input: HTMLInputElement,
    direction: "decrement" | "increment"
  ) => void
  disabled: boolean
  fieldId: string
  max?: number
  min?: number
  name?: string
  setValue: (value: NumberFieldValue) => void
  size: "sm" | "default" | "lg"
  step: number
  value: NumberFieldValue
}

const NumberFieldContext = createContext<NumberFieldContextValue | null>(null)

const numberFieldGroupVariants = cva(
  "relative flex w-full justify-between border border-input data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive focus-within:has-aria-invalid:border-destructive focus-within:has-aria-invalid:ring-destructive/20 dark:focus-within:has-aria-invalid:ring-destructive/40 bg-transparent dark:bg-input/30 transition-colors focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3",
  {
    variants: {
      size: {
        sm: "h-7 text-sm",
        default: "h-8 text-sm",
        lg: "h-9 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const numberFieldButtonVariants = cva(
  "relative flex shrink-0 cursor-pointer items-center justify-center transition-colors pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:bg-accent disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        default: "px-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "px-2.5 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const numberFieldInputVariants = cva(
  "w-full min-w-0 flex-1 bg-transparent text-center tabular-nums outline-none [appearance:textfield] disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5",
        default: "px-2.5 py-1",
        lg: "px-2.5 py-1.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface NumberFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange">,
    VariantProps<typeof numberFieldGroupVariants> {
  defaultValue?: NumberFieldValue
  disabled?: boolean
  max?: number
  min?: number
  name?: string
  onValueChange?: (value: NumberFieldValue) => void
  step?: number
  value?: NumberFieldValue
}

function NumberField({
  id,
  className,
  size = "default",
  value: controlledValue,
  defaultValue = null,
  disabled = false,
  max,
  min,
  name,
  onValueChange,
  step = 1,
  children,
  ...props
}: NumberFieldProps) {
  const generatedId = useId()
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const value = controlledValue === undefined ? uncontrolledValue : controlledValue
  const sizeValue = size ?? "default"

  function setValue(nextValue: NumberFieldValue) {
    if (controlledValue === undefined) {
      setUncontrolledValue(nextValue)
    }
    onValueChange?.(nextValue)
  }

  function changeByStep(
    input: HTMLInputElement,
    direction: "decrement" | "increment"
  ) {
    if (disabled) return

    if (direction === "increment") {
      input.stepUp()
    } else {
      input.stepDown()
    }

    setValue(Number.isNaN(input.valueAsNumber) ? null : input.valueAsNumber)
    input.focus()
  }

  return (
    <NumberFieldContext.Provider
      value={{
        changeByStep,
        disabled,
        fieldId: id ?? generatedId,
        max,
        min,
        name,
        setValue,
        size: sizeValue,
        step,
        value,
      }}
    >
      <div
        className={cn("flex w-full flex-col items-start gap-2", className)}
        data-disabled={disabled ? "" : undefined}
        data-size={sizeValue}
        data-slot="number-field"
        {...props}
      >
        {children}
      </div>
    </NumberFieldContext.Provider>
  )
}

function useNumberFieldContext(componentName: string) {
  const context = useContext(NumberFieldContext)

  if (!context) {
    throw new Error(`${componentName} must be used within a NumberField component.`)
  }

  return context
}

function NumberFieldGroup({
  className,
  size: sizeProp,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  Partial<VariantProps<typeof numberFieldGroupVariants>>) {
  const context = useNumberFieldContext("NumberFieldGroup")
  const size = sizeProp ?? context.size

  return (
    <div
      className={cn(numberFieldGroupVariants({ size }), className)}
      data-disabled={context.disabled ? "" : undefined}
      data-slot="number-field-group"
      {...props}
    />
  )
}

interface NumberFieldButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    Partial<VariantProps<typeof numberFieldButtonVariants>> {
  children?: ReactNode
}

function NumberFieldDecrement({
  className,
  size: sizeProp,
  children,
  disabled,
  onClick,
  ...props
}: NumberFieldButtonProps) {
  const context = useNumberFieldContext("NumberFieldDecrement")
  const size = sizeProp ?? context.size
  const isDisabled = disabled || context.disabled || (context.min !== undefined && context.value !== null && context.value <= context.min)

  return (
    <button
      aria-label="Diminuer"
      className={cn(numberFieldButtonVariants({ size }), "border-e-0", className)}
      data-slot="number-field-decrement"
      disabled={isDisabled}
      type="button"
      onClick={(event) => {
        onClick?.(event)
        const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>(
          '[data-slot="number-field-input"]'
        )
        if (!event.defaultPrevented && input) {
          context.changeByStep(input, "decrement")
        }
      }}
      {...props}
    >
      {children ?? <Minus />}
    </button>
  )
}

function NumberFieldIncrement({
  className,
  size: sizeProp,
  children,
  disabled,
  onClick,
  ...props
}: NumberFieldButtonProps) {
  const context = useNumberFieldContext("NumberFieldIncrement")
  const size = sizeProp ?? context.size
  const isDisabled = disabled || context.disabled || (context.max !== undefined && context.value !== null && context.value >= context.max)

  return (
    <button
      aria-label="Augmenter"
      className={cn(numberFieldButtonVariants({ size }), "border-s-0", className)}
      data-slot="number-field-increment"
      disabled={isDisabled}
      type="button"
      onClick={(event) => {
        onClick?.(event)
        const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>(
          '[data-slot="number-field-input"]'
        )
        if (!event.defaultPrevented && input) {
          context.changeByStep(input, "increment")
        }
      }}
      {...props}
    >
      {children ?? <Plus />}
    </button>
  )
}

function NumberFieldInput({
  className,
  size: sizeProp,
  id,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> &
  Partial<VariantProps<typeof numberFieldInputVariants>>) {
  const context = useNumberFieldContext("NumberFieldInput")
  const size = sizeProp ?? context.size

  return (
    <input
      {...props}
      className={cn(numberFieldInputVariants({ size }), className)}
      data-slot="number-field-input"
      disabled={context.disabled || props.disabled}
      id={id ?? context.fieldId}
      inputMode={props.inputMode ?? "numeric"}
      max={context.max}
      min={context.min}
      name={context.name}
      step={context.step}
      type="number"
      value={context.value ?? ""}
      onChange={(event) => {
        onChange?.(event)
        if (!event.defaultPrevented) {
          context.setValue(
            event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber
          )
        }
      }}
    />
  )
}

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldGroup,
  NumberFieldInput,
}
