'use client';

import type { User } from 'next-auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';

export function HomeSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/home"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Expedition
              </span>
            </Link>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-2 text-sm font-semibold">Menu</h2>
          <div className="space-y-1">
            <Button
              variant={pathname === '/home' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setOpenMobile(false);
                router.push('/home');
              }}
            >
              AI Agents
            </Button>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
} 