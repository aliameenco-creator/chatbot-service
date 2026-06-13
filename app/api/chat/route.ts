import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { message, clientId } = await req.json();

  if (!message || !clientId) {
    return new Response(JSON.stringify({ error: 'Missing message or clientId' }), { status: 400 });
  }

  const supabase = getSupabase();

  // Look up the client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
  }

  // Check origin against allowed domain
  const origin = req.headers.get('origin') || '';
  const allowed = client.allowed_domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const incoming = origin.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

  const isLocalhost = incoming.startsWith('localhost') || incoming.startsWith('127.0.0.1') || incoming === '';
  const isVercel = incoming.endsWith('.vercel.app');

  if (!isLocalhost && !isVercel && incoming !== allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden: domain not allowed' }), { status: 403 });
  }

  // Check monthly limit
  if (client.messages_used >= client.monthly_limit) {
    return new Response(
      JSON.stringify({ reply: "I'm sorry, this chat has reached its monthly message limit. Please contact the site owner." }),
      { status: 200 }
    );
  }

  const openai = getOpenAI();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          stream: true,
          messages: [
            { role: 'system', content: client.system_prompt },
            { role: 'user', content: message },
          ],
        });

        let fullReply = '';
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            fullReply += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Increment usage and log — fire and forget
        supabase
          .from('clients')
          .update({ messages_used: client.messages_used + 1 })
          .eq('id', clientId)
          .then(() => {});

        supabase
          .from('logs')
          .insert({ client_id: clientId, message, reply: fullReply })
          .then(() => {});

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`Error: ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
