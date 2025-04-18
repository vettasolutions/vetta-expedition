'use client';

import { useWindowSize } from 'usehooks-ts';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';

function PureHomeHeader() {
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-3 items-center px-4 gap-2 border-b">
      <SidebarToggle />
      
      <div className="flex items-center ml-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
          Basecamp
        </h1>
        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          Beta
        </span>
      </div>
      
      <div className="ml-auto flex items-center gap-2">
        {/* You can add additional header elements here if needed */}
      </div>
    </header>
  );
}

export const HomeHeader = memo(PureHomeHeader); 