import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { captureError } from '../lib/sentry';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    captureError(new Error(`404 ${location.pathname}`), { path: location.pathname, search: location.search });
  }, [location.pathname, location.search]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      navigate('/');
      return;
    }
    navigate(`/help?q=${encodeURIComponent(q)}`);
  };

  return (
    <main className="ds-legal" style={{ textAlign: 'center' }}>
      <p style={{ color: '#475569', fontWeight: 600, marginBottom: 8 }}>404</p>
      <h1>We can’t find that page</h1>
      <p>The link may be old, or the address was typed wrong.</p>
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, margin: '24px auto', maxWidth: 480 }}>
        <label className="ds-field" style={{ flex: 1, margin: 0, textAlign: 'left' }}>
          <span className="ds-hint">Search help</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try invoices, sales, staff"
            aria-label="Search help"
          />
        </label>
        <Button type="submit" size="lg" aria-label="Search">
          <Search size={20} aria-hidden="true" />
        </Button>
      </form>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </main>
  );
}
