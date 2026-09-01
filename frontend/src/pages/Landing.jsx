import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Labour Chowk</h1>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            AI-Powered Digital Labour Chowk
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connecting skilled workers with employers through intelligent matching.
            Find the right workers for your job in minutes.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle>For Workers</CardTitle>
              <CardDescription>
                Create your profile, showcase your skills, and get matched with jobs that fit your expertise and location.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <CardTitle>For Employers</CardTitle>
              <CardDescription>
                Post jobs, get AI-matched recommendations, and hire the best workers for your projects.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <CardTitle>AI Matching</CardTitle>
              <CardDescription>
                Our intelligent algorithm considers skills, experience, location, and wages to find the perfect match.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it Works */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-8">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
              <p className="font-medium">Register & Create Profile</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
              <p className="font-medium">Post or Apply for Jobs</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
              <p className="font-medium">AI Matches Workers</p>
            </div>
            <div className="p-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">4</div>
              <p className="font-medium">Hire & Complete Work</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/register">
            <Button size="lg" className="text-lg px-8">
              Get Started Now
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 AI-Powered Digital Labour Chowk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
