'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
      return res.json()
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">LCT Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-primary rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-10 h-10 text-primary" />
              <span className="text-3xl font-bold">72%</span>
            </div>
            <h3 className="text-gray-600 text-sm">Compliance Score</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-10 h-10 text-secondary" />
              <span className="text-3xl font-bold">85%</span>
            </div>
            <h3 className="text-gray-600 text-sm">Evidence Fresh</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-10 h-10 text-warning" />
              <span className="text-3xl font-bold">3</span>
            </div>
            <h3 className="text-gray-600 text-sm">Open Tasks</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-danger" />
              <span className="text-3xl font-bold">2</span>
            </div>
            <h3 className="text-gray-600 text-sm">Overdue Evidence</h3>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Control Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Pass', value: 24 },
                { name: 'Fail', value: 8 },
                { name: 'N/A', value: 3 },
                { name: 'Exception', value: 2 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0066FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Failing Controls</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div>
                  <p className="font-medium">CC6.3 - Logical Access</p>
                  <p className="text-sm text-gray-600">MFA not enabled for all users</p>
                </div>
                <button className="text-primary hover:underline text-sm">View</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div>
                  <p className="font-medium">CC7.2 - System Monitoring</p>
                  <p className="text-sm text-gray-600">CloudTrail not configured</p>
                </div>
                <button className="text-primary hover:underline text-sm">View</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}