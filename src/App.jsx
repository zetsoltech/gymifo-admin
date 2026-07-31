import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isAuthenticated, logout, SESSION_EXPIRED_EVENT } from './api.ts';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ExercisesPage } from './pages/ExercisesPage.jsx';
import { RecipesPage } from './pages/RecipesPage.jsx';
import { RecommendationsPage } from './pages/RecommendationsPage.jsx';
import { SourcingPage } from './pages/SourcingPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { TopNav } from './components/TopNav.jsx';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [activePage, setActivePage] = useState('dashboard');
  const [sessionExpired, setSessionExpired] = useState(false);

  // api.ts fires this once the refresh token can no longer buy a new access
  // token — the session is gone and only a fresh login recovers it.
  useEffect(() => {
    const onExpired = () => setSessionExpired(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  function showToast(message, tone = 'info') {
    if (tone === 'success') toast.success(message);
    else if (tone === 'error') toast.error(message);
    else toast.info(message);
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setActivePage('dashboard');
    showToast('Signed out.', 'info');
  }

  function handleRelogin() {
    logout();
    setSessionExpired(false);
    setAuthed(false);
    setActivePage('dashboard');
  }

  if (!authed) {
    return (
      <>
        <LoginPage
          onLogin={() => {
            setAuthed(true);
            showToast('Signed in successfully.', 'success');
          }}
          showToast={showToast}
        />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <TopNav activePage={activePage} onNavigate={setActivePage} onLogout={handleLogout} />
      <main className="mx-auto w-[min(90vw,1800px)] px-4 py-6 sm:px-6 lg:px-8">
        {activePage === 'dashboard' && <DashboardPage />}
        {activePage === 'exercises' && <ExercisesPage showToast={showToast} />}
        {activePage === 'recipes' && <RecipesPage showToast={showToast} />}
        {activePage === 'recommendations' && <RecommendationsPage showToast={showToast} />}
        {activePage === 'sourcing' && <SourcingPage showToast={showToast} />}
        {activePage === 'users' && <UsersPage showToast={showToast} />}
      </main>

      {/* Not dismissible — behind it every request 401s, so there is nothing
          usable to go back to. */}
      <Dialog open={sessionExpired}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Session ended</DialogTitle>
            <DialogDescription>
              Your account was signed in on another device, so this session was signed out.
              Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleRelogin}>Log in again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="top-right" />
    </div>
  );
}
