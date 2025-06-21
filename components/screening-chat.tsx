"use client";

import { useState, useEffect, ReactNode } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import { BotIcon } from "./icons";
import { RadioCards } from "./radio-cards";
import { Calendar } from "./ui/calendar-rac";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { fromDate, getLocalTimeZone } from "@internationalized/date";

import type { ScreeningFormValues } from "./screening-form";

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

interface BaseStep<
  T extends keyof ScreeningFormValues = keyof ScreeningFormValues
> {
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
          isAssistant ? "text-zinc-800 dark:text-zinc-300" : ""
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
  onComplete: (values: ScreeningFormValues) => void;
}

export function ScreeningChat({ onComplete }: ScreeningChatProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<ScreeningFormValues>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filteredDescription, setFilteredDescription] = useState<string>('');

  const saveDataToFile = async (data: ScreeningFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetch('/api/save-screening', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Screening data saved successfully:', result.filename);
        setSaveSuccess(true);
        // Store the filtered description for display
        if (result.filteredDescription) {
          setFilteredDescription(result.filteredDescription);
        }
      } else {
        console.error('Failed to save screening data:', result.message);
      }
    } catch (error) {
      console.error('Error saving screening data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnswer = (name: keyof ScreeningFormValues, value: any) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));

    if (currentStep + 1 < screeningSteps.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Finished all steps
      setShowSummary(true);
    }
  };

  const handleComplete = (values: ScreeningFormValues) => {
    // Save data to file
    saveDataToFile(values);
    
    // Call the original onComplete callback
    onComplete(values);
  };

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
      <ChatBubble key={`${step.name}-q`} side="assistant">
        {step.question}
      </ChatBubble>
    );

    if (index < currentStep) {
      // Already answered – show value bubble
      const answerValue = answers[step.name];
      renderedConversation.push(
        <ChatBubble key={`${step.name}-a`} side="user">
          <span className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm break-words">
            {getAnswerLabel(step, answerValue)}
          </span>
        </ChatBubble>
      );
    } else if (index === currentStep && !showSummary) {
      // Current question – show interactive form
      renderedConversation.push(
        <ChatBubble key={`${step.name}-form`} side="user">
          <StepInput
            step={step}
            onSubmit={(val) => handleAnswer(step.name, val)}
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
              <li key={step.name}>
                <span className="font-medium">{step.question}:</span>{" "}
                {getAnswerLabel(step, answers[step.name])}
              </li>
            ))}
          </ul>
          
          {/* Show filtered description if available */}
          {filteredDescription && answers.issue_description && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Content Filtering Applied:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">Original:</span>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    "{answers.issue_description}"
                  </p>
                </div>
                <div>
                  <span className="font-medium text-green-600 dark:text-green-400">Filtered (Bias Removed):</span>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    "{filteredDescription}"
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Personal information and potentially biased details have been removed to ensure fair processing.
                </p>
              </div>
            </div>
          )}
          
          {!chatStarted && (
            <Button
              onClick={() => {
                setChatStarted(true);
                handleComplete(answers as ScreeningFormValues);
              }}
              className="self-start"
              disabled={isSaving}
            >
              {isSaving ? 'Saving data...' : 'Start chatting'}
            </Button>
          )}
          {isSaving && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Saving your screening data to local file...
            </p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ Screening data saved successfully to local file!
            </p>
          )}
        </div>
      </ChatBubble>
    );
  }

  return <>{renderedConversation}</>;
}

/* -------------------------------------------------------------------------- */
/*                           Input for each step                              */
/* -------------------------------------------------------------------------- */

function StepInput({
  step,
  onSubmit,
}: {
  step: Step;
  onSubmit: (value: any) => void;
}) {
  const [localValue, setLocalValue] = useState<any>(
    step.type === "radio" ? "" : step.type === "date" ? null : ""
  );

  useEffect(() => {
    // Auto-submit for radio when value changes
    if (step.type === "radio" && localValue) {
      const timer = setTimeout(() => onSubmit(localValue), 150);
      return () => clearTimeout(timer);
    }
  }, [localValue]);

  const isDisabled = (() => {
    if (step.type === "radio") return !localValue;
    if (step.type === "date") return !localValue;
    if (step.type === "textarea")
      return typeof localValue !== "string" || localValue.trim() === "";
    return true;
  })();

  const commonButton = (
    <Button
      type="button"
      className="mt-4"
      onClick={() => onSubmit(localValue)}
      disabled={isDisabled}
    >
      Continue
    </Button>
  );

  if (step.type === "radio" && step.options) {
    return (
      <RadioCards
        value={localValue}
        onValueChange={setLocalValue}
        options={step.options}
        legend=""
      />
    );
  }

  if (step.type === "date") {
    return (
      <div className="flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal justify-between",
                !localValue && "text-muted-foreground"
              )}
            >
              {localValue ? (
                format(localValue, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-2 size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              value={
                localValue ? fromDate(localValue, getLocalTimeZone()) : null
              }
              onChange={(date) =>
                setLocalValue(date ? date.toDate(getLocalTimeZone()) : null)
              }
              isDateUnavailable={(date) => {
                const jsDate = date.toDate(getLocalTimeZone());
                return jsDate > new Date() || jsDate < new Date("1900-01-01");
              }}
            />
          </PopoverContent>
        </Popover>
        {commonButton}
      </div>
    );
  }

  if (step.type === "textarea") {
    return (
      <div className="flex flex-col gap-2 w-full">
        <Textarea
          placeholder="Describe the issue..."
          className="min-h-24 text-base"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
        />
        {commonButton}
      </div>
    );
  }

  return null;
}
