import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { login } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      onLogin();
    } catch (err) {
      const message = err.message || 'Invalid credentials';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-[360px]">
        <CardContent className="p-10">
        <div className="mb-1.5 flex items-center justify-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[17px] font-extrabold text-primary-foreground">
            G
          </span>
          <h1 className="text-[19px] font-bold">Gymifo</h1>
        </div>
        <p className="mb-7 text-center text-sm text-muted-foreground">Exercise Video Portal</p>

        <form onSubmit={handleSubmit}>
          <Label className="mb-1.5 mt-3.5" htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            placeholder="you@gymifo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <Label className="mb-1.5 mt-3.5" htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Password"
              className="pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            className="mt-[22px] w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          {error && <p className="mt-3 text-center text-[13px] text-destructive">{error}</p>}
        </form>
        </CardContent>
      </Card>
    </main>
  );
}
