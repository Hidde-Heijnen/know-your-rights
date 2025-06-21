"use client";

import { useRef, useState, useEffect } from "react";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion } from "framer-motion";
import { MasonryIcon, VercelIcon } from "@/components/icons";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import Image from "next/image";
import {
  ScreeningChat,
  type ChatFormValues,
} from "@/components/screening-chat";
import { AuroraText } from "@/components/magicui/aurora-text";
import { CheckCircle } from "lucide-react";
import { Shield } from "lucide-react";

export default function Home() {
  const { messages, handleSubmit, input, setInput, append } = useChat();

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [screeningAnswers, setScreeningAnswers] =
    useState<ChatFormValues | null>(null);

  const screeningComplete = screeningAnswers !== null;

  // const suggestedActions = [
  //   {
  //     title: "How many 'r's",
  //     label: "are in the word strawberry?",
  //     action: "How many 'r's are in the word strawberry?",
  //   },
  // ];

  const trustIndicators = [
    { icon: Shield, text: "UK Legal Compliance" },
    { icon: CheckCircle, text: "Free Confidential Advice" },
  ];

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col justify-between gap-4 w-fit overflow-x-visible px-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col mt-24 mb-72 h-full items-center overflow-y-scroll"
        >
          <div className="mb-6 text-center flex flex-col items-center">
            <Image
              src="/logo.webp"
              alt="Know Your Rights"
              width={100}
              height={100}
            />
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Know Your{" "}
              <AuroraText className="italic" colors={["#dba502", "#2C5FC9"]}>
                Rights
              </AuroraText>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Get instant, personalized legal guidance for consumer rights
              issues. No legal jargon, just clear answers you can understand.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {trustIndicators.map((indicator, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              >
                <indicator.icon className="w-4 h-4 text-primary" />
                {indicator.text}
              </motion.div>
            ))}
          </div>

          <ScreeningChat
            onComplete={(values) => {
              setScreeningAnswers(values);
              append({
                role: "system",
                content: `User screening answers: ${JSON.stringify(values)}`,
              });
            }}
          />

          <div ref={messagesEndRef} />
        </div>

        {messages.map((message, i) => {
          return (
            <Message
              key={message.id}
              role={message.role}
              content={message.content}
              toolInvocations={message.toolInvocations}
              reasoningMessages={[]}
            ></Message>
          );
        })}

        {screeningComplete && (
          <form
            className="flex flex-col gap-2 relative items-center"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-hidden dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300 md:max-w-[500px] max-w-[calc(100dvw-32px)]"
              placeholder="Send a message..."
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
              }}
            />
          </form>
        )}
      </div>
    </div>
  );
}
