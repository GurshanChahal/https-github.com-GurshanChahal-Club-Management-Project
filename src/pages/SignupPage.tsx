import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Mail, Lock, User, Hash, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';

export function SignupPage() {
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.studentId || undefined
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    }
  };

  const benefits = [
    'Join university clubs and receive invites',
    'Register for events and workshops',
    'Track your attendance and participation',
    'Receive important notifications',
    'Build your club membership portfolio',
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
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">COSC Club Event Management</h1>
                <p className="text-white/60 text-xs">University Club Management System</p>
              </div>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Benefits */}
            <div className="space-y-8 text-center lg:text-left">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  Join the Community
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    Get Involved Today
                  </span>
                </h2>
                <p className="text-xl text-white/70">
                  Create your account to start joining clubs, registering for events, and building your university experience.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Why Create an Account?
                </h3>
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-white/80 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Info Cards */}
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">A</span>
                  </div>
                  <p className="text-white font-medium text-sm">Admin</p>
                  <p className="text-white/50 text-xs">Full System Access</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <p className="text-white font-medium text-sm">Manager</p>
                  <p className="text-white/50 text-xs">Club Operations</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">U</span>
                  </div>
                  <p className="text-white font-medium text-sm">Member</p>
                  <p className="text-white/50 text-xs">Participate</p>
                </div>
              </div>
            </div>

            {/* Right Column - Signup Form */}
            <div className="lg:sticky lg:top-8">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Create Your Account</h3>
                  <p className="text-white/60">Start your university club journey</p>
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
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-11 pr-4 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@university.edu"
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-11 pr-4 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">
                        Student ID <span className="text-white/40">(optional)</span>
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type="text"
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleChange}
                          placeholder="e.g., STU123456"
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
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Min. 6 characters"
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

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          required
                          className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-11 pr-4 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                    loading={loading}
                  >
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </Button>

                  <div className="text-center">
                    <p className="text-white/60 text-sm">
                      Already have an account?{' '}
                      <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
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
