/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  DollarSign, 
  Users, 
  CreditCard, 
  User, 
  ExternalLink, 
  PlayCircle, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Clock,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { apiService } from './services/apiService.ts';

// --- Types ---
interface UserData {
  userId: string;
  username: string;
  profilePhoto: string;
  balance: number;
  adsWatchedToday: number;
  totalAdsWatched: number;
  referredBy?: string;
  createdAt: string;
}

type Page = 'home' | 'earn' | 'referral' | 'withdraw' | 'profile';

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activePage, setActivePage] = useState<Page>('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId ] = useState<string>('');

  // --- Auth & Sync ---
  const syncUser = useCallback(async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const did = result.visitorId;
      setDeviceId(did);

      // In real TG env, data comes from WebApp.initDataUnsafe
      const tgUser = WebApp.initDataUnsafe?.user || {
        id: '12345', // Mock for testing in browser
        username: 'TestUser',
        photo_url: 'https://i.pravatar.cc/150?u=12345'
      };

      // Get referral ID from start param (t.me/bot?start=123)
      const startParam = WebApp.initDataUnsafe?.start_param;
      
      const syncedUser = await apiService.syncUser({
        ...tgUser,
        referredBy: startParam
      }, did);

      setUser(syncedUser);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    WebApp.ready();
    syncUser();
  }, [syncUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white gap-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse">Syncing with AdCash Pro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-bold mb-2">Access Restricted</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/10 rounded-xl font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden bg-black">
      <div className="glow-mesh" />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6">
        <AnimatePresence mode="wait">
          {activePage === 'home' && <HomePage user={user!} />}
          {activePage === 'earn' && <EarnPage user={user!} onReward={(balance, watched) => setUser({ ...user!, balance, adsWatchedToday: watched })} />}
          {activePage === 'referral' && <ReferralPage user={user!} />}
          {activePage === 'withdraw' && <WithdrawPage user={user!} onWithdraw={(newBalance) => setUser({ ...user!, balance: newBalance })} />}
          {activePage === 'profile' && <ProfilePage user={user!} />}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-black/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-between z-50">
        <NavButton icon={Home} label="Home" active={activePage === 'home'} onClick={() => setActivePage('home')} />
        <NavButton icon={DollarSign} label="Earn" active={activePage === 'earn'} onClick={() => setActivePage('earn')} />
        <NavButton icon={Users} label="Friends" active={activePage === 'referral'} onClick={() => setActivePage('referral')} />
        <NavButton icon={CreditCard} label="Wallet" active={activePage === 'withdraw'} onClick={() => setActivePage('withdraw')} />
        <NavButton icon={User} label="Profile" active={activePage === 'profile'} onClick={() => setActivePage('profile')} />
      </nav>
    </div>
  );
}

// --- Page Components ---

function HomePage({ user }: { user: UserData }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500/50">
            <img src={user.profilePhoto || "https://i.pravatar.cc/150"} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Hello, {user.username}</h2>
            <p className="text-xs text-gray-400">Welcome to AdCash Pro</p>
          </div>
        </div>
        <div className="w-10 h-10 glass flex items-center justify-center text-purple-400">
          <ShieldCheck size={20} />
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden glass p-6 space-y-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
        <p className="text-sm text-gray-400 font-medium">Main Balance</p>
        <div className="flex items-baseline gap-2">
          <h1 className="text-5xl font-black tracking-tight">${user.balance.toFixed(2)}</h1>
          <span className="text-purple-400 font-bold uppercase text-xs">USDT</span>
        </div>
        <div className="flex items-center gap-4 pt-4">
          <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Today's Ads</p>
            <p className="font-bold text-lg">{user.adsWatchedToday} / 20</p>
          </div>
          <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Earned</p>
            <p className="font-bold text-lg text-green-400">${(user.totalAdsWatched * 0.05).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="glass p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="font-semibold">Current Ad Rate</p>
            <p className="text-xs text-gray-400">Earn up to $0.05 per video</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-500" />
      </div>

      {/* Security Tip */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex gap-4">
        <AlertCircle className="text-purple-400 shrink-0" size={24} />
        <p className="text-sm text-purple-300">Our Anti-Cheat is active. Multiple accounts or fake clicks lead to permanent ban.</p>
      </div>
    </motion.div>
  );
}

function EarnPage({ user, onReward }: { user: UserData; onReward: (balance: number, watched: number) => void }) {
  const [isWatching, setIsWatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const startAd = (type: 'rewarded' | 'smartlink') => {
    if (user.adsWatchedToday >= 20) {
      WebApp.showAlert('Daily limit reached! Come back tomorrow.');
      return;
    }

    setIsWatching(true);
    setTimeLeft(10);
    
    // Simulate Ad Watching Logic
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Call API after simulation
    setTimeout(async () => {
      try {
        const result = await apiService.claimReward(user.userId, type);
        onReward(result.balance, result.adsWatchedToday);
        WebApp.HapticFeedback.notificationOccurred('success');
        WebApp.showAlert(`Rewarded! You earned $${type === 'rewarded' ? '0.05' : '0.02'}`);
      } catch (err: any) {
        WebApp.showAlert(err.response?.data?.error || 'Claim failed.');
      } finally {
        setIsWatching(false);
      }
    }, 10000);

    // In production, you would call AdsGram or Monetag SDK here
    if (type === 'smartlink') {
       window.open('https://your-monetag-link.com', '_blank');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">Earn Rewards</h1>
        <p className="text-gray-400">Complete tasks and watch ads to earn USDT.</p>
      </div>

      <div className="space-y-4">
        {/* Ad Type 1: High Reward */}
        <div className="glass p-6 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 bg-purple-500 text-[10px] font-bold uppercase rounded-bl-xl">High Reward</div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <PlayCircle size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Watch Video Ad</h3>
              <p className="text-sm text-gray-400">Get $0.05 after 10s</p>
            </div>
          </div>
          <button 
            disabled={isWatching}
            onClick={() => startAd('rewarded')} 
            className="w-full py-4 neon-button rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
          >
            {isWatching ? `Watching... (${timeLeft}s)` : 'Watch Video Now'}
          </button>
        </div>

        {/* Ad Type 2: Smartlink */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
              <ExternalLink size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Smartlink Visit</h3>
              <p className="text-sm text-gray-400">Get $0.02 per visit</p>
            </div>
          </div>
          <button 
            disabled={isWatching}
            onClick={() => startAd('smartlink')} 
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isWatching ? 'Processing...' : 'Open Smartlink'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Daily Limit</span>
          <span className="text-gray-400">{user.adsWatchedToday} / 20 Ads</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-red-600 transition-all duration-500" 
            style={{ width: `${(user.adsWatchedToday / 20) * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function ReferralPage({ user }: { user: UserData }) {
  const [stats, setStats] = useState<{ count: number; earnings: number; list: any[] } | null>(null);
  const referralLink = `https://t.me/AdCashProBot?start=${user.userId}`;

  useEffect(() => {
    apiService.getReferralStats(user.userId).then(setStats);
  }, [user.userId]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    WebApp.showAlert('Referral link copied!');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">Refer & Earn</h1>
        <p className="text-gray-400">Invite friends and get $0.20 for each active friend.</p>
      </div>

      <div className="glass p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mx-auto">
          <Users size={40} />
        </div>
        <div>
          <h2 className="text-3xl font-black">${stats?.earnings.toFixed(2) || '0.00'}</h2>
          <p className="text-sm text-gray-400">Total Referral Earnings</p>
        </div>
        <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
          <input readOnly value={referralLink} className="flex-1 bg-transparent text-xs text-purple-300 font-mono focus:outline-none" />
          <button onClick={copyLink} className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
            <CreditCard size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Friends</p>
          <p className="text-2xl font-bold">{stats?.count || 0}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Active Friends</p>
          <p className="text-2xl font-bold">{stats?.list.filter(u => u.qualified).length || 0}</p>
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <h3 className="font-bold">How it works</h3>
        <div className="space-y-2">
          <RuleItem number="1" text="Share link with your friends" />
          <RuleItem number="2" text="Friend watches at least 10 ads" />
          <RuleItem number="3" text="You get $0.20 instant reward" />
        </div>
      </div>
    </motion.div>
  );
}

function WithdrawPage({ user, onWithdraw }: { user: UserData; onWithdraw: (bal: number) => void }) {
  const [amount, setAmount] = useState('2');
  const [method, setMethod] = useState('bkash');
  const [number, setNumber] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiService.getWithdrawalHistory(user.userId).then(setHistory);
  }, [user.userId]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (val < 2) return WebApp.showAlert('Minimum withdrawal is $2');
    if (val > user.balance) return WebApp.showAlert('Insufficient balance');
    if (!number) return WebApp.showAlert('Please enter your account number');

    try {
      setSubmitting(true);
      const res = await apiService.submitWithdrawal(user.userId, val, method, number);
      onWithdraw(res.balance);
      setAmount('2');
      setNumber('');
      const newHistory = await apiService.getWithdrawalHistory(user.userId);
      setHistory(newHistory);
      WebApp.showAlert('Success! Your request is being reviewed.');
    } catch (err: any) {
      WebApp.showAlert(err.response?.data?.error || 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">Withdraw Funds</h1>
        <p className="text-gray-400">Transfer your earnings to your wallet or bank.</p>
      </div>

      <form onSubmit={handleWithdraw} className="glass p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500">Amount (USD)</label>
          <div className="flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/10">
            <DollarSign size={20} className="text-purple-400" />
            <input 
              type="number" 
              step="0.1" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              className="bg-transparent w-full text-xl font-bold focus:outline-none" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500">Method</label>
          <div className="grid grid-cols-3 gap-2">
            {['bkash', 'nagad', 'usdt'].map(m => (
              <button 
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`py-3 rounded-xl text-xs font-bold uppercase transition-all ${method === m ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 border border-white/5'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-gray-500">Account Number / Address</label>
          <input 
            type="text" 
            placeholder="e.g. 017XXXXXXXX or TRX..."
            value={number}
            onChange={e => setNumber(e.target.value)}
            className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 focus:border-purple-500/50 focus:outline-none transition-colors"
          />
        </div>

        <button 
          disabled={submitting}
          className="w-full py-4 neon-button rounded-2xl font-bold text-lg disabled:opacity-50"
        >
          {submitting ? 'Processing...' : 'Submit Request'}
        </button>
      </form>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Clock size={18} /> Withdrawal History
        </h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm glass">No history yet</p>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="glass p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm uppercase">{item.method} Payment</p>
                  <p className="text-[10px] text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black">${item.amount}</p>
                  <p className={`text-[10px] font-bold uppercase ${item.status === 'approved' ? 'text-green-500' : 'text-yellow-500'}`}>{item.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProfilePage({ user }: { user: UserData }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-4 pt-10">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.3)]">
            <img src={user.profilePhoto || "https://i.pravatar.cc/150"} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-black rounded-full" />
        </div>
        <div>
          <h1 className="text-2xl font-black">{user.username}</h1>
          <p className="text-gray-400 font-mono text-sm">ID: {user.userId}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Ads" value={user.totalAdsWatched.toString()} />
        <StatCard label="Days Active" value={Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)).toString()} />
      </div>

      <div className="space-y-2">
        <ProfileMenuItem icon={LogOut} label="Log Out" color="text-red-400" onClick={() => WebApp.close()} />
      </div>
    </motion.div>
  );
}

// --- Reusable UI Elements ---

function NavButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${active ? 'text-purple-500' : 'text-gray-500'}`}>
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-purple-500/10' : ''}`}>
        <Icon size={24} className={active ? 'fill-current' : ''} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function RuleItem({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-black">{number}</div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

function ProfileMenuItem({ icon: Icon, label, color = "text-white", onClick }: { icon: any; label: string; color?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full glass p-4 flex items-center justify-between group active:scale-95 transition-all">
      <div className="flex items-center gap-4">
        <Icon size={20} className={color} />
        <span className={`font-semibold ${color}`}>{label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-600" />
    </button>
  );
}
