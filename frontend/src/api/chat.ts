import { apiClient, tokenStorage } from "./client";
import type { Chat, ChatConfig, ChatMessage, ChatUsage } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ChatStreamEvent =
  | { type: "start"; chat: Chat; user_message: ChatMessage }
  | { type: "delta"; content: string }
  | { type: "done"; message: ChatMessage; cost: string; balance: string }
  | { type: "error"; detail: string };

export class ChatHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function postStream(body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${API_URL}/api/v1/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenStorage.access ?? ""}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}

export const chatApi = {
  async config(): Promise<ChatConfig> {
    const r = await apiClient.get("/api/v1/chat/config");
    return r.data;
  },

  async usage(): Promise<ChatUsage> {
    const r = await apiClient.get("/api/v1/chat/usage");
    return r.data;
  },

  async listChats(): Promise<Chat[]> {
    const r = await apiClient.get("/api/v1/chat/chats");
    return r.data;
  },

  async listMessages(chatId: string): Promise<ChatMessage[]> {
    const r = await apiClient.get(`/api/v1/chat/chats/${chatId}/messages`);
    return r.data;
  },

  async rename(chatId: string, title: string): Promise<Chat> {
    const r = await apiClient.patch(`/api/v1/chat/chats/${chatId}`, { title });
    return r.data;
  },

  async remove(chatId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chat/chats/${chatId}`);
  },

  /**
   * Отправить сообщение и читать ответ потоком (Server-Sent Events).
   * Axios не умеет читать поток, поэтому fetch; истёкший токен обновляем
   * через apiClient (его interceptor знает refresh) и повторяем один раз.
   */
  async send(
    body: { chat_id: string | null; model: string; content: string },
    onEvent: (e: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let resp = await postStream(body, signal);
    if (resp.status === 401) {
      await apiClient.get("/api/v1/users/me");
      resp = await postStream(body, signal);
    }
    if (!resp.ok || !resp.body) {
      let detail = "Не удалось отправить сообщение";
      try {
        const data = await resp.json();
        if (typeof data?.detail === "string") detail = data.detail;
      } catch {
        /* тело не JSON */
      }
      throw new ChatHttpError(resp.status, detail);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = raw.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          onEvent(JSON.parse(line.slice(5)) as ChatStreamEvent);
        } catch {
          /* битый кусок — пропускаем */
        }
      }
    }
  },
};
