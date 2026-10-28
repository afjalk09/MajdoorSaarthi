import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError } from '@/lib/toast';
import { Mail, Lock, Phone, ArrowRight, Eye, EyeOff, User, Briefcase } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, phone, password, role);
      navigate('/dashboard');
    } catch (err) {
      showError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=1200&fit=crop"
          alt="Electrician at work"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-warm-900/90 via-warm-900/70 to-warm-900/50" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-white max-w-md"
          >
            <h2 className="font-display text-3xl font-bold mb-4">
              Start Earning with Your Skills
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-6">
              Create your free profile and get matched with employers looking for your exact skillset. No middleman, no fees.
            </p>
            <div className="space-y-3">
              {['Free digital profile', 'AI-powered job matching', 'Direct employer contact'].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-saffron-500/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-saffron-400" />
                  </div>
                  <span className="text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-warm-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-lg bg-saffron-600 flex items-center justify-center">
              <span className="font-display text-xl font-extrabold text-white">M</span>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-warm-900">Majdoorsaarthi</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Create your account</h1>
            <p className="text-warm-500">Join our community of skilled workers and employers</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                role === 'worker'
                  ? 'border-saffron-500 bg-saffron-50 shadow-md'
                  : 'border-warm-200 bg-white hover:border-warm-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                role === 'worker' ? 'bg-saffron-500 text-white' : 'bg-warm-100 text-warm-500'
              }`}>
                <User size={20} />
              </div>
              <p className={`font-display font-semibold ${role === 'worker' ? 'text-saffron-700' : 'text-warm-700'}`}>
                Find Work
              </p>
              <p className="text-xs text-warm-500 mt-1">I&apos;m a skilled worker</p>
              {role === 'worker' && (
                <motion.div
                  layoutId="role-indicator"
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-saffron-500 flex items-center justify-center"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                role === 'employer'
                  ? 'border-earth-500 bg-earth-50 shadow-md'
                  : 'border-warm-200 bg-white hover:border-warm-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                role === 'employer' ? 'bg-earth-500 text-white' : 'bg-warm-100 text-warm-500'
              }`}>
                <Briefcase size={20} />
              </div>
              <p className={`font-display font-semibold ${role === 'employer' ? 'text-earth-700' : 'text-warm-700'}`}>
                Hire Workers
              </p>
              <p className="text-xs text-warm-500 mt-1">I need to hire</p>
              {role === 'employer' && (
                <motion.div
                  layoutId="role-indicator"
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-earth-500 flex items-center justify-center"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-warm-700 font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white border-warm-200 focus:border-saffron-500 focus:ring-saffron-500/20 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-warm-700 font-medium">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-white border-warm-200 focus:border-saffron-500 focus:ring-saffron-500/20 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-warm-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white border-warm-200 focus:border-saffron-500 focus:ring-saffron-500/20 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-warm-700 font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-white border-warm-200 focus:border-saffron-500 focus:ring-saffron-500/20 h-12"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight size={18} />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-warm-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-saffron-600 hover:text-saffron-700 font-semibold">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
