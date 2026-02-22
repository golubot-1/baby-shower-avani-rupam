const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// BOT PROTECTION: Rate limiting
// Max 5 RSVPs per 15 minutes from a single IP to prevent script/bot spam
const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many RSVPs from this device. Please try again later." }
});

// SUPABASE CONFIG
const supabaseUrl = 'https://lgcqmvrgpnfnyqvjqxab.supabase.co';
const supabaseKey = 'sb_publishable_WezuM1X4TcccJIKr4P9RyQ_mte-rjVe';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/rsvp', rsvpLimiter, async (req, res) => {
  // BOT PROTECTION: Basic field validation
  const { name, attending } = req.body;
  if (!name || name.length < 2 || !attending) {
      return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const { error } = await supabase
      .from('rsvps')
      .insert([{ ...req.body, timestamp: new Date().toISOString() }]);
    
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

// NEW FEATURE: Delete RSVP
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

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎊 Baby Shower site running on port ${PORT}`);
});
