"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                                Zod Schema                                 */
/* -------------------------------------------------------------------------- */
const ScreeningSchema = z.object({
  purchase_uk: z.boolean(),
  acting_personal: z.boolean(),
  seller_trader: z.boolean(),
  receive_date: z.string().min(1, {
    message: "Please select a date.",
  }),
  contract_main: z.enum(["goods", "digital", "service", "mix"]),
  contract_type: z.enum(["one_off", "hire", "hire_purchase", "transfer"]),
  auction: z.boolean(),
  purchase_method: z.enum(["in_person", "online", "off_premises"]),
  issue_description: z
    .string()
    .min(5, { message: "Please describe what has gone wrong." }),
});

export type ScreeningFormValues = z.infer<typeof ScreeningSchema>;

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
      purchase_uk: true,
      acting_personal: true,
      seller_trader: true,
      receive_date: "",
      contract_main: "goods",
      contract_type: "one_off",
      auction: false,
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
        className="space-y-4 w-full max-w-lg"
      >
        {/* Question 1 */}
        <FormField
          control={form.control}
          name="purchase_uk"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5 pr-2">
                <FormLabel>
                  Did the purchase or contract take place in the United Kingdom?
                </FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 2 */}
        <FormField
          control={form.control}
          name="acting_personal"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5 pr-2">
                <FormLabel>
                  Are you acting mainly for personal, non-business purposes?
                </FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 3 */}
        <FormField
          control={form.control}
          name="seller_trader"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5 pr-2">
                <FormLabel>
                  Is the seller or supplier acting for business purposes?
                </FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 4 */}
        <FormField
          control={form.control}
          name="receive_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                When did you receive (or were due to receive) the goods, digital
                content or service?
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 5 */}
        <FormField
          control={form.control}
          name="contract_main"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is the contract mainly about?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="goods" id="goods" />
                    <label htmlFor="goods" className="text-sm">
                      Tangible goods
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="digital" id="digital" />
                    <label htmlFor="digital" className="text-sm">
                      Digital content
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="service" id="service" />
                    <label htmlFor="service" className="text-sm">
                      A service
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mix" id="mix" />
                    <label htmlFor="mix" className="text-sm">
                      A mix of these
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 6 */}
        <FormField
          control={form.control}
          name="contract_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Which best describes the contract?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one_off" id="one_off" />
                    <label htmlFor="one_off" className="text-sm">
                      One-off sale
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hire" id="hire" />
                    <label htmlFor="hire" className="text-sm">
                      Hire of goods
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hire_purchase" id="hire_purchase" />
                    <label htmlFor="hire_purchase" className="text-sm">
                      Hire-purchase
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <label htmlFor="transfer" className="text-sm">
                      Transfer for something other than money
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 7 */}
        <FormField
          control={form.control}
          name="auction"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5 pr-2">
                <FormLabel>
                  Was the item bought at a public auction you could attend in
                  person?
                </FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 8 */}
        <FormField
          control={form.control}
          name="purchase_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you buy?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_person" id="in_person" />
                    <label htmlFor="in_person" className="text-sm">
                      In person
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <label htmlFor="online" className="text-sm">
                      Online / distance
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="off_premises" id="off_premises" />
                    <label htmlFor="off_premises" className="text-sm">
                      Off-premises / doorstep
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Question 9 */}
        <FormField
          control={form.control}
          name="issue_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Very briefly, what has gone wrong?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue..."
                  className="min-h-24"
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

        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </Form>
  );
}
