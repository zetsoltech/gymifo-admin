import { LogOut, Menu } from 'lucide-react';
import { getCurrentUser } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Rendered by both the desktop row and the mobile menu, so the two cannot
// drift apart as pages are added.
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'exercises', label: 'Exercises' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'video-qa', label: 'Video QA' },
  { id: 'users', label: 'Users' },
];

export function TopNav({ activePage, onNavigate, onLogout }) {
  const { email } = getCurrentUser();
  const displayName = email ? email.split('@')[0] : 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-[min(90vw,1800px)] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:gap-7">
          {/* Below md the nav row is hidden; without this menu there is no way
              to reach any other page on a phone. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {NAV_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => onNavigate(item.id)}
                  className={activePage === item.id ? 'bg-accent text-accent-foreground' : undefined}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[17px] font-extrabold text-primary-foreground">
              G
            </span>
            <strong className="text-[19px]">Gymifo</strong>
          </div>

          <nav className="hidden gap-1.5 md:flex" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={activePage === item.id ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full p-1 pr-2.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-[#b07cff] to-[#5b9dff] text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span>Signed in as</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {email || 'admin'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onLogout}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
