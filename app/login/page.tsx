import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto pt-8">
      <h1 className="text-2xl font-bold text-center mb-6">Welcome back</h1>
      <LoginForm />
    </div>
  );
}
