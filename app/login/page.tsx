import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto pt-12 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-wide">Welcome back</h1>
        <p className="text-gray-500 text-sm mt-2">Sign in to continue your streak</p>
      </div>
      <div className="glass rounded-2xl p-6">
        <LoginForm />
      </div>
    </div>
  );
}
