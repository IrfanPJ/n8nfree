"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, User, Sparkles, Loader2, TrendingUp, Users,
  ShoppingBag, BarChart3, Plus, Trash2, MessageSquare, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  { label: "Revenue & Balance", icon: TrendingUp, prompt: "Show me revenue collected and outstanding balances." },
  { label: "All Customers", icon: Users, prompt: "List all customers with their contact details." },
  { label: "Order Status", icon: ShoppingBag, prompt: "Show all orders with their current status and delivery dates." },
  { label: "Leads & Follow-ups", icon: BarChart3, prompt: "Show all leads and pending follow-ups." },
];

const WELCOME = "Hello! I'm your House of Tailors AI assistant powered by Gemini. Ask me anything about your orders, customers, revenue, leads, appointments, or staff.\n\nWhat would you like to know?";

type Msg = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type Session = { id: string; title: string; createdAt: string; messages: Msg[] };

function storageKey(userId: string) { return `htcrm_ai_v2_${userId}`; }

function loadSessions(userId: string): Session[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(userId: string, sessions: Session[]) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(sessions)); } catch {}
}

function newSession(): Session {
  return {
    id: Date.now().toString(),
    title: "New conversation",
    createdAt: new Date().toISOString(),
    messages: [{ id: "welcome", role: "assistant", content: WELCOME, createdAt: new Date().toISOString() }],
  };
}

function MessageBubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
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
          const t = line.trimStart();
          if (!t) return <div key={i} className="h-1" />;
          if (t.startsWith("## ")) return <p key={i} className="font-bold text-[#D4AF37] mt-3 first:mt-0 text-base">{t.slice(3)}</p>;
          if (t.startsWith("### ")) return <p key={i} className="font-semibold mt-2 first:mt-0">{t.slice(4)}</p>;
          const html = t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
          if (t.startsWith("- ") || t.startsWith("* ")) {
            return <p key={i} className="mt-0.5 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#D4AF37]" dangerouslySetInnerHTML={{ __html: html.slice(2) }} />;
          }
          return <p key={i} className="mt-1 first:mt-0" dangerouslySetInnerHTML={{ __html: html }} />;
        })}
      </div>
    </motion.div>
  );
}

export function AIAssistantClient({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    let stored = loadSessions(userId);
    if (stored.length === 0) {
      const s = newSession();
      stored = [s];
      saveSessions(userId, stored);
    }
    setSessions(stored);
    setActiveId(stored[0].id);
  }, [userId]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  // Persist whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) saveSessions(userId, sessions);
  }, [sessions, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const updateSession = useCallback((id: string, updater: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s) => s.id === id ? updater(s) : s));
  }, []);

  const createSession = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setInput("");
    setSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const s = newSession();
        setActiveId(s.id);
        return [s];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !activeSession) return;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: text.trim(), createdAt: new Date().toISOString() };
    const isFirst = activeSession.messages.filter((m) => m.role === "user").length === 0;
    const title = isFirst ? text.trim().slice(0, 45) + (text.trim().length > 45 ? "…" : "") : activeSession.title;

    updateSession(activeId, (s) => ({ ...s, title, messages: [...s.messages, userMsg] }));
    setInput("");
    setLoading(true);

    const history = [...activeSession.messages, userMsg];

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content ?? "No response received.";

      const assistantMsg: Msg = { id: (Date.now() + 1).toString(), role: "assistant", content, createdAt: new Date().toISOString() };
      updateSession(activeId, (s) => ({ ...s, messages: [...s.messages, assistantMsg] }));
    } catch {
      const errMsg: Msg = { id: (Date.now() + 1).toString(), role: "assistant", content: "Something went wrong. Please try again.", createdAt: new Date().toISOString() };
      updateSession(activeId, (s) => ({ ...s, messages: [...s.messages, errMsg] }));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 -mt-6 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 flex flex-col border-r border-border bg-secondary/30 overflow-hidden"
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversations</span>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2">
              <Button variant="gold" size="sm" className="w-full gap-2" onClick={createSession}>
                <Plus className="w-3.5 h-3.5" /> New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1 px-2 pb-2">
              <div className="space-y-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveId(s.id); setSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left transition-colors group",
                      s.id === activeId ? "bg-[#D4AF37]/15 text-foreground" : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs flex-1 min-w-0 truncate leading-relaxed">{s.title}</span>
                    <span
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <button onClick={() => setSidebarOpen((v) => !v)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{activeSession?.title ?? "AI Assistant"}</p>
            <p className="text-[10px] text-muted-foreground">Gemini 2.5 Flash · Live data</p>
          </div>
          <Badge variant="gold" className="text-[10px]">Beta</Badge>
          <Button variant="ghost" size="icon-sm" onClick={createSession} title="New chat">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="space-y-4 p-4 max-w-3xl mx-auto">
              {/* Quick prompts — only on fresh session */}
              {messages.filter((m) => m.role === "user").length === 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {QUICK_PROMPTS.map((qp) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.prompt)}
                        className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-[#D4AF37]/30 hover:bg-card/80 transition-all text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-medium">{qp.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <AnimatePresence>
                {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
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
        <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-3 p-3 rounded-xl border border-border bg-card">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business... (Enter to send)"
              className="flex-1 min-h-[40px] max-h-32 border-0 bg-transparent resize-none focus-visible:ring-0 p-0 text-sm"
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
          <p className="text-center text-[10px] text-muted-foreground mt-2">Conversations are saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}
