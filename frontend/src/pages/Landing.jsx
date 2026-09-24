import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ScrollReveal from '@/components/ScrollReveal';
import AnimatedCounter from '@/components/AnimatedCounter';
import {
  Users, Briefcase, Brain, MapPin, Star, Shield,
  ArrowRight, CheckCircle, Search, Handshake, Zap,
  Wrench, Paintbrush, Plug, Droplets, Hammer,
  Settings
} from 'lucide-react';

const services = [
  { name: 'Masonry', hindi: 'मिस्त्री', icon: Hammer, image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop', color: 'from-orange-500 to-red-500' },
  { name: 'Plumbing', hindi: 'प्लम्बर', icon: Droplets, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop', color: 'from-blue-500 to-cyan-500' },
  { name: 'Electrical', hindi: 'बिजली', icon: Plug, image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop', color: 'from-yellow-500 to-amber-500' },
  { name: 'Painting', hindi: 'पेंटिंग', icon: Paintbrush, image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop', color: 'from-purple-500 to-pink-500' },
  { name: 'Carpentry', hindi: 'बढ़ई', icon: Wrench, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', color: 'from-emerald-500 to-teal-500' },
  { name: 'Welding', hindi: 'वेल्डिंग', icon: Settings, image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop', color: 'from-slate-500 to-gray-600' },
];

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Matching',
    description: 'Our intelligent algorithm matches workers to jobs based on skills, experience, location, and reliability scores.',
    gradient: 'from-saffron-500 to-gold-400',
  },
  {
    icon: Shield,
    title: 'Verified Workers',
    description: 'Every worker is verified through document checks. Hire with confidence knowing you get skilled, trusted professionals.',
    gradient: 'from-earth-500 to-earth-600',
  },
  {
    icon: MapPin,
    title: 'Location-Based',
    description: 'Find workers near you. Our GPS-powered system connects you with the best talent in your area.',
    gradient: 'from-saffron-500 to-saffron-600',
  },
];

const steps = [
  {
    number: '01',
    title: 'Register',
    description: 'Create your free profile with skills, experience, and location. Takes less than 2 minutes.',
    icon: Users,
  },
  {
    number: '02',
    title: 'Match',
    description: 'Our AI matches the right workers to your job based on skills, proximity, and availability.',
    icon: Search,
  },
  {
    number: '03',
    title: 'Hire & Work',
    description: 'Connect directly, agree on terms, and get the job done. No middleman, no hidden fees.',
    icon: Handshake,
  },
];

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Mason · 8 years experience',
    quote: 'Labour Chowk changed my life. I used to wait at tea stalls for work. Now families find me directly and I have regular income.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
  {
    name: 'Sunita Devi',
    role: 'House Cleaner · 5 years experience',
    quote: 'I got 3 new families in the first week itself. The AI matching is amazing — it connects me with jobs that fit my skills perfectly.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    role: 'Employer · Home Renovation',
    quote: 'Finding reliable workers used to be a nightmare. Labour Chowk gave me verified, skilled workers within minutes. Highly recommended!',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-warm-50/90 backdrop-blur-lg border-b border-warm-100">
        <div className="section-container mx-auto py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center shadow-md">
              <span className="text-white font-display font-bold text-lg">L</span>
            </div>
            <span className="font-display font-bold text-xl text-warm-900">
              Labour Chowk
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-warm-700 hover:text-saffron-600 hover:bg-saffron-50">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white">
                Register
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden gradient-hero hero-pattern">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-saffron-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-earth-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-gold-400/10 rounded-full blur-2xl" />

        <div className="section-container py-20 lg:py-28 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-saffron-50 border border-saffron-200/50 text-saffron-600 text-sm font-medium mb-6">
                <Zap size={14} />
                AI-Powered Labour Platform
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-warm-900 leading-tight mb-6">
                Connecting Skilled{' '}
                <span className="text-gradient-saffron">Workers</span>
                {' '}with{' '}
                <span className="text-gradient-earth">Employers</span>
              </h1>

              <p className="text-lg text-warm-600 leading-relaxed mb-8 max-w-lg">
                Find the right workers for your projects in minutes. AI-powered matching, verified professionals, zero middleman.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link to="/register">
                  <Button size="lg" className="bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white shadow-lg hover:shadow-xl transition-all px-8 py-6 text-base">
                    Find Workers
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="outline" className="border-warm-300 text-warm-700 hover:bg-warm-100 px-8 py-6 text-base">
                    Register as Worker
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 sm:gap-12">
                <div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-warm-900">
                    <AnimatedCounter target={500} suffix="+" />
                  </div>
                  <p className="text-sm text-warm-500">Workers</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-warm-900">
                    <AnimatedCounter target={200} suffix="+" />
                  </div>
                  <p className="text-sm text-warm-500">Employers</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-warm-900">
                    <AnimatedCounter target={1000} suffix="+" />
                  </div>
                  <p className="text-sm text-warm-500">Jobs Done</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Worker Image Collage */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full h-[500px]">
                {/* Main image */}
                <div className="absolute top-0 right-0 w-64 h-80 rounded-2xl overflow-hidden shadow-2xl z-10">
                  <img
                    src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=500&fit=crop"
                    alt="Mason at work"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-display font-semibold">Skilled Masons</p>
                    <p className="text-xs opacity-80">Verified & Ready</p>
                  </div>
                </div>

                {/* Secondary image */}
                <div className="absolute bottom-0 left-0 w-56 h-64 rounded-2xl overflow-hidden shadow-xl z-20">
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop"
                    alt="Electrician at work"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-display font-semibold">Expert Electricians</p>
                    <p className="text-xs opacity-80">Trusted Professionals</p>
                  </div>
                </div>

                {/* Floating badge */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  <div className="bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-warm-900 text-sm">AI Matched</p>
                      <p className="text-xs text-warm-500">Perfect worker found!</p>
                    </div>
                  </div>
                </motion.div>

                {/* Third image */}
                <div className="absolute top-8 left-8 w-44 h-52 rounded-2xl overflow-hidden shadow-lg z-0">
                  <img
                    src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&h=350&fit=crop"
                    alt="Plumber at work"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="font-display font-semibold text-sm">Plumbers</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-earth-50 text-earth-600 text-sm font-medium mb-4">
                Why Labour Chowk
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 mb-4">
                Built for Trust & Efficiency
              </h2>
              <p className="text-warm-500 max-w-2xl mx-auto text-lg">
                We combine technology with community to create the most reliable platform for finding skilled workers.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <ScrollReveal key={i} delay={i * 0.15}>
                <div className="group relative p-8 rounded-2xl bg-warm-50 border border-warm-200/50 hover:border-saffron-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="text-white" size={24} />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-warm-900 mb-3">{feature.title}</h3>
                  <p className="text-warm-500 leading-relaxed">{feature.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 gradient-warm">
        <div className="section-container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-saffron-50 text-saffron-600 text-sm font-medium mb-4">
                Simple Process
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 mb-4">
                How Labour Chowk Works
              </h2>
              <p className="text-warm-500 max-w-2xl mx-auto text-lg">
                Three simple steps to find the perfect worker — no complexity, no hidden charges.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-saffron-300 via-earth-300 to-saffron-300 opacity-50" />

            {steps.map((step, i) => (
              <ScrollReveal key={i} delay={i * 0.2}>
                <div className="relative text-center">
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <step.icon className="text-white" size={28} />
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-saffron-100 text-saffron-600 text-xs font-bold mb-3">
                    STEP {step.number}
                  </div>
                  <h3 className="font-display font-semibold text-xl text-warm-900 mb-3">{step.title}</h3>
                  <p className="text-warm-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section id="services" className="py-20 lg:py-28 bg-white">
        <div className="section-container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-earth-50 text-earth-600 text-sm font-medium mb-4">
                Service Categories
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 mb-4">
                Find Workers for Every Need
              </h2>
              <p className="text-warm-500 max-w-2xl mx-auto text-lg">
                Browse skilled workers across a range of services — from construction to home maintenance.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {services.map((service, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <Link to="/register">
                  <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <service.icon className="text-white/80" size={18} />
                        <span className="text-white/80 text-xs font-medium">{service.hindi}</span>
                      </div>
                      <h3 className="font-display font-semibold text-white text-lg">{service.name}</h3>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <ArrowRight className="text-white" size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-warm-900 via-warm-800 to-earth-700 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern opacity-10" />
        <div className="section-container relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { label: 'Workers Registered', value: 500, suffix: '+', icon: Users },
              { label: 'Employers Connected', value: 200, suffix: '+', icon: Briefcase },
              { label: 'Jobs Completed', value: 1000, suffix: '+', icon: CheckCircle },
              { label: 'Areas Covered', value: 25, suffix: '+', icon: MapPin },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="text-saffron-400" size={24} />
                  </div>
                  <div className="text-3xl lg:text-4xl font-display font-bold text-white mb-1">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-warm-300 text-sm">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 gradient-warm">
        <div className="section-container">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-saffron-50 text-saffron-600 text-sm font-medium mb-4">
                Success Stories
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-warm-900 mb-4">
                Voices From Our Community
              </h2>
              <p className="text-warm-500 max-w-2xl mx-auto text-lg">
                Real stories from workers and employers who found success through Labour Chowk.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 0.15}>
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-warm-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={16} className="fill-gold-400 text-gold-400" />
                    ))}
                  </div>
                  <p className="text-warm-600 leading-relaxed mb-6 flex-1 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-warm-100">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-display font-semibold text-warm-900 text-sm">{t.name}</p>
                      <p className="text-warm-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-saffron-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-earth-500/5 rounded-full blur-3xl" />

        <div className="section-container relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-900 mb-6">
                Get Recognition for Your{' '}
                <span className="text-gradient-saffron">Skills</span>
              </h2>
              <p className="text-lg text-warm-500 mb-8 max-w-xl mx-auto">
                Join hundreds of workers who have found steady work and built their reputation through Labour Chowk.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Link to="/register">
                  <Button size="lg" className="bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white shadow-lg hover:shadow-xl transition-all px-8 py-6 text-base">
                    Get Started Free
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-warm-500">
                {['Free Digital Profile', 'Showcase Your Work', 'Get Found Instantly', 'Zero Commission'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-earth-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default Landing;
