import { useState } from 'react';
import { login } from '../api.ts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      await login(email.trim(), password);
      onLogin();
    } catch (err) {
      const message = err.message || 'Invalid credentials';
      setError(message);
      showToast(message, 'error');
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
          <Input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <Button
            type="submit"
            className="mt-[22px] w-full"
          >
            Sign In
          </Button>
          {error && <p className="mt-3 text-center text-[13px] text-destructive">{error}</p>}
        </form>
        </CardContent>
      </Card>
    </main>
  );
}
