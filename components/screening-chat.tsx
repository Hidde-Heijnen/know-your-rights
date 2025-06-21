"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
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
import { CalendarIcon, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { fromDate, getLocalTimeZone } from "@internationalized/date";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Import the steps data
import stepsData from "./steps.json";

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

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

function TypewriterText({ text, speed = 20, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      // Small delay after completing the text before calling onComplete
      const timeout = setTimeout(onComplete, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="ml-0.5"
        >
          |
        </motion.span>
      )}
    </span>
  );
}

interface TypewriterBotMessageProps {
  content: BotMessageContent;
  onComplete?: () => void;
}

function TypewriterBotMessage({
  content,
  onComplete,
}: TypewriterBotMessageProps) {
  if (content.type === "text") {
    return (
      <TypewriterText
        text={content.content as string}
        onComplete={onComplete}
      />
    );
  }

  if (content.type === "formatted" && typeof content.content === "object") {
    const { bold, bullets, text } = content.content;
    const [boldComplete, setBoldComplete] = useState(false);
    const [bulletsComplete, setBulletsComplete] = useState(false);
    const [textComplete, setTextComplete] = useState(false);

    const handleBoldComplete = () => setBoldComplete(true);
    const handleBulletsComplete = () => setBulletsComplete(true);
    const handleTextComplete = () => setTextComplete(true);

    useEffect(() => {
      // Check if all parts are complete
      const shouldCallComplete =
        (!bold || boldComplete) &&
        (!bullets || bullets.length === 0 || bulletsComplete) &&
        (!text || textComplete);

      if (shouldCallComplete && onComplete) {
        onComplete();
      }
    }, [
      boldComplete,
      bulletsComplete,
      textComplete,
      bold,
      bullets,
      text,
      onComplete,
    ]);

    return (
      <div className="flex flex-col gap-2">
        {bold && (
          <span className="font-bold">
            <TypewriterText text={bold} onComplete={handleBoldComplete} />
          </span>
        )}
        {bullets && bullets.length > 0 && boldComplete && (
          <TypewriterBulletList
            bullets={bullets}
            onComplete={handleBulletsComplete}
          />
        )}
        {text &&
          (boldComplete || !bold) &&
          (bulletsComplete || !bullets || bullets.length === 0) && (
            <TypewriterText text={text} onComplete={handleTextComplete} />
          )}
      </div>
    );
  }

  return <span>{String(content.content)}</span>;
}

function TypewriterBulletList({
  bullets,
  onComplete,
}: {
  bullets: string[];
  onComplete?: () => void;
}) {
  const [currentBullet, setCurrentBullet] = useState(0);
  const [bulletComplete, setBulletComplete] = useState(false);

  const handleBulletComplete = () => {
    if (currentBullet < bullets.length - 1) {
      setCurrentBullet((prev) => prev + 1);
      setBulletComplete(false);
    } else {
      setBulletComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <ul className="list-disc list-inside space-y-1 ml-2">
      {bullets.slice(0, currentBullet + 1).map((bullet, index) => (
        <li key={index}>
          {index === currentBullet ? (
            <TypewriterText text={bullet} onComplete={handleBulletComplete} />
          ) : (
            bullet
          )}
        </li>
      ))}
    </ul>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center space-x-1">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Processing
      </span>
      <div className="flex space-x-1">
        <motion.div
          className="w-1 h-1 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="w-1 h-1 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.2,
          }}
        />
        <motion.div
          className="w-1 h-1 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.4,
          }}
        />
      </div>
    </div>
  );
}

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
  animate = true,
}: {
  side: "assistant" | "user";
  children: ReactNode;
  animate?: boolean;
}) {
  const isAssistant = side === "assistant";

  const content = (
    <>
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
    </>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ transform: "translateY(20px)", opacity: 0 }}
        animate={{ transform: "translateY(0px)", opacity: 1 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          opacity: { duration: 0.3 },
        }}
        className={`flex flex-row gap-4 px-4 mb-4 w-full md:px-0 ${
          isAssistant ? "" : "justify-end"
        }`}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div
      className={`flex flex-row gap-4 px-4 mb-4 w-full md:px-0 ${
        isAssistant ? "" : "justify-end"
      }`}
    >
      {content}
    </div>
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
  const [showReasoning, setShowReasoning] = useState(false);
  const [isProcessingDescription, setIsProcessingDescription] = useState(false);
  const [filteredDescription, setFilteredDescription] = useState<string>("");
  const [currentQuestionTypingComplete, setCurrentQuestionTypingComplete] =
    useState(false);
  const [animatedSteps, setAnimatedSteps] = useState<Set<number>>(new Set());

  // ----------------- React Hook Form -----------------
  const form = useForm<ChatFormValues>({
    resolver: zodResolver(ScreeningSchema),
    defaultValues: {},
  });

  const watchAll = form.watch();

  // Reset typing completion when step changes
  useEffect(() => {
    if (currentStep === 0) {
      // First message: set as complete immediately for input to show
      setCurrentQuestionTypingComplete(true);
      setAnimatedSteps((prev) => new Set(prev.add(0)));
    } else {
      // Other messages: reset to false for typewriter effect
      setCurrentQuestionTypingComplete(false);
    }
  }, [currentStep]);

  // Mark step as animated when typing completes
  const handleTypingComplete = () => {
    setCurrentQuestionTypingComplete(true);
    setAnimatedSteps((prev) => new Set(prev.add(currentStep)));
  };

  const handleContinue = async (index: number) => {
    // Reset typing completion for next question
    setCurrentQuestionTypingComplete(false);

    // If this is the issue description step, process it first
    if (
      screeningSteps[index].name === "issue_description" &&
      watchAll.issue_description
    ) {
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

        console.log("Sending data to API:", dataToSend);

        const response = await fetch("/api/save-screening", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        });

        console.log("Response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log("Response text:", responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Response text that failed to parse:", responseText);
          throw new Error("Invalid JSON response from server");
        }

        if (result.success && result.filteredDescription) {
          setFilteredDescription(result.filteredDescription);
          setIsProcessingDescription(false);

          // Advance immediately to next step after processing
          if (index + 1 < screeningSteps.length) {
            setCurrentStep(index + 1);
          } else {
            setShowSummary(true);
          }
          return;
        }
      } catch (error) {
        console.error("Error processing description:", error);
        // Show error to user
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
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
    // Log the final answers
    console.log("Screening form result →", values);
    // Show reasoning instead of immediately calling onComplete
    setShowReasoning(true);
  }

  function handleReasoningComplete() {
    // Called when reasoning is complete
    const values = form.getValues();
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
    // Only show questions for steps that are active or completed (progressive reveal)
    if (index <= currentStep && !showSummary) {
      // Question bubble (assistant)
      const isCurrentQuestion = index === currentStep;
      renderedConversation.push(
        <ChatBubble key={`${String(step.name)}-q`} side="assistant">
          {isCurrentQuestion ? (
            // Current question - skip typing for first message, use typing for others
            index === 0 ? (
              // First message: just slide in, no typing
              typeof step.question === "string" ? (
                step.question
              ) : (
                <BotMessage content={step.question} />
              )
            ) : // Subsequent messages: use typewriter effect
            typeof step.question === "string" ? (
              <TypewriterText
                text={step.question}
                onComplete={handleTypingComplete}
              />
            ) : (
              <TypewriterBotMessage
                content={step.question}
                onComplete={handleTypingComplete}
              />
            )
          ) : // Previous questions without typewriter
          typeof step.question === "string" ? (
            step.question
          ) : (
            <BotMessage content={step.question} />
          )}
        </ChatBubble>
      );
    }

    if (index < currentStep && !showSummary) {
      // Already answered – show value bubble (only during screening, not in summary)
      const answerValue = watchAll[step.name as keyof ChatFormValues];
      renderedConversation.push(
        <ChatBubble key={`${String(step.name)}-a`} side="user" animate={false}>
          <span className="textured-button bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm break-words">
            {getAnswerLabel(step, answerValue)}
          </span>
        </ChatBubble>
      );
    } else if (index === currentStep && !showSummary) {
      // Show loading animation when processing issue description
      if (
        step.name === "issue_description" &&
        isProcessingDescription &&
        watchAll.issue_description
      ) {
        renderedConversation.push(
          <ChatBubble key={`${step.name}-processing`} side="assistant">
            <LoadingDots />
          </ChatBubble>
        );
      } else {
        // Current question – show interactive form using RHF field
        // Always render to reserve space, but make invisible until typing is complete
        const shouldAnimate =
          currentQuestionTypingComplete && !animatedSteps.has(index);
        renderedConversation.push(
          <ChatBubble
            key={`${String(step.name)}-form`}
            side="user"
            animate={shouldAnimate}
          >
            <div
              className={
                currentQuestionTypingComplete
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }
            >
              <FormField
                control={form.control}
                name={step.name as keyof ChatFormValues}
                render={({ field }) => (
                  <StepInput
                    step={step}
                    field={field}
                    onContinue={() => handleContinue(index)}
                    isProcessingDescription={isProcessingDescription}
                  />
                )}
              />
            </div>
          </ChatBubble>
        );
      }
    }
  });

  /* ------------------------------ summary ------------------------------ */
  if (showSummary && !showReasoning) {
    renderedConversation.push(
      <ChatBubble key="summary" side="assistant">
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">Ready to help with your case</h3>

          {/* Issue description with filtered content */}
          {filteredDescription && (
            <div className="p-3 bg-gray-50 border dark:bg-gray-800 rounded-lg">
              <div className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                Your issue:
              </div>
              <div className="text-gray-800 dark:text-gray-200">
                &ldquo;{filteredDescription}&rdquo;
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ✓ Content filtered for bias removal
              </p>
            </div>
          )}

          <RainbowButton
            type="submit"
            className="self-start !w-72 !rounded-xl mx-auto"
          >
            Assess your claim
          </RainbowButton>
        </div>
      </ChatBubble>
    );
  }

  /* ------------------------------ reasoning ------------------------------ */
  if (showReasoning) {
    renderedConversation.push(
      <ChatBubble key="reasoning" side="assistant" animate={false}>
        <LegalReasoningLogs onComplete={handleReasoningComplete} />
      </ChatBubble>
    );
  }

  return (
    <Form {...form}>
      <form
        className="w-[600px] px-2 pb-12"
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
}: {
  step: Step;
  field: any;
  onContinue: () => void;
  isProcessingDescription: boolean;
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
      disabled={isDisabled || isProcessingDescription}
    >
      {isProcessingDescription ? "Processing..." : "Process your claim"}
    </Button>
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
      <div className="flex flex-col !w-72">
        <Textarea
          placeholder="Describe the issue..."
          className="min-h-24 text-base"
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value)}
        />
        <div className="flex justify-end w-full">{commonButton}</div>
      </div>
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                         Legal Reasoning Component                          */
/* -------------------------------------------------------------------------- */

interface ReasoningStep {
  step: number;
  section: string;
  reasoning: string[];
}

function LegalReasoningLogs({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps: ReasoningStep[] = stepsData;

  const handleDownloadProof = () => {
    const link = document.createElement("a");
    link.href = "/re_travel_adapter.pdf";
    link.download = "re_travel_adapter.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (currentStep === -1) {
      // Start the reasoning process
      setTimeout(() => {
        setCurrentStep(0);
      }, 1000);
      return;
    }

    if (currentStep < steps.length) {
      // Random delay between 2-4 seconds for each step
      const delay = Math.random() * 2000 + 2000;

      const timer = setTimeout(() => {
        setCompletedSteps((prev) => new Set(prev.add(currentStep)));

        if (currentStep + 1 < steps.length) {
          setCurrentStep(currentStep + 1);
          // Auto-scroll to next step
          setTimeout(() => {
            stepRefs.current[currentStep + 1]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 200);
        } else {
          // All steps completed
          setIsProcessing(false);
          setShowConfetti(true);
          setTimeout(onComplete, 3000);
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length, onComplete]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col">
          <h3 className="font-semibold text-lg">
            Legislation traversal in progress
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analysing your case against the{" "}
            <a
              className="text-blue-800 underline"
              href="https://www.legislation.gov.uk/ukpga/2015/15/contents"
            >
              Consumer Rights Act 2015
            </a>
            ...
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCurrentStep = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const shouldShow = index <= currentStep;

          if (!shouldShow) return null;

          return (
            <motion.div
              key={step.step}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "border rounded-lg p-4 transition-all duration-500",
                isCompleted
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : isCurrentStep
                  ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrentStep
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  )}
                >
                  {isCompleted ? "✓" : step.step}
                </div>

                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      Reading {step.section}
                    </span>
                    {isCurrentStep && !isCompleted && (
                      <div className="flex space-x-1">
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {(isCompleted || isCurrentStep) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{
                        duration: 0.3,
                        delay: isCurrentStep ? 0.5 : 0,
                      }}
                    >
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Highlights:
                      </div>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {step.reasoning.map((point, pointIndex) => (
                          <motion.li
                            key={pointIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: isCurrentStep ? 0.7 + pointIndex * 0.2 : 0,
                            }}
                            className="flex items-start gap-2"
                          >
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="flex-1">{point}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800 relative overflow-hidden"
        >
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: Math.random() * 400,
                    y: -10,
                    rotate: 0,
                    scale: 0,
                  }}
                  animate={{
                    y: 300,
                    rotate: 360 * 3,
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    delay: Math.random() * 2,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "absolute w-3 h-3 rounded-full",
                    i % 4 === 0
                      ? "bg-yellow-400"
                      : i % 4 === 1
                      ? "bg-green-400"
                      : i % 4 === 2
                      ? "bg-blue-400"
                      : "bg-pink-400"
                  )}
                />
              ))}
            </div>
          )}

          <div className="relative z-10">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-300 mb-2">
              <motion.span
                className="text-green-500 text-2xl"
                animate={
                  showConfetti
                    ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }
                    : {}
                }
                transition={{ duration: 0.6, repeat: 2 }}
              >
                🎉
              </motion.span>
              <span className="font-bold text-xl">You deserve a refund!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              Based on our analysis of the Consumer Rights Act 2015, you have a
              strong legal case for obtaining a full refund.
            </p>
          </div>
        </motion.div>
      )}

      {!isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4"
        >
          <Button
            onClick={handleDownloadProof}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium"
          >
            <Download className="w-5 h-5" />
            Download proof of claim
          </Button>
        </motion.div>
      )}
    </div>
  );
}
