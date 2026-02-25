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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/rsvp', async (req, res) => {
  const { name, attending } = req.body;
  if (!name || !attending) {
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

// Export for Vercel
module.exports = app;

// Only listen if running directly
if (require.main === module) {
    const PORT = process.env.PORT || 3333;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎊 Baby Shower site running on port ${PORT}`);
    });
}
