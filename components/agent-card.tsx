'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

type AgentCardProps = {
  title: string;
  description?: string;
  modelId?: string;
  onClick?: () => void;
};

export function AgentCard({ 
  title, 
  description, 
  modelId = DEFAULT_CHAT_MODEL,
  onClick 
}: AgentCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Generate a new chat ID and navigate to the chat interface
      const chatId = generateUUID();
      
      // Set the model cookie before navigating
      document.cookie = `chat-model=${modelId}; path=/; max-age=${60 * 60 * 24 * 7}`;
      
      // Navigate to the chat interface
      router.push(`/chat/${chatId}`);
    }
  };

  return (
    <Card 
      className="flex flex-row cursor-pointer transition-all hover:shadow-md w-full h-[160px] border-2 hover:border-primary"
      onClick={handleClick}
    >
      <div className="flex items-center justify-center w-[160px] min-w-[160px] bg-muted/30">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
          RFQ
        </div>
      </div>
      <div className="flex flex-col flex-grow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit">
            Antibody
          </div>
        </CardContent>
      </div>
    </Card>
  );
} 