import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Bell,
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Club Management',
      description: 'Create and manage university clubs with customizable roles and member hierarchies.',
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: 'Event Organization',
      description: 'Schedule workshops, meetings, competitions, and track registrations with capacity limits.',
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: 'Budget Tracking',
      description: 'Monitor club finances with income/expense tracking, approvals, and monthly summaries.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Analytics & Reports',
      description: 'Generate detailed reports on attendance, budgets, and membership with CSV export.',
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Notifications',
      description: 'Send announcements to members and event participants with real-time delivery.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Role-Based Access',
      description: 'Secure access control for Administrators, Club Managers, and Members.',
    },
  ];

  const roles = [
    {
      name: 'Administrator',
      description: 'Full system access. Manage all clubs, users, and approve budgets.',
      color: 'from-purple-500 to-indigo-600',
      duties: ['Manage all clubs', 'Approve budgets', 'User management', 'System settings'],
    },
    {
      name: 'Club Manager',
      description: 'Manage club operations, events, members, and finances.',
      color: 'from-blue-500 to-cyan-600',
      duties: ['Create/manage events', 'Approve memberships', 'Track attendance', 'Manage budgets'],
    },
    {
      name: 'Club Member',
      description: 'Join clubs, register for events, and receive notifications.',
      color: 'from-green-500 to-emerald-600',
      duties: ['Join clubs', 'Event registration', 'View attendance', 'Receive notifications'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">COSC Club Event Management</h1>
                <p className="text-white/60 text-xs">University Club Management System</p>
              </div>
            </div>
            <Link to="/signup">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Create Account
              </Button>
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - App Info */}
            <div className="space-y-10">
              {/* Hero Section */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/90 text-sm">Software Engineering Project</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  Manage Your University Clubs
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    All in One Place
                  </span>
                </h2>
                <p className="text-xl text-white/70 max-w-xl">
                  A comprehensive platform for club management, event organization, membership tracking,
                  budget oversight, and member engagement.
                </p>
              </div>

              {/* Features Grid */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Key Features
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                          {feature.icon}
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">{feature.title}</h4>
                          <p className="text-white/60 text-xs mt-1">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles Section */}
              <div>
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Role-Based Access Control
                </h3>
                <div className="space-y-4">
                  {roles.map((role, index) => (
                    <div
                      key={index}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white font-bold`}
                        >
                          {role.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{role.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${role.color} text-white`}>
                              {index === 0 ? 'Full Access' : index === 1 ? 'Manage Clubs' : 'Participate'}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm mb-2">{role.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {role.duties.map((duty, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded"
                              >
                                {duty}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">Real-time</p>
                  <p className="text-white/60 text-xs">Notifications</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">Analytics</p>
                  <p className="text-white/60 text-xs">Reports & Export</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-purple-400 mb-1">
                    <Shield className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">Secure</p>
                  <p className="text-white/60 text-xs">Row-Level Security</p>
                </div>
              </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="lg:sticky lg:top-8">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
                  <p className="text-white/60">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-11 pr-4 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-11 pr-12 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    loading={loading}
                  >
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </Button>

                  <div className="text-center">
                    <p className="text-white/60 text-sm">
                      Don't have an account?{' '}
                      <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                        Create one
                      </Link>
                    </p>
                  </div>
                </form>

                {/* Demo Accounts Info */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-white/50 text-xs text-center mb-3">Demo accounts available for testing</p>
                  <div className="space-y-2 text-xs text-white/60">
                    <div className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                      <span>Admin:</span>
                      <code className="text-blue-300">admin@test.edu</code>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                      <span>Member:</span>
                      <code className="text-green-300">member@test.edu</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 backdrop-blur-sm mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center">
            <p className="text-white/50 text-sm">
              COSC Club Event Management System - Software Engineering Course Project
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
