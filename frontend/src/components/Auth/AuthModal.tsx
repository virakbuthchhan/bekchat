import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Zap,
  Shield,
  Bot,
  Globe,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
      navigate('/w/general');
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Authentication failed. Please check your credentials.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* LEFT SIDE: Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-slate-900/90 border-r border-slate-800/80 overflow-y-auto relative">
        {/* Background Subtle Mesh */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Bek-Chat</span>
              <span className="ml-2 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Center Form */}
        <div className="relative z-10 my-auto max-w-md w-full mx-auto space-y-6 pt-6 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back 👋' : 'Create an Account 🚀'}
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              {mode === 'login'
                ? 'Sign in to access your workspaces, channels, and real-time team chats.'
                : 'Join Bek-Chat today to start collaborating with real-time channels & bot APIs.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <Link
              to="/login"
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </Link>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-ping" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="alex_dev"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alex@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Processing...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-500 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} Bek-Chat Platform</span>
          <span>Self-Hosted & Privacy Focused</span>
        </div>
      </div>

      {/* RIGHT SIDE: Greeting & Feature Showcase Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-16 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

        {/* Top Showcase Header */}
        <div className="relative z-10">
          <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full uppercase tracking-wider">
            Real-Time Collaboration Platform
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-tight mt-6 leading-tight">
            Connect Teams, Bots & Workhooks in One Place.
          </h2>
          <p className="text-base text-slate-300 mt-4 leading-relaxed max-w-lg">
            Bek-Chat combines Slack-style team messaging with Telegram Bot API flexibility and full web browser push notifications.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-auto py-8">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Real-Time Messaging</h3>
            <p className="text-xs text-slate-400">WebSocket & Redis pub/sub layer for instantaneous channel chats & DMs.</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Incoming & Outgoing Bots</h3>
            <p className="text-xs text-slate-400">Slack webhooks & Telegram-style Bot API for automated integrations.</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Multi-Language & i18n</h3>
            <p className="text-xs text-slate-400">Native English & Khmer support with crowdsourced key proposals & voting.</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Self-Hostable Docker</h3>
            <p className="text-xs text-slate-400">Full PostgreSQL + Redis container stack ready for one-command deployment.</p>
          </div>
        </div>

        {/* Bottom Testimonial / Trust Badge */}
        <div className="relative z-10 p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-indigo-200">
            OpenAPI 3.0 documented REST API with Swagger UI served at <span className="font-mono text-white">/api/docs</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
