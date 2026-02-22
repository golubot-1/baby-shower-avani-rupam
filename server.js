const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// SUPABASE CONFIG (Placeholder)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/rsvp', async (req, res) => {
  try {
    const { data, error } = await supabase
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
    const { data, error } = await supabase.from('rsvps').select('*');
    if (error) throw error;
    res.json({ count: data.length, rsvps: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎊 Baby Shower site running on port ${PORT}`);
});
