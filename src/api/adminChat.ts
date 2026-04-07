import { api } from "@/api/client";

export type ChatUserStub = {
  id: string;
  name: string;
  email?: string | null;
  profile?: { phoneNumber?: string | null; displayName?: string | null } | null;
};

export type ChatThreadSummary = {
  id: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
  task: { id: string; title: string; status: string };
  consumer: ChatUserStub;
  helper: ChatUserStub;
  messages: { id: string; text?: string | null; createdAt: string; senderUserId: string }[];
  _count: { messages: number };
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  text?: string | null;
  status: string;
  createdAt: string;
  sender: ChatUserStub;
  attachments: {
    id: string;
    kind: string;
    mimeType: string;
    url: string;
    width?: number | null;
    height?: number | null;
    size?: number | null;
  }[];
};

export type ChatThreadDetail = {
  thread: ChatThreadSummary;
  messages: ChatMessage[];
  nextCursor: string | null;
};

export async function adminListChatThreads(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const { data } = await api.get<{
    items: ChatThreadSummary[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>("/admin/chat/threads", { params });
  return data;
}

export async function adminGetChatThread(threadId: string, params?: { limit?: number; cursor?: string }) {
  const { data } = await api.get<ChatThreadDetail>(`/admin/chat/threads/${threadId}`, { params });
  return data;
}
