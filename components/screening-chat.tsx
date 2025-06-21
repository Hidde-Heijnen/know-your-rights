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
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

/* -------------------------------------------------------------------------- */
/*                Schema and helper type for React Hook Form                 */
/* -------------------------------------------------------------------------- */

const ScreeningSchema = z.object({
  eligibility_check: z.enum(["yes", "no"]).optional(),
  receive_date: z.date().optional(),
  contract_main: z.enum(["goods", "digital", "service", "mix"]).optional(),
  contract_type: z
    .enum(["one_off", "hire", "hire_purchase", "transfer"])
    .optional(),
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
  question: string | BotMessageContent;
  type: "radio" | "date" | "textarea";
  options?: { value: string; label: string }[]; // only for radio
}

type Step = BaseStep;

const screeningSteps: Step[] = [
  {
    name: "eligibility_check",
    question: {
      type: "formatted",
      content: {
        bold: "Please confirm:",
        bullets: [
          "You purchased something in the UK",
          "For personal (non-business) use",
          "From a business or public body (not a private individual)",
          "It was NOT bought at a public auction you could attend in person",
        ],
      },
    },
    type: "radio",
    options: createOptionsList(["yes", "no"], "yesNo"),
  },
  {
    name: "contract_main",
    question: {
      type: "text",
      content: "What is the contract mainly about?",
    },
    type: "radio",
    options: createOptionsList(
      ["goods", "digital", "mix", "service"],
      "contractMain"
    ),
  },
  {
    name: "contract_type",
    question: {
      type: "text",
      content: "Which best describes the contract?",
    },
    type: "radio",
    options: createOptionsList(
      ["transfer", "hire_purchase", "hire", "one_off"],
      "contractType"
    ),
  },
  {
    name: "receive_date",
    question: {
      type: "text",
      content:
        "When did you receive (or were due to receive) the goods, digital content or service?",
    },
    type: "date",
  },
  {
    name: "purchase_method",
    question: {
      type: "text",
      content: "How did you buy?",
    },
    type: "radio",
    options: createOptionsList(
      ["in_person", "online", "off_premises"],
      "purchaseMethod"
    ),
  },
  {
    name: "issue_description",
    question: {
      type: "text",
      content: "Very briefly, what has gone wrong?",
    },
    type: "textarea",
  },
];

/* -------------------------------------------------------------------------- */
/*                            Helper components                               */
/* -------------------------------------------------------------------------- */

interface BotMessageContent {
  type: "text" | "formatted";
  content:
    | string
    | {
        bold?: string;
        bullets?: string[];
        text?: string;
      };
}

function BotMessage({ content }: { content: BotMessageContent }) {
  if (content.type === "text") {
    return <span>{content.content as string}</span>;
  }

  if (content.type === "formatted" && typeof content.content === "object") {
    const { bold, bullets, text } = content.content;
    return (
      <div className="flex flex-col gap-2">
        {bold && <span className="font-bold">{bold}</span>}
        {bullets && bullets.length > 0 && (
          <ul className="list-disc list-inside space-y-1 ml-2">
            {bullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        )}
        {text && <span>{text}</span>}
      </div>
    );
  }

  return <span>{String(content.content)}</span>;
}

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
      className={`flex flex-row gap-4 px-4 mb-4 w-full md:px-0  ${
        isAssistant ? "" : "justify-end"
      }`}
    >
      {isAssistant && (
        <div className="size-[24px] flex flex-col justify-center items-center shrink-0 text-zinc-400">
          <BotIcon />
        </div>
      )}

      <div
        className={`flex flex-col gap-2 max-w-full ${
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
  const [isProcessingDescription, setIsProcessingDescription] = useState(false);
  const [showFilteringResults, setShowFilteringResults] = useState(false);
  const [filteredDescription, setFilteredDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ----------------- React Hook Form -----------------
  const form = useForm<ChatFormValues>({
    resolver: zodResolver(ScreeningSchema),
    defaultValues: {},
  });

  const watchAll = form.watch();

  const saveDataToFile = async (data: ChatFormValues) => {
    setIsSaving(true);
    try {
      // Prepare data for API, handling dates properly
      const dataToSend: any = {
        ...data,
        issue_description_filtered: filteredDescription,
      };
      
      // Convert Date objects to ISO strings for JSON serialization
      if (dataToSend.receive_date instanceof Date) {
        dataToSend.receive_date = dataToSend.receive_date.toISOString();
      }

      const response = await fetch('/api/save-screening', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSaveSuccess(true);
        console.log('Data saved successfully:', result);
      } else {
        throw new Error(result.message || 'Failed to save data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Error saving data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async (index: number) => {
    // If this is the issue description step, process it first
    if (screeningSteps[index].name === 'issue_description' && watchAll.issue_description) {
      setIsProcessingDescription(true);
      try {
        // Prepare data for API, handling dates properly
        const dataToSend: any = {
          ...watchAll,
          issue_description: watchAll.issue_description,
        };
        
        // Convert Date objects to ISO strings for JSON serialization
        if (dataToSend.receive_date instanceof Date) {
          dataToSend.receive_date = dataToSend.receive_date.toISOString();
        }

        console.log('Sending data to API:', dataToSend);

        const response = await fetch('/api/save-screening', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Response text:', responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text that failed to parse:', responseText);
          throw new Error('Invalid JSON response from server');
        }
        
        if (result.success && result.filteredDescription) {
          setFilteredDescription(result.filteredDescription);
          setShowFilteringResults(true);
          setIsProcessingDescription(false);
          
          // Show filtering results for 3 seconds, then advance automatically
          setTimeout(() => {
            if (index + 1 < screeningSteps.length) {
              setCurrentStep(index + 1);
            } else {
              setShowSummary(true);
            }
          }, 3000);
          
          return;
        }
      } catch (error) {
        console.error('Error processing description:', error);
        // Show error to user
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Error processing description: ${errorMessage}`);
      } finally {
        setIsProcessingDescription(false);
      }
    }

    if (index + 1 < screeningSteps.length) {
      setCurrentStep(index + 1);
    } else {
      setShowSummary(true);
    }
  };

  function handleFinalSubmit(values: ChatFormValues) {
    // Save data to file
    saveDataToFile(values);
    
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
        {typeof step.question === "string" ? (
          step.question
        ) : (
          <BotMessage content={step.question} />
        )}
      </ChatBubble>
    );

    if (index < currentStep) {
      // Already answered – show value bubble
      const answerValue = watchAll[step.name as keyof ChatFormValues];
      renderedConversation.push(
        <ChatBubble key={`${String(step.name)}-a`} side="user">
          <span className="textured-button bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm break-words">
            {getAnswerLabel(step, answerValue)}
          </span>
        </ChatBubble>
      );

      // Show filtering results immediately after issue description
      if (step.name === 'issue_description' && showFilteringResults && filteredDescription) {
        renderedConversation.push(
          <ChatBubble key={`${step.name}-filtering`} side="assistant">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Content Filtering Applied:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">Original:</span>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    &ldquo;{String(answerValue)}&rdquo;
                  </p>
                </div>
                <div>
                  <span className="font-medium text-green-600 dark:text-green-400">Filtered (Bias Removed):</span>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    &ldquo;{filteredDescription}&rdquo;
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Personal information and potentially biased details have been removed to ensure fair processing.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Continuing to next step automatically in 3 seconds...
                </p>
              </div>
            </div>
          </ChatBubble>
        );
      }
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
                isProcessingDescription={isProcessingDescription}
                showFilteringResults={showFilteringResults}
              />
            )}
          />
        </ChatBubble>
      );

      // Show filtering results for current step if available
      if (step.name === 'issue_description' && showFilteringResults && filteredDescription && watchAll.issue_description) {
        renderedConversation.push(
          <ChatBubble key={`${step.name}-filtering-current`} side="assistant">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Content Filtering Applied:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">Original:</span>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    &ldquo;{String(watchAll.issue_description)}&rdquo;
                  </p>
                </div>
                <div>
                  <span className="font-medium text-green-600 dark:text-green-400">Filtered (Bias Removed):</span>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">
                    &ldquo;{filteredDescription}&rdquo;
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Personal information and potentially biased details have been removed to ensure fair processing.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Continuing to next step automatically in 3 seconds...
                </p>
              </div>
            </div>
          </ChatBubble>
        );
      }
    }
  });

  /* ------------------------------ summary ------------------------------ */
  if (showSummary) {
    renderedConversation.push(
      <ChatBubble key="summary" side="assistant">
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">Summary of your answers</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {screeningSteps.map((step) => {
              // Special handling for issue description to show both original and filtered
              if (step.name === 'issue_description' && filteredDescription) {
                return (
                  <li key={String(step.name)}>
                    <span className="font-medium">
                      {typeof step.question === "string" ? (
                        step.question
                      ) : (
                        <BotMessage content={step.question} />
                      )}
                      :
                    </span>
                    <div className="ml-4 mt-2 space-y-2">
                      <div>
                        <span className="font-medium text-red-600 dark:text-red-400 text-xs">Original:</span>
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                          &ldquo;{String(watchAll[step.name as keyof ChatFormValues])}&rdquo;
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600 dark:text-green-400 text-xs">Filtered (Bias Removed):</span>
                        <p className="text-gray-800 dark:text-gray-200 text-xs mt-1">
                          &ldquo;{filteredDescription}&rdquo;
                        </p>
                      </div>
                    </div>
                  </li>
                );
              }
              
              // Regular handling for other steps
              return (
                <li key={String(step.name)}>
                  <span className="font-medium">
                    {typeof step.question === "string" ? (
                      step.question
                    ) : (
                      <BotMessage content={step.question} />
                    )}
                    :
                  </span>{" "}
                  {getAnswerLabel(
                    step,
                    watchAll[step.name as keyof ChatFormValues]
                  )}
                </li>
              );
            })}
          </ul>
          
          <Button
            type="submit"
            className="self-start"
            disabled={isSaving}
          >
            {isSaving ? 'Saving data...' : 'Start chatting'}
          </Button>
          
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

  return (
    <Form {...form}>
      <form
        className="min-w-[600px] px-2 pb-12"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit(handleFinalSubmit)(e);
        }}
      >
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
  isProcessingDescription,
  showFilteringResults,
}: {
  step: Step;
  field: any;
  onContinue: () => void;
  isProcessingDescription: boolean;
  showFilteringResults: boolean;
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
    <RainbowButton
      type="button"
      className="mt-4 rounded-xl"
      onClick={onContinue}
      disabled={isDisabled || isProcessingDescription}
    >
      {isProcessingDescription ? 'Processing...' : 'Continue'}
    </RainbowButton>
  );

  if (step.type === "radio") {
    const shouldUseColumn =
      step.name === "contract_main" || step.name === "contract_type";

    return (
      <div className="flex flex-col gap-2">
        <RadioCards
          value={field.value ?? ""}
          onValueChange={(val) => field.onChange(val)}
          options={step.options}
          legend=""
          className="min-w-32"
          direction={shouldUseColumn ? "column" : "row"}
        />
      </div>
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
        <div className="flex justify-center w-full">{commonButton}</div>
        
        {/* Show continue button when filtering results are displayed */}
        {showFilteringResults && step.name === 'issue_description' && (
          <Button
            type="button"
            className="mt-2"
            onClick={onContinue}
            variant="outline"
          >
            Continue to Next Step
          </Button>
        )}
      </div>
    );
  }

  return null;
}
