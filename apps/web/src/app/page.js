import Link from 'next/link';
export default function Home() {
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Stay Audit-Ready with LCT
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Lightweight compliance management for startups and SMBs
          </p>
          <div className="space-x-4">
            <Link href="/auth/login" className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Get Started
            </Link>
            <Link href="/features" className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold border-2 border-primary hover:bg-gray-50 transition">
              Learn More
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">SOC 2 Ready</h3>
            <p className="text-gray-600">
              Get SOC 2 compliant with our curated control set and automated evidence collection
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Automated Evidence</h3>
            <p className="text-gray-600">
              Connect your cloud providers and SaaS tools for continuous compliance monitoring
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Audit-Grade Security</h3>
            <p className="text-gray-600">
              Immutable audit logs, encrypted evidence, and role-based access control
            </p>
          </div>
        </div>
      </div>
    </div>);
}
