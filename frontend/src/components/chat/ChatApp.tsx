"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Loader2,
  MessageSquare,
  PanelLeft,
  Plus,
  Sparkles,
  Square,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ChatHttpError, chatApi } from "@/api/chat";
import { Markdown } from "@/components/chat/Markdown";
import { Button } from "@/components/ui/button";
import { useBalance } from "@/hooks/useBilling";
import { cn, formatRub } from "@/lib/utils";
import type { AiModel, Chat, ChatMessage } from "@/types";

const MODEL_KEY = "ai_chat_model";

const SUGGESTIONS = [
  "Напиши вежливое письмо клиенту о переносе сроков",
  "Объясни простыми словами, что такое инфляция",
  "Придумай 10 идей для постов в соцсети про кофейню",
  "Проверь текст на ошибки и сделай его понятнее",
];

/** Примерная цена обычного ответа: ~800 токенов вопроса и ~500 ответа. */
function typicalCost(model: AiModel): number {
  return (800 * parseFloat(model.input_price) + 500 * parseFloat(model.output_price)) / 1_000_000;
}

type UiMessage = ChatMessage & { streaming?: boolean; error?: string };

export function ChatApp() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const activeId = params.get("c");

  const { data: config } = useQuery({ queryKey: ["chat-config"], queryFn: () => chatApi.config() });
  const { data: chats } = useQuery({ queryKey: ["chats"], queryFn: () => chatApi.listChats() });
  const { data: balance } = useBalance();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [noMoney, setNoMoney] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [modelId, setModelId] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);
  // Чат только что создан этим же запросом: историю не грузим, она уже на экране.
  const justCreatedRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const models = useMemo(() => config?.models ?? [], [config]);
  const defaultModel = config?.default_model;
  const activeChat = chats?.find((c) => c.id === activeId);
  const model = models.find((m) => m.id === modelId) ?? models[0];

  // Модель: у открытого чата — его, иначе последняя выбранная или по умолчанию.
  useEffect(() => {
    if (!models.length) return;
    const has = (id?: string | null) => !!id && models.some((m) => m.id === id);
    if (activeChat && has(activeChat.model)) {
      setModelId(activeChat.model);
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(MODEL_KEY);
    } catch {
      /* хранилище недоступно */
    }
    setModelId(has(saved) ? saved! : has(defaultModel) ? defaultModel! : models[0].id);
  }, [models, activeChat, defaultModel]);

  // История выбранного чата.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (justCreatedRef.current === activeId) {
      justCreatedRef.current = null;
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    chatApi
      .listMessages(activeId)
      .then((items) => !cancelled && setMessages(items))
      .catch(() => !cancelled && toast.error("Не удалось загрузить чат"))
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Автопрокрутка, если человек не листает историю вверх.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const selectModel = (id: string) => {
    setModelId(id);
    try {
      localStorage.setItem(MODEL_KEY, id);
    } catch {
      /* хранилище недоступно */
    }
  };

  const openChat = useCallback(
    (id: string | null) => {
      abortRef.current?.abort();
      setListOpen(false);
      setNoMoney(false);
      router.replace(id ? `/chat?c=${id}` : "/chat");
    },
    [router],
  );

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending || !model) return;

    setInput("");
    requestAnimationFrame(autoGrow);
    setSending(true);
    setNoMoney(false);
    stickToBottomRef.current = true;

    const tempId = `tmp-${Date.now()}`;
    const draft: UiMessage = {
      id: tempId,
      role: "assistant",
      content: "",
      model: model.id,
      prompt_tokens: 0,
      completion_tokens: 0,
      cost: "0",
      created_at: new Date().toISOString(),
      streaming: true,
    };
    const userDraft: UiMessage = { ...draft, id: `${tempId}-u`, role: "user", content, streaming: false };
    setMessages((prev) => [...prev, userDraft, draft]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await chatApi.send(
        { chat_id: activeId, model: model.id, content },
        (ev) => {
          if (ev.type === "start") {
            setMessages((prev) => prev.map((m) => (m.id === userDraft.id ? ev.user_message : m)));
            if (!activeId) {
              justCreatedRef.current = ev.chat.id;
              qc.setQueryData<Chat[]>(["chats"], (old) => [ev.chat, ...(old ?? [])]);
              router.replace(`/chat?c=${ev.chat.id}`);
            }
          } else if (ev.type === "delta") {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, content: m.content + ev.content } : m)),
            );
          } else if (ev.type === "done") {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? ev.message : m)));
            qc.setQueryData(["balance"], (old: object | undefined) =>
              old ? { ...old, balance: ev.balance } : old,
            );
          } else if (ev.type === "error") {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, streaming: false, error: ev.detail } : m)),
            );
          }
        },
        controller.signal,
      );
    } catch (e) {
      if (controller.signal.aborted) {
        // Остановлено человеком: ответ досчитан и списан на сервере.
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streaming: false } : m)));
      } else {
        const status = e instanceof ChatHttpError ? e.status : 0;
        const detail = e instanceof Error ? e.message : "Не удалось отправить сообщение";
        setMessages((prev) => prev.filter((m) => m.id !== tempId && m.id !== userDraft.id));
        setInput(content);
        if (status === 402) setNoMoney(true);
        else toast.error(detail);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: ["chats"] });
      qc.invalidateQueries({ queryKey: ["balance"] });
    }
  };

  const removeChat = async (chat: Chat) => {
    if (!window.confirm(`Удалить чат «${chat.title}»?`)) return;
    try {
      await chatApi.remove(chat.id);
      qc.setQueryData<Chat[]>(["chats"], (old) => (old ?? []).filter((c) => c.id !== chat.id));
      if (chat.id === activeId) openChat(null);
    } catch {
      toast.error("Не удалось удалить чат");
    }
  };

  const balanceValue = balance ? parseFloat(balance.balance) : null;

  const chatList = (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={() => openChat(null)}>
          <Plus className="h-4 w-4" />
          Новый чат
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {chats?.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Здесь появятся ваши диалоги</p>
        )}
        {chats?.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
              c.id === activeId ? "bg-card shadow-[0_0_0_1px_rgba(22,20,15,.08)]" : "hover:bg-foreground/[0.04]",
            )}
          >
            <button
              type="button"
              onClick={() => openChat(c.id)}
              className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
              title={c.title}
            >
              {c.title}
            </button>
            <button
              type="button"
              onClick={() => removeChat(c)}
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 max-md:opacity-100"
              aria-label="Удалить чат"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Список чатов: колонка на компьютере, выезжающая панель на телефоне */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-secondary/30 lg:block">{chatList}</aside>
      {listOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setListOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="font-display text-sm">Чаты</span>
              <button type="button" onClick={() => setListOpen(false)} aria-label="Закрыть" className="p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            {chatList}
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        {/* Верхняя панель: модель и баланс */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setListOpen(true)}
            aria-label="Список чатов"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <select
            value={model?.id ?? ""}
            onChange={(e) => selectModel(e.target.value)}
            disabled={sending || !models.length}
            className="h-9 max-w-[60vw] rounded-lg border border-input bg-card px-3 text-sm font-medium"
            aria-label="Модель"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {model && (
            <span className="hidden text-xs text-muted-foreground md:inline" title="Цены за 1 млн токенов: вопрос / ответ">
              {model.description} · обычный ответ ≈ {formatRub(typicalCost(model))}
            </span>
          )}
          <Link
            href="/billing"
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm no-underline transition-colors",
              balanceValue !== null && balanceValue < 10
                ? "border-clay/40 bg-clay-soft text-clay-ink"
                : "border-border bg-card text-foreground hover:border-foreground/20",
            )}
          >
            <Wallet className="h-3.5 w-3.5" />
            {balanceValue === null ? "…" : formatRub(balanceValue)}
          </Link>
        </div>

        {/* Сообщения */}
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {config && !config.enabled && (
              <div className="mb-4 rounded-xl border border-clay/30 bg-clay-soft/60 p-4 text-sm">
                ИИ пока не подключён: администратору нужно указать ключ AI Gateway.
              </div>
            )}

            {!activeId && messages.length === 0 && (
              <div className="flex flex-col items-center pt-[8vh] text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h1 className="mt-5 font-display text-2xl sm:text-3xl">Чем помочь?</h1>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Задайте вопрос или опишите задачу. Платите только за ответы — деньги списываются с баланса
                  по факту.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={sending}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingHistory && (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            <div className="space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[15px] text-background">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-clay">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {m.content ? (
                        <Markdown text={m.content} />
                      ) : m.streaming ? (
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Думает…
                        </span>
                      ) : null}
                      {m.error && <p className="mt-2 text-sm text-destructive">{m.error}</p>}
                      {!m.streaming && parseFloat(m.cost) > 0 && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {models.find((x) => x.id === m.model)?.name ?? m.model} · {formatRub(m.cost)} ·{" "}
                          {(m.prompt_tokens + m.completion_tokens).toLocaleString("ru-RU")} токенов
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Ввод */}
        <div className="border-t border-border bg-background/80 px-3 pb-3 pt-3 backdrop-blur sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {noMoney && (
              <div className="mb-3 flex flex-col gap-2 rounded-xl border border-clay/30 bg-clay-soft/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>На балансе не хватает денег для ответа этой модели.</span>
                <Link href="/billing">
                  <Button size="sm">Пополнить баланс</Button>
                </Link>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-[0_8px_30px_-18px_rgba(22,20,15,.35)] focus-within:border-foreground/30">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoGrow();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Напишите сообщение…"
                className="max-h-[220px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
              />
              {sending ? (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Остановить"
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => send()}
                  disabled={!input.trim() || !model}
                  aria-label="Отправить"
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Enter — отправить, Shift+Enter — новая строка. ИИ может ошибаться, проверяйте важное.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
