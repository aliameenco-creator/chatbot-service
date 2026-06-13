export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Chatbot Service</h1>
      <p>This service is running. Add your client snippet to any website to activate a chatbot.</p>
      <h2>How to add the widget</h2>
      <p>Paste this before the <code>&lt;/body&gt;</code> tag on your client&apos;s site:</p>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>
        {`<script src="https://YOUR-VERCEL-URL/widget.js" data-client-id="YOUR-CLIENT-ID"></script>`}
      </pre>
      <p>Replace <code>YOUR-VERCEL-URL</code> with your Vercel deployment URL and <code>YOUR-CLIENT-ID</code> with the <code>id</code> you set in your Supabase <code>clients</code> table.</p>
    </main>
  );
}
