import { useState, type FormEvent } from 'react';
import { FileCheck2, LoaderCircle } from 'lucide-react';

interface LoginPageProps {
  loading: boolean;
  error: string;
  onLogin: (username: string, password: string) => void;
}

export function LoginPage({ loading, error, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(username.trim(), password);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-icon"><FileCheck2 size={21} /></span>
          <span className="brand-copy"><strong>SignFlow</strong><small>Project approvals</small></span>
        </div>
        <div className="login-heading">
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to continue to your workspace.</p>
        </div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoFocus
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" className="button button-primary login-submit" disabled={loading}>
            {loading ? <><LoaderCircle className="spin" size={16} /> Signing in…</> : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
