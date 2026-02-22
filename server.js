const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// RAILWAY PERSISTENT VOLUME PATH:
// By default, Railway's /data mount is persistent.
// We'll fall back to __dirname for local development.
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const RSVP_FILE = path.join(DATA_DIR, 'rsvps.json');

if (!fs.existsSync(RSVP_FILE)) {
    console.log('Initializing RSVP store at:', RSVP_FILE);
    fs.writeFileSync(RSVP_FILE, '[]');
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/rsvp', (req, res) => {
  try {
    const data = fs.readFileSync(RSVP_FILE, 'utf8');
    const rsvps = JSON.parse(data || '[]');
    const entry = { ...req.body, timestamp: new Date().toISOString() };
    rsvps.push(entry);
    fs.writeFileSync(RSVP_FILE, JSON.stringify(rsvps, null, 2));
    console.log('New RSVP:', entry.name, '|', entry.attending);
    res.json({ success: true, message: "RSVP received!" });
  } catch (err) {
    console.error('RSVP Error:', err);
    res.status(500).json({ error: 'Failed to save RSVP' });
  }
});

app.get('/api/rsvps', (req, res) => {
  // Simple passkey security: babyshower2026
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = fs.readFileSync(RSVP_FILE, 'utf8');
    const rsvps = JSON.parse(data || '[]');
    res.json({ count: rsvps.length, rsvps });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read RSVPs' });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎊 Baby Shower site running on port ${PORT}`);
    console.log(`📂 Data stored in: ${RSVP_FILE}`);
});
