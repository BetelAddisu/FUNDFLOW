import { NextRequest, NextResponse } from 'next/server';
import { ChannelInput, ChannelResponse, InterviewSessionService } from './types';

export async function handleWebRequest(
  req: NextRequest,
  service: InterviewSessionService
): Promise<NextResponse> {
  const formData = await req.formData();

  const userId = formData.get('userId') as string;
  const sessionId = formData.get('sessionId') as string;
  const text = formData.get('text') as string | null;
  const audioFile = formData.get('audio') as File | null;
  const photoFiles = formData.getAll('photos') as File[];

  const input: ChannelInput = {
    userId,
    sessionId,
    messageType: 'mixed',
    text: text || undefined,
    audio: audioFile ? Buffer.from(await audioFile.arrayBuffer()) : undefined,
    audioMimeType: audioFile?.type || undefined,
    photos: photoFiles.length
      ? await Promise.all(photoFiles.map((f) => f.arrayBuffer().then((buf) => Buffer.from(buf))))
      : undefined,
    metadata: { channel: 'web' },
  };

  if (input.text && !input.audio && !input.photos?.length) {
    input.messageType = 'text';
  } else if (input.audio && !input.photos?.length) {
    input.messageType = 'voice';
  } else if (input.photos?.length && !input.audio) {
    input.messageType = 'photo';
  } else if (input.photos?.length || input.audio) {
    input.messageType = 'mixed';
  }

  const response: ChannelResponse = await service.process(input);

  return NextResponse.json(response);
}