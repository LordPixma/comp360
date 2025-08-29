import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  await requireRole('global_admin')

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Global Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage companies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Send messages to all users</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
