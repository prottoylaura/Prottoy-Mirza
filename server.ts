import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// --- Database Logic (Simple JSON File) ---
const DB_PATH = path.join(__dirname, 'db.json');

interface User {
  userId: string;
  username: string;
  profilePhoto?: string;
  balance: number;
  adsWatchedToday: number;
  totalAdsWatched: number;
  referredBy?: string;
  referralRewardGiven: boolean;
  deviceId: string;
  ip: string;
  isBlocked: boolean;
  createdAt: string;
  lastAdTime: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  number: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Database {
  users: Record<string, User>;
  withdrawals: Withdrawal[];
  stats: {
    totalPaid: number;
    totalUsers: number;
  };
}

function loadDb(): Database {
  if (!fs.existsSync(DB_PATH)) {
    const initial: Database = { users: {}, withdrawals: [], stats: { totalPaid: 0, totalUsers: 0 } };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDb(db: Database) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// --- Anti-Cheat Rate Limiter ---
const adRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 ad claims per 15 mins
  message: { error: 'Too many ad requests. Please slow down.' }
});

// --- API Routes ---

// Login/Sync User
app.post('/api/auth/sync', (req, res) => {
  const { userData, deviceId } = req.body;
  const db = loadDb();
  
  const telegramId = userData.id.toString();
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

  // Check if IP already has 2 accounts
  const ipCount = Object.values(db.users).filter(u => u.ip === ip && u.userId !== telegramId).length;
  if (ipCount >= 2) {
    return res.status(403).json({ error: 'IP limit exceeded. Max 2 accounts per IP.' });
  }

  // Check unique device ID
  const deviceUser = Object.values(db.users).find(u => u.deviceId === deviceId && u.userId !== telegramId);
  if (deviceUser) {
    return res.status(403).json({ error: 'This device is already linked to another account.' });
  }

  let user = db.users[telegramId];

  if (!user) {
    user = {
      userId: telegramId,
      username: userData.username || 'User',
      profilePhoto: userData.photo_url || '',
      balance: 0,
      adsWatchedToday: 0,
      totalAdsWatched: 0,
      referredBy: userData.referredBy || null,
      referralRewardGiven: false,
      deviceId,
      ip,
      isBlocked: false,
      createdAt: new Date().toISOString(),
      lastAdTime: ''
    };
    db.users[telegramId] = user;
    db.stats.totalUsers++;
  } else {
    // Update existing user info
    user.username = userData.username || user.username;
    user.profilePhoto = userData.photo_url || user.profilePhoto;
    user.ip = ip;
  }

  saveDb(db);
  res.json(user);
});

// Claim Ad Reward
app.post('/api/ads/reward', adRateLimit, (req, res) => {
  const { userId, type } = req.body; // type: 'rewarded' | 'smartlink'
  const db = loadDb();
  const user = db.users[userId];

  if (!user || user.isBlocked) {
    return res.status(403).json({ error: 'Account blocked or not found.' });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const lastAd = user.lastAdTime ? new Date(user.lastAdTime).toISOString().split('T')[0] : '';

  if (today !== lastAd) {
    user.adsWatchedToday = 0;
  }

  if (user.adsWatchedToday >= 20) {
    return res.status(400).json({ error: 'Daily ad limit reached (Max 20).' });
  }

  // Basic anti-cheat: ensure at least 10 seconds since last reward
  if (user.lastAdTime) {
    const diff = now.getTime() - new Date(user.lastAdTime).getTime();
    if (diff < 10000) {
      return res.status(400).json({ error: 'Please wait before claiming another reward.' });
    }
  }

  // Dynamic reward Calculation
  const rewardAmount = type === 'rewarded' ? 0.05 : 0.02;
  user.balance += rewardAmount;
  user.adsWatchedToday++;
  user.totalAdsWatched++;
  user.lastAdTime = now.toISOString();

  // Referral Reward Logic: Friend watches 10 ads
  if (user.referredBy && !user.referralRewardGiven && user.totalAdsWatched >= 10) {
    const referrer = db.users[user.referredBy];
    if (referrer) {
      referrer.balance += 0.20; // $0.20 per valid referral
      user.referralRewardGiven = true;
    }
  }

  saveDb(db);
  res.json({ balance: user.balance, adsWatchedToday: user.adsWatchedToday });
});

// Withdraw Request
app.post('/api/withdraw', (req, res) => {
  const { userId, amount, method, number } = req.body;
  const db = loadDb();
  const user = db.users[userId];

  if (!user || user.balance < amount || amount < 2) {
    return res.status(400).json({ error: 'Insufficient balance or below minimum ($2).' });
  }

  user.balance -= amount;
  const withdrawal: Withdrawal = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    amount,
    method,
    number,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.withdrawals.push(withdrawal);
  saveDb(db);
  res.json({ success: true, balance: user.balance });
});

// Withdraw History
app.get('/api/withdraw/history/:userId', (req, res) => {
  const { userId } = req.params;
  const db = loadDb();
  const history = db.withdrawals.filter(w => w.userId === userId);
  res.json(history);
});

// Stats for Referral Page
app.get('/api/referrals/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const db = loadDb();
  const referredUsers = Object.values(db.users).filter(u => u.referredBy === userId);
  
  res.json({
    count: referredUsers.length,
    earnings: referredUsers.filter(u => u.referralRewardGiven).length * 0.20,
    list: referredUsers.map(u => ({
      username: u.username,
      adsWatched: u.totalAdsWatched,
      qualified: u.referralRewardGiven
    }))
  });
});

// --- Start Server with Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
