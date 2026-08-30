export interface ChannelInput {
  userId: string;
  sessionId: string;
  messageType: 'text' | 'voice' | 'photo' | 'mixed';
  text?: string;
  audio?: Buffer;
  audioMimeType?: string;
  photos?: Buffer[];
  metadata: {
    channel: 'web' | 'telegram';
    [key: string]: unknown;
  };
}

export interface ChannelResponse {
  text: string;
  attachments?: Buffer[];
  metadata?: Record<string, unknown>;
}

export interface InterviewSessionService {
  process(input: ChannelInput): Promise<ChannelResponse>;
}