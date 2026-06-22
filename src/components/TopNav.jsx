import { LogOut } from 'lucide-react';
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

export function TopNav({ activePage, onNavigate, onLogout }) {
  const { email } = getCurrentUser();
  const displayName = email ? email.split('@')[0] : 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-[min(90vw,1800px)] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[17px] font-extrabold text-primary-foreground">
              G
            </span>
            <strong className="text-[19px]">Gymifo</strong>
          </div>
          <nav className="hidden gap-1.5 md:flex" aria-label="Main navigation">
            <Button
              type="button"
              variant={activePage === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => onNavigate('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              type="button"
              variant={activePage === 'exercises' ? 'default' : 'ghost'}
              onClick={() => onNavigate('exercises')}
            >
              Exercises
            </Button>
            <Button
              type="button"
              variant={activePage === 'recipes' ? 'default' : 'ghost'}
              onClick={() => onNavigate('recipes')}
            >
              Recipes
            </Button>
            <Button
              type="button"
              variant={activePage === 'recommendations' ? 'default' : 'ghost'}
              onClick={() => onNavigate('recommendations')}
            >
              Recommendations
            </Button>
            <Button type="button" variant="ghost" disabled>
              Users
            </Button>
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
