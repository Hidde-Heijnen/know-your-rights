"use client";

import { useState, useEffect, ReactNode } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useForm, ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormControl } from "./ui/form";

import { BotIcon } from "./icons";
import { RadioCards } from "./radio-cards";
import { Calendar } from "./ui/calendar-rac";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { fromDate, getLocalTimeZone } from "@internationalized/date";

/* -------------------------------------------------------------------------- */
/*                Schema and helper type for React Hook Form                 */
/* -------------------------------------------------------------------------- */

const ScreeningSchema = z.object({
  purchase_uk: z.enum(["yes", "no"]).optional(),
  acting_personal: z.enum(["yes", "no"]).optional(),
  seller_trader: z.enum(["yes", "no"]).optional(),
  receive_date: z.date().optional(),
  contract_main: z.enum(["goods", "digital", "service", "mix"]).optional(),
  contract_type: z
    .enum(["one_off", "hire", "hire_purchase", "transfer"])
    .optional(),
  auction: z.enum(["yes", "no"]).optional(),
  purchase_method: z.enum(["in_person", "online", "off_premises"]).optional(),
  issue_description: z.string().optional(),
});

export type ChatFormValues = z.infer<typeof ScreeningSchema>;

type RHFField<T extends keyof ChatFormValues> = ControllerRenderProps<
  ChatFormValues,
  T
>;

/* -------------------------------------------------------------------------- */
/*                             Helper definitions                             */
/* -------------------------------------------------------------------------- */

const getOptionLabel = (value: string, context: string): string => {
  const labelMaps: Record<string, Record<string, string>> = {
    yesNo: {
      yes: "Yes",
      no: "No",
    },
    contractMain: {
      goods: "Tangible goods",
      digital: "Digital content",
      service: "A service",
      mix: "A mix of these",
    },
    contractType: {
      one_off: "One-off sale",
      hire: "Hire of goods",
      hire_purchase: "Hire-purchase",
      transfer: "Transfer for something other than money",
    },
    purchaseMethod: {
      in_person: "In person",
      online: "Online / distance",
      off_premises: "Off-premises / doorstep",
    },
  };

  return labelMaps[context]?.[value] || value;
};

const createOptionsList = (
  values: string[],
  context: string
): { value: string; label: string }[] => {
  return values.map((v) => ({ value: v, label: getOptionLabel(v, context) }));
};

/* -------------------------------------------------------------------------- */
/*                         Data describing the question flow                  */
/* -------------------------------------------------------------------------- */

interface BaseStep<T extends keyof ChatFormValues = keyof ChatFormValues> {
  name: T;
  question: string;
  type: "radio" | "date" | "textarea";
  options?: { value: string; label: string }[]; // only for radio
}

type Step = BaseStep;

const screeningSteps: Step[] = [
  {
    name: "purchase_uk",
    question: "Did the purchase or contract take place in the United Kingdom?",
    type: "radio",
    options: createOptionsList(["yes", "no"], "yesNo"),
  },
  {
    name: "acting_personal",
    question: "Are you acting mainly for personal, non-business purposes?",
    type: "radio",
    options: createOptionsList(["yes", "no"], "yesNo"),
  },
  {
    name: "seller_trader",
    question: "Is the seller or supplier acting for business purposes?",
    type: "radio",
    options: createOptionsList(["yes", "no"], "yesNo"),
  },
  {
    name: "receive_date",
    question:
      "When did you receive (or were due to receive) the goods, digital content or service?",
    type: "date",
  },
  {
    name: "contract_main",
    question: "What is the contract mainly about?",
    type: "radio",
    options: createOptionsList(
      ["goods", "digital", "service", "mix"],
      "contractMain"
    ),
  },
  {
    name: "contract_type",
    question: "Which best describes the contract?",
    type: "radio",
    options: createOptionsList(
      ["one_off", "hire", "hire_purchase", "transfer"],
      "contractType"
    ),
  },
  {
    name: "auction",
    question:
      "Was the item bought at a public auction you could attend in person?",
    type: "radio",
    options: createOptionsList(["yes", "no"], "yesNo"),
  },
  {
    name: "purchase_method",
    question: "How did you buy?",
    type: "radio",
    options: createOptionsList(
      ["in_person", "online", "off_premises"],
      "purchaseMethod"
    ),
  },
  {
    name: "issue_description",
    question: "Very briefly, what has gone wrong?",
    type: "textarea",
  },
];

/* -------------------------------------------------------------------------- */
/*                            Helper components                               */
/* -------------------------------------------------------------------------- */

function ChatBubble({
  side,
  children,
}: {
  side: "assistant" | "user";
  children: ReactNode;
}) {
  const isAssistant = side === "assistant";
  return (
    <motion.div
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20 ${
        isAssistant ? "" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div className="size-[24px] flex flex-col justify-center items-center shrink-0 text-zinc-400">
          <BotIcon />
        </div>
      )}

      <div
        className={`flex flex-col gap-1 max-w-full ${
          isAssistant ? "text-zinc-800 dark:text-zinc-300" : "items-end w-full"
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Main component                                 */
/* -------------------------------------------------------------------------- */

interface ScreeningChatProps {
  onComplete: (values: ChatFormValues) => void;
}

export function ScreeningChat({ onComplete }: ScreeningChatProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // ----------------- React Hook Form -----------------
  const form = useForm<ChatFormValues>({
    resolver: zodResolver(ScreeningSchema),
    defaultValues: {},
  });

  const watchAll = form.watch();

  const handleContinue = (index: number) => {
    if (index + 1 < screeningSteps.length) {
      setCurrentStep(index + 1);
    } else {
      setShowSummary(true);
    }
  };

  function handleFinalSubmit(values: ChatFormValues) {
    // Log the final answers
    console.log("Screening form result →", values);
    onComplete(values);
  }

  /* -------------------------- render helpers -------------------------- */

  const getAnswerLabel = (step: Step, value: any) => {
    if (step.type === "radio" && step.options) {
      return (
        step.options.find((o) => o.value === value)?.label ?? String(value)
      );
    }
    if (step.type === "date" && value instanceof Date) {
      return format(value, "PPP");
    }
    return String(value);
  };

  const renderedConversation: React.ReactNode[] = [];

  screeningSteps.forEach((step, index) => {
    // Question bubble (assistant)
    renderedConversation.push(
      <ChatBubble key={`${String(step.name)}-q`} side="assistant">
        {step.question}
      </ChatBubble>
    );

    if (index < currentStep) {
      // Already answered – show value bubble
      const answerValue = watchAll[step.name as keyof ChatFormValues];
      renderedConversation.push(
        <ChatBubble key={`${String(step.name)}-a`} side="user">
          <span className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm break-words">
            {getAnswerLabel(step, answerValue)}
          </span>
        </ChatBubble>
      );
    } else if (index === currentStep && !showSummary) {
      // Current question – show interactive form using RHF field
      renderedConversation.push(
        <ChatBubble key={`${String(step.name)}-form`} side="user">
          <FormField
            control={form.control}
            name={step.name as keyof ChatFormValues}
            render={({ field }) => (
              <StepInput
                step={step}
                field={field}
                onContinue={() => handleContinue(index)}
              />
            )}
          />
        </ChatBubble>
      );
    }
  });

  /* ------------------------------ summary ------------------------------ */
  if (showSummary) {
    renderedConversation.push(
      <ChatBubble key="summary" side="assistant">
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">Summary of your answers</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {screeningSteps.map((step) => (
              <li key={String(step.name)}>
                <span className="font-medium">{step.question}:</span>{" "}
                {getAnswerLabel(
                  step,
                  watchAll[step.name as keyof ChatFormValues]
                )}
              </li>
            ))}
          </ul>
          <Button type="submit" className="self-start">
            Start chatting
          </Button>
        </div>
      </ChatBubble>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFinalSubmit)}>
        {renderedConversation}
      </form>
    </Form>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Input for each step                              */
/* -------------------------------------------------------------------------- */

function StepInput({
  step,
  field,
  onContinue,
}: {
  step: Step;
  field: any;
  onContinue: () => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Helper to call continue when appropriate.
  useEffect(() => {
    if ((step.type === "radio" || step.type === "date") && field.value) {
      const t = setTimeout(onContinue, 150);
      return () => clearTimeout(t);
    }
  }, [field.value, onContinue, step.type]);

  const isDisabled = (() => {
    if (step.type === "radio") return !field.value;
    if (step.type === "date") return !field.value;
    if (step.type === "textarea")
      return typeof field.value !== "string" || field.value.trim() === "";
    return true;
  })();

  const commonButton = (
    <Button
      type="button"
      className="mt-4"
      onClick={onContinue}
      disabled={isDisabled}
    >
      Continue
    </Button>
  );

  if (step.type === "radio" && step.options) {
    const shouldUseColumn =
      step.name === "contract_main" || step.name === "contract_type";

    return (
      <RadioCards
        value={field.value ?? ""}
        onValueChange={(val) => field.onChange(val)}
        options={step.options}
        legend=""
        className="min-w-32"
        direction={shouldUseColumn ? "column" : "row"}
      />
    );
  }

  if (step.type === "date") {
    return (
      <div className="flex flex-col gap-2">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal justify-between",
                !field.value && "text-muted-foreground"
              )}
            >
              {field.value ? (
                format(field.value, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-2 size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {typeof window !== "undefined" && (
              <Calendar
                value={
                  field.value ? fromDate(field.value, getLocalTimeZone()) : null
                }
                onChange={(date) => {
                  const newDate = date ? date.toDate(getLocalTimeZone()) : null;
                  field.onChange(newDate);
                  setIsPopoverOpen(false);
                }}
                isDateUnavailable={(date) => {
                  const jsDate = date.toDate(getLocalTimeZone());
                  return jsDate > new Date() || jsDate < new Date("1900-01-01");
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (step.type === "textarea") {
    return (
      <div className="flex flex-col gap-2 w-full">
        <Textarea
          placeholder="Describe the issue..."
          className="min-h-24 text-base"
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value)}
        />
        {commonButton}
      </div>
    );
  }

  return null;
}
