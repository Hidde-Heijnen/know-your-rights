"use client";

import { useRef, useState, useEffect } from "react";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion } from "framer-motion";
import { MasonryIcon, VercelIcon } from "@/components/icons";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import {
  ScreeningChat,
  type ChatFormValues,
} from "@/components/screening-chat";

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

  return (
    <div className="flex flex-row justify-center w-full">
      <div className="flex flex-col justify-between gap-4 max-w-[600px]">
        <div
          ref={messagesContainerRef}
          className="flex flex-col mt-24 h-full items-center overflow-y-scroll"
        >
          <h1 className="text-2xl font-bold leading-none">Know Your Rights</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Answer a few questions to get started.
          </p>
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
