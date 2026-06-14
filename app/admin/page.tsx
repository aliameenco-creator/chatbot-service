'use client';

import { useState, useEffect, useCallback } from 'react';

interface Client {
  id: string;
  name: string;
  system_prompt: string;
  allowed_domain: string;
  monthly_limit: number;
  messages_used: number;
  created_at: string;
}

const EMPTY_FORM = {
  id: '',
  name: '',
  system_prompt: '',
  allowed_domain: '',
  monthly_limit: '2000',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const savedPassword = typeof window !== 'undefined' ? localStorage.getItem('admin_pw') ?? '' : '';

  const fetchClients = useCallback(async (pw: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/clients', {
      headers: { Authorization: `Bearer ${pw}` },
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setClients(data);
    }
  }, []);

  useEffect(() => {
    if (savedPassword) {
      fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${savedPassword}` },
      }).then((res) => {
        if (res.ok) {
          setAuthed(true);
          setPassword(savedPassword);
          res.json().then(setClients);
        }
      });
    }
  }, [savedPassword]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const res = await fetch('/api/admin/clients', {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.ok) {
      localStorage.setItem('admin_pw', password);
      setAuthed(true);
      const data = await res.json();
      setClients(data);
    } else {
      setAuthError('Wrong password.');
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_pw');
    setAuthed(false);
    setPassword('');
    setClients([]);
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setFormSuccess(`Client "${form.name}" created successfully.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchClients(password);
    } else {
      setFormError(data.error ?? 'Something went wrong.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${password}` },
    });
    setDeletingId(null);
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert('Failed to delete client.');
    }
  }

  async function handleReset(id: string) {
    if (!confirm('Reset message count to 0 for this client?')) return;
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ messages_used: 0 }),
    });
    if (res.ok) {
      fetchClients(password);
    }
  }

  if (!authed) {
    return (
      <main style={styles.center}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Admin Login</h1>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoFocus
            />
            {authError && <p style={styles.error}>{authError}</p>}
            <button type="submit" style={styles.btnPrimary}>Log in</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Chatbot Admin</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }} style={styles.btnPrimary}>
            {showForm ? 'Cancel' : '+ Add Client'}
          </button>
          <button onClick={handleLogout} style={styles.btnGhost}>Log out</button>
        </div>
      </div>

      {formSuccess && <p style={styles.success}>{formSuccess}</p>}

      {showForm && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>New Client</h2>
          <form onSubmit={handleAddClient} style={styles.formGrid}>
            <label style={styles.label}>
              Client ID <span style={styles.hint}>(no spaces, e.g. craftsfabrics)</span>
              <input style={styles.input} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="craftsfabrics" required />
            </label>
            <label style={styles.label}>
              Client Name
              <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CraftsFabrics" required />
            </label>
            <label style={styles.label}>
              Allowed Domain <span style={styles.hint}>(e.g. craftsfabrics.com)</span>
              <input style={styles.input} value={form.allowed_domain} onChange={(e) => setForm({ ...form, allowed_domain: e.target.value })} placeholder="craftsfabrics.com" required />
            </label>
            <label style={styles.label}>
              Monthly Message Limit
              <input style={styles.input} type="number" min="1" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} required />
            </label>
            <label style={{ ...styles.label, gridColumn: '1 / -1' }}>
              System Prompt <span style={styles.hint}>(bot personality — write it like briefing a new assistant)</span>
              <textarea style={styles.textarea} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={5} placeholder="You are a friendly assistant for CraftsFabrics, a UK fabric shop. Help customers with products, shipping, and orders. Be warm and brief." required />
            </label>
            {formError && <p style={{ ...styles.error, gridColumn: '1 / -1' }}>{formError}</p>}
            <button type="submit" style={{ ...styles.btnPrimary, gridColumn: '1 / -1' }}>Create Client</button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888', marginTop: '2rem' }}>Loading clients...</p>
      ) : clients.length === 0 ? (
        <div style={styles.empty}>
          <p>No clients yet. Add your first one above.</p>
        </div>
      ) : (
        <div style={styles.clientGrid}>
          {clients.map((client) => {
            const pct = Math.min(100, Math.round((client.messages_used / client.monthly_limit) * 100));
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
            return (
              <div key={client.id} style={styles.clientCard}>
                <div style={styles.clientHeader}>
                  <div>
                    <h2 style={styles.clientName}>{client.name}</h2>
                    <code style={styles.clientId}>{client.id}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleReset(client.id)} style={styles.btnSmallGhost} title="Reset message count">Reset</button>
                    <button onClick={() => handleDelete(client.id, client.name)} style={styles.btnSmallDanger} disabled={deletingId === client.id}>
                      {deletingId === client.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <p style={styles.domain}>{client.allowed_domain}</p>

                <div style={{ marginTop: '0.75rem' }}>
                  <div style={styles.usageRow}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Usage this month</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{client.messages_used} / {client.monthly_limit}</span>
                  </div>
                  <div style={styles.barBg}>
                    <div style={{ ...styles.barFill, width: `${pct}%`, background: barColor }} />
                  </div>
                </div>

                <details style={{ marginTop: '0.75rem' }}>
                  <summary style={styles.promptToggle}>View system prompt</summary>
                  <p style={styles.promptText}>{client.system_prompt}</p>
                </details>

                <div style={styles.snippetBox}>
                  <p style={styles.snippetLabel}>Widget snippet</p>
                  <code style={styles.snippet}>{`<script src="https://YOUR-VERCEL-URL/widget.js" data-client-id="${client.id}"></script>`}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' },
  loginBox: { background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '360px' },
  loginTitle: { margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 700 },
  loginForm: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  page: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 700 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
  cardTitle: { margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 600 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  hint: { fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' },
  input: { padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' },
  btnSmallGhost: { background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.78rem', cursor: 'pointer' },
  btnSmallDanger: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0' },
  success: { color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: '4rem' },
  clientGrid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  clientCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem 1.5rem' },
  clientHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientName: { margin: '0 0 0.2rem', fontSize: '1.05rem', fontWeight: 700 },
  clientId: { fontSize: '0.78rem', color: '#9ca3af', background: '#f3f4f6', padding: '0.15rem 0.45rem', borderRadius: '4px' },
  domain: { margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#6b7280' },
  usageRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' },
  barBg: { height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px', transition: 'width 0.3s' },
  promptToggle: { fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer' },
  promptText: { fontSize: '0.82rem', color: '#374151', marginTop: '0.5rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '6px', whiteSpace: 'pre-wrap' },
  snippetBox: { marginTop: '0.75rem', background: '#f9fafb', borderRadius: '8px', padding: '0.75rem' },
  snippetLabel: { margin: '0 0 0.35rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 },
  snippet: { fontSize: '0.75rem', color: '#374151', wordBreak: 'break-all' },
};
