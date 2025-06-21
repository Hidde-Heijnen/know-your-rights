"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar-rac";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  fromDate,
  toCalendarDate,
  getLocalTimeZone,
} from "@internationalized/date";
import { RadioCards } from "@/components/radio-cards";

/* -------------------------------------------------------------------------- */
/*                                Zod Schema                                 */
/* -------------------------------------------------------------------------- */
const ScreeningSchema = z.object({
  purchase_uk: z.enum(["yes", "no"]),
  acting_personal: z.enum(["yes", "no"]),
  seller_trader: z.enum(["yes", "no"]),
  receive_date: z.date({
    required_error: "Please select a date.",
  }),
  contract_main: z.enum(["goods", "digital", "service", "mix"]),
  contract_type: z.enum(["one_off", "hire", "hire_purchase", "transfer"]),
  auction: z.enum(["yes", "no"]),
  purchase_method: z.enum(["in_person", "online", "off_premises"]),
  issue_description: z
    .string()
    .min(5, { message: "Please describe what has gone wrong." }),
  issue_description_filtered: z.string().optional(),
});

export type ScreeningFormValues = z.infer<typeof ScreeningSchema>;

type FieldRenderProp<T extends keyof ScreeningFormValues> = {
  field: ControllerRenderProps<ScreeningFormValues, T>;
};

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
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

const createOptionsList = (values: string[], context: string) => {
  return values.map((value) => ({
    value,
    label: getOptionLabel(value, context),
  }));
};

/* -------------------------------------------------------------------------- */
/*                               Form Component                               */
/* -------------------------------------------------------------------------- */
interface ScreeningFormProps {
  /**
   * Callback invoked once the form passes validation and is submitted.
   * Receives the validated values.
   */
  onComplete: (values: ScreeningFormValues) => void;
}

export function ScreeningForm({ onComplete }: ScreeningFormProps) {
  const form = useForm<ScreeningFormValues>({
    resolver: zodResolver(ScreeningSchema),
    defaultValues: {
      purchase_uk: "yes",
      acting_personal: "yes",
      seller_trader: "yes",
      receive_date: undefined,
      contract_main: "goods",
      contract_type: "one_off",
      auction: "no",
      purchase_method: "in_person",
      issue_description: "",
    },
  });

  function onSubmit(values: ScreeningFormValues) {
    onComplete(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 w-full max-w-2xl mx-auto"
      >
        {/* Question 1 */}
        <FormField
          control={form.control}
          name="purchase_uk"
          render={({ field }: FieldRenderProp<"purchase_uk">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Did the purchase or contract take place in the United Kingdom?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(["yes", "no"], "yesNo")}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 2 */}
        <FormField
          control={form.control}
          name="acting_personal"
          render={({ field }: FieldRenderProp<"acting_personal">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Are you acting mainly for personal, non-business purposes?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(["yes", "no"], "yesNo")}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 3 */}
        <FormField
          control={form.control}
          name="seller_trader"
          render={({ field }: FieldRenderProp<"seller_trader">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Is the seller or supplier acting for business purposes?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(["yes", "no"], "yesNo")}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 4 */}
        <FormField
          control={form.control}
          name="receive_date"
          render={({ field }: FieldRenderProp<"receive_date">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                When did you receive (or were due to receive) the goods, digital
                content or service?
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    value={
                      field.value
                        ? fromDate(field.value, getLocalTimeZone())
                        : null
                    }
                    onChange={(date) =>
                      field.onChange(
                        date ? date.toDate(getLocalTimeZone()) : null
                      )
                    }
                    isDateUnavailable={(date) => {
                      const jsDate = date.toDate(getLocalTimeZone());
                      return (
                        jsDate > new Date() || jsDate < new Date("1900-01-01")
                      );
                    }}
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />

        {/* Question 5 */}
        <FormField
          control={form.control}
          name="contract_main"
          render={({ field }: FieldRenderProp<"contract_main">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                What is the contract mainly about?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(
                    ["goods", "digital", "service", "mix"],
                    "contractMain"
                  )}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 6 */}
        <FormField
          control={form.control}
          name="contract_type"
          render={({ field }: FieldRenderProp<"contract_type">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Which best describes the contract?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(
                    ["one_off", "hire", "hire_purchase", "transfer"],
                    "contractType"
                  )}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 7 */}
        <FormField
          control={form.control}
          name="auction"
          render={({ field }: FieldRenderProp<"auction">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Was the item bought at a public auction you could attend in
                person?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(["yes", "no"], "yesNo")}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 8 */}
        <FormField
          control={form.control}
          name="purchase_method"
          render={({ field }: FieldRenderProp<"purchase_method">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                How did you buy?
              </FormLabel>
              <FormControl>
                <RadioCards
                  value={field.value}
                  onValueChange={field.onChange}
                  options={createOptionsList(
                    ["in_person", "online", "off_premises"],
                    "purchaseMethod"
                  )}
                  legend=""
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 9 */}
        <FormField
          control={form.control}
          name="issue_description"
          render={({ field }: FieldRenderProp<"issue_description">) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold">
                Very briefly, what has gone wrong?
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue..."
                  className="min-h-24 text-base"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This information is used later to branch into the relevant
                rights and remedies.
              </FormDescription>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-12 text-base">
          Continue
        </Button>
      </form>
    </Form>
  );
}
