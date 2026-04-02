const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SUPABASE CONFIG
const supabaseUrl = 'https://lgcqmvrgpnfnyqvjqxab.supabase.co';
const supabaseKey = 'sb_publishable_WezuM1X4TcccJIKr4P9RyQ_mte-rjVe';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── VISIT TRACKING ───
function trackVisit(page) {
  return async (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const user_agent = req.headers['user-agent'] || '';
    supabase.from('visits').insert([{ ip, page, user_agent, timestamp: new Date().toISOString() }]).then().catch(err => console.error('Visit log error:', err));
    next();
  };
}

app.get('/', trackVisit('/'), (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/advice', trackVisit('/advice'), (req, res) => res.sendFile(path.join(__dirname, 'advice.html')));

app.get('/api/visits', async (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.from('visits').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    const visits = data || [];
    const uniqueIPs = [...new Set(visits.map(v => v.ip))];
    res.json({ total: visits.length, unique: uniqueIPs.length, ips: uniqueIPs, visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

app.post('/api/rsvp', async (req, res) => {
  const { name, attending } = req.body;
  if (!name || !attending) {
      return res.status(400).json({ error: "Invalid data" });
  }
  try {
    const { error } = await supabase
      .from('rsvps')
      .insert([{ 
        name: req.body.name,
        attending: req.body.attending,
        guests: req.body.guests,
        prediction: req.body.prediction,
        message: req.body.message,
        email: req.body.email,
        timestamp: new Date().toISOString() 
      }]);
    
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save RSVP' });
  }
});

app.get('/api/rsvps', async (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.from('rsvps').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ count: data.length, rsvps: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

app.delete('/api/rsvps/:id', async (req, res) => {
    if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    try {
        const { error } = await supabase.from('rsvps').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: "Entry deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// ─── ADVICE ENDPOINTS ───
app.post('/api/advice', async (req, res) => {
  const { guest_name, advice_text } = req.body;
  if (!guest_name || !advice_text) {
    return res.status(400).json({ error: 'Name and advice are required' });
  }
  try {
    const { error } = await supabase
      .from('advice')
      .insert([{ guest_name, advice_text, timestamp: new Date().toISOString() }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save advice' });
  }
});

app.get('/api/advice', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('advice')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    res.json({ advice: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advice' });
  }
});

app.delete('/api/advice/:id', async (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { error } = await supabase.from('advice').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─── TELEGRAM CHAT ENDPOINTS ───
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let activeSessionId = null; // tracks which session Rupam is currently talking to

// Helper: send a message via Telegram Bot API
async function telegramSend(method, body) {
  if (!TELEGRAM_BOT_TOKEN) return;
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

app.post('/api/chat/send', async (req, res) => {
  const { session_id, visitor_name, message } = req.body;
  if (!session_id || !message) {
    return res.status(400).json({ error: 'session_id and message are required' });
  }
  try {
    // Store message in Supabase
    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        session_id,
        sender: 'visitor',
        visitor_name: visitor_name || 'Guest',
        message,
        timestamp: new Date().toISOString()
      }]);
    if (error) throw error;

    // Forward to Telegram with inline Reply button
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const name = visitor_name || 'Guest';
      const shortId = session_id.slice(0, 8);
      const telegramText = `💬 [Session: ${session_id}]\nFrom: ${name}\n\n${message}`;
      await telegramSend('sendMessage', {
        chat_id: TELEGRAM_CHAT_ID,
        text: telegramText,
        reply_markup: {
          inline_keyboard: [[
            { text: `↩️ Reply to ${name}`, callback_data: `reply:${session_id}` }
          ]]
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/chat/messages', async (req, res) => {
  const { session_id, after } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  try {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: true });
    if (after) {
      query = query.gt('timestamp', after);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Helper: resolve which session a Telegram message should go to
async function resolveSessionId(msg) {
  // 1. Swipe-reply: extract session from original message
  if (msg.reply_to_message) {
    const originalText = msg.reply_to_message.text || '';
    const sessionMatch = originalText.match(/\[Session: (.+?)\]/);
    if (sessionMatch) {
      activeSessionId = sessionMatch[1]; // also set as active
      return sessionMatch[1];
    }
  }
  // 2. /reply command: /reply <session_id> <message>
  if (msg.text && msg.text.startsWith('/reply ')) {
    const parts = msg.text.match(/^\/reply\s+(\S+)\s+(.+)$/s);
    if (parts) return { sessionId: parts[1], message: parts[2] };
  }
  // 3. Plain message: use the active session (set by inline button tap)
  if (activeSessionId) return activeSessionId;
  // 4. Last resort: most recent visitor session
  const { data } = await supabase
    .from('chat_messages')
    .select('session_id')
    .eq('sender', 'visitor')
    .order('timestamp', { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0].session_id;
  return null;
}

// Helper: handle a Telegram message (used by both webhook and polling)
async function handleTelegramUpdate(update) {
  // Handle inline button taps (Reply to <name>)
  if (update.callback_query) {
    const cbData = update.callback_query.data || '';
    if (cbData.startsWith('reply:')) {
      const sessionId = cbData.slice(6);
      activeSessionId = sessionId;
      // Look up the visitor name for this session
      const { data } = await supabase
        .from('chat_messages')
        .select('visitor_name')
        .eq('session_id', sessionId)
        .eq('sender', 'visitor')
        .limit(1);
      const name = (data && data[0]) ? data[0].visitor_name : sessionId.slice(0, 8);
      await telegramSend('answerCallbackQuery', {
        callback_query_id: update.callback_query.id,
        text: `Now chatting with ${name}. Just type your reply!`
      });
      await telegramSend('sendMessage', {
        chat_id: TELEGRAM_CHAT_ID,
        text: `✅ Active chat switched to: ${name}\nJust type your messages — they'll go to ${name}.`
      });
    }
    return;
  }

  const msg = update.message;
  if (!msg || !msg.text || msg.text.startsWith('/start')) return;

  // Handle /sessions command
  if (msg.text === '/sessions') {
    const { data } = await supabase
      .from('chat_messages')
      .select('session_id, visitor_name, timestamp')
      .eq('sender', 'visitor')
      .order('timestamp', { ascending: false });
    if (!data || data.length === 0) {
      await telegramSend('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: 'No active chat sessions.' });
      return;
    }
    // Deduplicate by session_id, keep most recent
    const seen = new Map();
    data.forEach(m => { if (!seen.has(m.session_id)) seen.set(m.session_id, m); });
    const sessions = [...seen.values()].slice(0, 10);
    const buttons = sessions.map(s => [{
      text: `${s.visitor_name} (${new Date(s.timestamp).toLocaleTimeString()})`,
      callback_data: `reply:${s.session_id}`
    }]);
    await telegramSend('sendMessage', {
      chat_id: TELEGRAM_CHAT_ID,
      text: `📋 Active sessions (${seen.size}):\nTap to switch:`,
      reply_markup: { inline_keyboard: buttons }
    });
    return;
  }

  // Regular message — resolve and store
  const resolved = await resolveSessionId(msg);
  let sessionId, replyText;
  if (resolved && typeof resolved === 'object') {
    sessionId = resolved.sessionId;
    replyText = resolved.message;
  } else {
    sessionId = resolved;
    replyText = msg.text;
  }

  if (sessionId && replyText) {
    await supabase.from('chat_messages').insert([{
      session_id: sessionId,
      sender: 'host',
      visitor_name: 'Rupam',
      message: replyText,
      timestamp: new Date().toISOString()
    }]);
    // Look up who we replied to
    const { data } = await supabase
      .from('chat_messages')
      .select('visitor_name')
      .eq('session_id', sessionId)
      .eq('sender', 'visitor')
      .limit(1);
    const name = (data && data[0]) ? data[0].visitor_name : 'visitor';
    console.log(`💬 Reply sent to ${name} (${sessionId.slice(0, 8)})`);
  }
}

app.post('/api/chat/telegram-webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
  } catch (err) {
    console.error('Telegram webhook error:', err);
  }
  res.json({ ok: true });
});

// Export for Vercel
module.exports = app;

// Only listen if running directly
if (require.main === module) {
    const PORT = process.env.PORT || 3333;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎊 Baby Shower site running on port ${PORT}`);
    });

    // ─── LOCAL TELEGRAM POLLING (replaces webhook for local dev) ───
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        let lastUpdateId = 0;
        async function pollTelegram() {
            try {
                const res = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`
                );
                const data = await res.json();
                if (data.ok && data.result.length > 0) {
                    for (const update of data.result) {
                        lastUpdateId = update.update_id;
                        await handleTelegramUpdate(update);
                    }
                }
            } catch (err) {
                console.error('Telegram poll error:', err.message);
            }
            setTimeout(pollTelegram, 3000);
        }
        console.log('📡 Telegram polling active (local dev mode)');
        pollTelegram();
    }
}
