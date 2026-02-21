const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const RSVP_FILE = path.join(__dirname, 'rsvps.json');
if (!fs.existsSync(RSVP_FILE)) fs.writeFileSync(RSVP_FILE, '[]');

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/rsvp', (req, res) => {
  const rsvps = JSON.parse(fs.readFileSync(RSVP_FILE));
  const entry = { ...req.body, timestamp: new Date().toISOString() };
  rsvps.push(entry);
  fs.writeFileSync(RSVP_FILE, JSON.stringify(rsvps, null, 2));
  console.log('New RSVP:', entry.name, '|', entry.attending);
  res.json({ success: true, message: "RSVP received!" });
});

app.get('/api/rsvps', (req, res) => {
  if (req.query.key !== 'babyshower2026') return res.status(401).json({ error: 'Unauthorized' });
  const rsvps = JSON.parse(fs.readFileSync(RSVP_FILE));
  res.json({ count: rsvps.length, rsvps });
});

const PORT = 3333;
app.listen(PORT, () => console.log(`🎊 Baby Shower site running at http://localhost:${PORT}`));
