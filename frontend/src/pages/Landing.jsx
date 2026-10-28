import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ScrollReveal from '@/components/ScrollReveal';
import AnimatedCounter from '@/components/AnimatedCounter';
import { SiteFooter } from '@/components/Layout';
import {
  Brain, Shield, MapPin, Star, Clock, Users, CheckCircle
} from 'lucide-react';

const services = [
  { name: 'Masonry', hindi: 'मिस्त्री', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop' },
  { name: 'Plumbing', hindi: 'प्लम्बर', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop' },
  { name: 'Electrical', hindi: 'बिजली', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop' },
  { name: 'Painting', hindi: 'पेंटिंग', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop' },
  { name: 'Carpentry', hindi: 'बढ़ई', image: 'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?w=400&h=300&fit=crop' },
  { name: 'Welding', hindi: 'वेल्डिंग', image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop' },
];

const boardJobs = [
  { role: 'Mason (Mistri)', wage: '₹850', posted: '2h ago', area: 'Andheri East', spots: '4 workers needed', match: '94%', tilt: -0.8 },
  { role: 'Electrician', wage: '₹1,200', posted: '5h ago', area: 'Powai', spots: '2 workers needed', match: '91%', tilt: 0.6 },
  { role: 'Carpenter', wage: '₹1,000', posted: '1d ago', area: 'Thane West', spots: '1 worker needed', match: '88%', tilt: -0.4 },
];

const features = [
  {
    icon: Brain,
    title: 'Ranked by AI, explained',
    description:
      'Workers are ranked for each job by skill overlap, distance, reliability and wage fit — and every match shows its reasons.',
  },
  {
    icon: Shield,
    title: 'Verified before hired',
    description:
      'PAN and Aadhaar documents are checked before a worker or employer earns the verified badge. You see who you are dealing with.',
  },
  {
    icon: MapPin,
    title: 'Nearby work first',
    description:
      'Search starts with people close to your site, so travel time and daily cost stay low for everyone.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Create a free profile',
    description:
      'Workers list their trade, experience and area. Employers say what needs building or fixing.',
  },
  {
    number: '2',
    title: 'Get matched',
    description:
      'AI ranks nearby verified workers by skill, reliability and wage fit — for both sides of the job.',
  },
  {
    number: '3',
    title: 'Hire, track and pay',
    description:
      'Send or accept an offer, follow the work day by day, and settle payment in the app. No middleman.',
  },
];

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Mason · 8 years experience',
    quote:
      'I used to wait at tea stalls for work. Now families find me directly, and I have regular income every week.',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
  {
    name: 'Sunita Devi',
    role: 'House cleaner · 5 years experience',
    quote:
      'I got three new families in my first week. The matches are for jobs that actually fit the work I do.',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
  {
    name: 'Amit Patel',
    role: 'Employer · Home renovation',
    quote:
      'Finding reliable workers used to take days of phone calls. I had verified, skilled workers within minutes.',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    rating: 5,
  },
];

const MatchSlip = ({ job, index, reduce }) => (
  <motion.article
    initial={reduce ? false : { opacity: 0, y: 22 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, delay: 0.3 + index * 0.14, ease: [0.22, 1, 0.36, 1] }}
    style={{ rotate: reduce ? '0deg' : `${job.tilt}deg` }}
    className="relative bg-white rounded-md border border-warm-200 px-4 py-4 sm:px-5 shadow-[0_14px_24px_-18px_rgba(28,32,25,0.6)]"
  >
    <div className="pr-16">
      <h3 className="font-display font-semibold text-lg text-warm-900 leading-snug">{job.role}</h3>
      <p className="mt-1.5 font-display font-bold text-2xl text-saffron-700 leading-none">
        {job.wage}
        <span className="ml-1.5 text-sm font-sans font-medium text-warm-500">/ day</span>
      </p>
    </div>

    <div className="mt-3 flex flex-wrap gap-2 pr-10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-2.5 py-1 text-xs text-warm-600">
        <Clock size={12} className="text-warm-400" />
        {job.posted}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-2.5 py-1 text-xs text-warm-600">
        <MapPin size={12} className="text-warm-400" />
        {job.area}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-2.5 py-1 text-xs text-warm-600">
        <Users size={12} className="text-warm-400" />
        {job.spots}
      </span>
    </div>

    <div
      aria-hidden="true"
      className="absolute top-3 right-3 flex h-14 w-14 rotate-[-8deg] flex-col items-center justify-center rounded-full border-[2.5px] border-earth-500/60 bg-white/70"
    >
      <span className="font-display text-sm font-bold leading-none text-earth-700">{job.match}</span>
      <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-earth-600/80">match</span>
    </div>
  </motion.article>
);

const Landing = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-warm-50/90 backdrop-blur-lg border-b border-warm-200">
        <div className="section-container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-600">
              <span className="font-display text-lg font-extrabold text-white">M</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-warm-900">
              Majdoorsaarthi
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Create account</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — the match board */}
      <section className="relative overflow-hidden">
        <div className="section-container grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="font-display font-wide text-4xl font-extrabold leading-[1.05] tracking-tight text-warm-900 sm:text-5xl lg:text-[3.5rem]">
              Find work.
              <br />
              Find workers.
            </h1>

            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-warm-600">
              Majdoorsaarthi matches verified masons, electricians and carpenters with
              employers nearby — ranked by skill, distance and reliability. No middleman.
            </p>
            <p className="mt-3 text-warm-500">
              काम चाहिए? मज़दूर चाहिए? दोनों यहीं हैं।
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">Hire workers</Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Register as a worker
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex text-sm">
              {[
                { target: 500, suffix: '+', label: 'Workers' },
                { target: 200, suffix: '+', label: 'Employers' },
                { target: 1000, suffix: '+', label: 'Jobs done' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={
                    i < 2
                      ? 'mr-6 border-r border-warm-200 pr-6 sm:mr-8 sm:pr-8'
                      : ''
                  }
                >
                  <div className="font-display text-xl font-bold text-warm-900">
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div className="mt-0.5 text-warm-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Work board */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-2xl bg-warm-800 p-5 shadow-2xl sm:p-6"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-pattern opacity-20" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-warm-200">Today&rsquo;s matches</span>
                <span className="text-xs text-warm-400">Updated hourly</span>
              </div>
              <div className="space-y-4">
                {boardJobs.map((job, i) => (
                  <MatchSlip key={job.role} job={job} index={i} reduce={reduce} />
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-warm-400">
                Sample listings — sign in to see matches for your trade.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trades */}
      <section id="services" className="border-t border-warm-200 bg-white py-20 lg:py-24">
        <div className="section-container">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-warm-900 sm:text-4xl">
                Workers for every kind of job
              </h2>
              <p className="mt-3 text-warm-600 lg:text-lg">
                Masons, electricians, carpenters, plumbers, painters and welders —
                verified and rated by the people who hired them.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
            {services.map((service, i) => (
              <ScrollReveal key={service.name} delay={i * 0.06}>
                <Link
                  to="/register"
                  className="group block overflow-hidden rounded-lg border border-warm-200 bg-white transition-colors hover:border-saffron-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 border-t border-warm-200 px-4 py-3">
                    <span className="font-display font-semibold text-warm-900 transition-colors group-hover:text-saffron-700">
                      {service.name}
                    </span>
                    <span className="text-sm text-warm-500">{service.hindi}</span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — a real sequence */}
      <section className="border-t border-warm-200 bg-warm-100 py-20 lg:py-24">
        <div className="section-container">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-warm-900 sm:text-4xl">
                How it works
              </h2>
              <p className="mt-3 text-warm-600 lg:text-lg">
                Three steps — the same whether you are hiring or looking for work.
              </p>
            </div>
          </ScrollReveal>

          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((step, i) => (
              <ScrollReveal key={step.number} delay={i * 0.12}>
                <li className="border-t-2 border-warm-900 pt-5">
                  <span className="font-display text-4xl font-extrabold leading-none text-saffron-600">
                    {step.number}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-warm-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-warm-600">{step.description}</p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Why — ruled list, no card kit */}
      <section id="about" className="border-t border-warm-200 bg-white py-20 lg:py-24">
        <div className="section-container grid gap-10 lg:grid-cols-[0.85fr_1.4fr] lg:gap-16">
          <ScrollReveal>
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-warm-900 sm:text-4xl">
                Why employers and workers stay
              </h2>
              <p className="mt-4 max-w-[42ch] leading-relaxed text-warm-600">
                Daily-wage work runs on reputation. Everything here is built around
                who a person is, how reliable they are, and how fast the job closes.
              </p>
            </div>
          </ScrollReveal>

          <div>
            {features.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 0.1}>
                <div className="grid grid-cols-[auto_1fr] gap-4 border-t border-warm-200 py-6 last:border-b sm:gap-6">
                  <feature.icon size={22} className="mt-1 shrink-0 text-earth-600" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-warm-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 max-w-[62ch] leading-relaxed text-warm-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="relative overflow-hidden bg-earth-900 py-16 lg:py-20">
        <div aria-hidden="true" className="absolute inset-0 hero-pattern opacity-10" />
        <div className="section-container relative">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {[
              { label: 'Workers registered', value: 500, suffix: '+' },
              { label: 'Employers connected', value: 200, suffix: '+' },
              { label: 'Jobs completed', value: 1000, suffix: '+' },
              { label: 'Areas covered', value: 25, suffix: '+' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-t border-white/15 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:first:border-l-0 lg:first:pl-0"
              >
                <div className="font-display text-3xl font-bold text-warm-50 lg:text-4xl">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="mt-1 text-sm text-warm-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 lg:py-24">
        <div className="section-container">
          <ScrollReveal>
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-warm-900 sm:text-4xl">
                From workers and employers
              </h2>
              <p className="mt-3 text-warm-600 lg:text-lg">
                What people say once the job is done and the payment is settled.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-10 grid divide-y divide-warm-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {testimonials.map((t, i) => (
              <ScrollReveal
                key={t.name}
                delay={i * 0.1}
                className={`${i === 0 ? 'md:pr-8' : 'md:px-8'} h-full`}
              >
                <figure className="flex h-full flex-col py-6 md:py-0">
                  <div className="flex gap-1" aria-label={`${t.rating} out of 5 stars`}>
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={15} className="fill-gold-400 text-gold-400" />
                    ))}
                  </div>
                  <blockquote className="mt-4 leading-relaxed text-warm-700">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 pt-5">
                    <img
                      src={t.image}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div>
                      <div className="font-display text-sm font-semibold text-warm-900">
                        {t.name}
                      </div>
                      <div className="text-xs text-warm-500">{t.role}</div>
                    </div>
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-earth-800 py-20 lg:py-24">
        <div className="section-container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2 className="font-display font-wide text-3xl font-extrabold leading-tight tracking-tight text-warm-50 sm:text-4xl lg:text-5xl">
                Put your trade to work — or get the job done.
              </h2>
              <p className="mt-4 max-w-[52ch] text-warm-200 lg:text-lg">
                Free to join. Your profile goes live in minutes, and the first
                matches arrive the same day.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">Create a free account</Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-white/30 bg-transparent text-white hover:border-white/50 hover:bg-white/10 sm:w-auto"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-warm-200">
                {['Free profile', 'No commission', 'Verified badges', 'Direct contact'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-gold-300" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
