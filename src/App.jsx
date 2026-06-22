import { useState } from 'react';
import { toast } from 'sonner';
import { isAuthenticated, logout } from './api.ts';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ExercisesPage } from './pages/ExercisesPage.jsx';
import { RecipesPage } from './pages/RecipesPage.jsx';
import { RecommendationsPage } from './pages/RecommendationsPage.jsx';
import { TopNav } from './components/TopNav.jsx';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [activePage, setActivePage] = useState('dashboard');

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
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
