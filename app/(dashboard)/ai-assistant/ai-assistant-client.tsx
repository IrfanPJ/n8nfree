"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2, TrendingUp, Users, ShoppingBag, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIMessage } from "@/types";

const QUICK_PROMPTS = [
  { label: "Revenue & Balance", icon: TrendingUp, prompt: "Show me revenue collected and outstanding balances." },
  { label: "All Customers", icon: Users, prompt: "List all customers with their contact details." },
  { label: "Order Status", icon: ShoppingBag, prompt: "Show all orders with their current status and delivery dates." },
  { label: "Leads & Follow-ups", icon: BarChart3, prompt: "Show all leads and pending follow-ups." },
];

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary/20" : "bg-[#D4AF37]/15"
      )}>
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-[#D4AF37]" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm"
          : "bg-card border border-border text-foreground rounded-tl-sm"
      )}>
        {message.content.split("\n").map((line, i) => {
          const trimmed = line.trimStart();
          if (!trimmed) return <div key={i} className="h-1" />;
          if (trimmed.startsWith("## ")) return <p key={i} className="font-bold text-[#D4AF37] mt-3 first:mt-0 text-base">{trimmed.slice(3)}</p>;
          if (trimmed.startsWith("### ")) return <p key={i} className="font-semibold mt-2 first:mt-0">{trimmed.slice(4)}</p>;
          const rendered = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return <p key={i} className="mt-0.5 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#D4AF37]" dangerouslySetInnerHTML={{ __html: rendered.slice(2) }} />;
          }
          return <p key={i} className="mt-1 first:mt-0" dangerouslySetInnerHTML={{ __html: rendered }} />;
        })}
      </div>
    </motion.div>
  );
}

export function AIAssistantClient() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your House of Tailors AI assistant. I can help you with business analytics, customer insights, revenue summaries, order recommendations, and much more.\n\nWhat would you like to know today?",
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("API error");

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content ?? "No data returned.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content,
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Something went wrong fetching data. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">Powered by advanced AI · House of Tailors intelligence</p>
        </div>
        <Badge variant="gold" className="ml-auto">Beta</Badge>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {QUICK_PROMPTS.map((qp) => {
            const Icon = qp.icon;
            return (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                className="flex flex-col items-start gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium">{qp.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="space-y-4 py-2 pr-2">
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="mt-4 flex items-end gap-3 p-3 rounded-xl border border-border bg-card">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about revenue, orders, customers, insights... (Enter to send, Shift+Enter for newline)"
          className="flex-1 min-h-[44px] max-h-32 border-0 bg-transparent resize-none focus-visible:ring-0 p-0 text-sm"
          rows={1}
        />
        <Button
          variant="gold"
          size="icon"
          disabled={!input.trim() || loading}
          onClick={() => sendMessage(input)}
          className="flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
