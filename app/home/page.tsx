import { HomeHeader } from '@/components/home-header';
import { AgentGrid } from '@/components/agent-grid';

export default function HomePage() {
  return (
    <div className="flex flex-col h-dvh bg-background">
      <HomeHeader />
      <main className="flex-grow overflow-auto">
        <div className="container max-w-7xl mx-auto py-8">
          <AgentGrid />
        </div>
      </main>
    </div>
  );
} 