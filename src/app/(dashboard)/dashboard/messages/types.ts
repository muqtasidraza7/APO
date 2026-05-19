// Core domain types for the messaging feature

export interface RawMessage {
  id: string;
  workspace_id: string;
  project_id: string | null;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  created_at: string;
  reply_to_id: string | null;
  is_pinned: boolean;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
}

export interface ReplyPreview {
  id: string;
  sender_name: string;
  content: string;
}

export interface EnrichedMessage extends RawMessage {
  sender: {
    user_id: string;
    full_name: string;
  };
  reply_preview?: ReplyPreview | null;
}

export interface MessageGroup {
  senderId: string;
  senderName: string;
  timestamp: string;
  messages: EnrichedMessage[];
}

export type ChannelType = "general" | "project";

export interface ActiveChannel {
  type: ChannelType;
  id: string;
  name: string;
  workspaceId: string;
}

export type FeedState = "idle" | "loading" | "ready" | "error" | "access_denied";
export type SendState = "idle" | "sending" | "error";

export interface WorkspaceProject {
  id: string;
  name: string;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
}
