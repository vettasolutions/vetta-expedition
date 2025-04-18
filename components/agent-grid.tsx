'use client';

import { AgentCard } from '@/components/agent-card';

export function AgentGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 max-w-[1200px] mx-auto">
      <AgentCard 
        title="RFQ Antibody Agent" 
        description="Request for quotation antibody agent"
      />
      {/* More agent cards can be added here in the future */}
    </div>
  );
} 