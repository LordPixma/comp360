import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="text-2xl font-bold">Comp360</div>
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Complete compliance management for modern teams
          </h1>
          <p className="text-slate-300">
            Streamline your compliance journey with an intelligent, automated platform.
          </p>
        </div>
        <div className="text-sm text-slate-400">
          © {new Date().getFullYear()} Comp360 Inc.
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white">
        <Card className="w-full max-w-md border-none shadow-none lg:border lg:shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}