import { SignupForm } from '@/components/SignupForm';

export default function SignupPage() {
  return (
    <div className="max-w-sm mx-auto pt-12 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-wide">Join Wordel</h1>
        <p className="text-gray-500 text-sm mt-2">Create an account to track your stats</p>
      </div>
      <div className="glass rounded-2xl p-6">
        <SignupForm />
      </div>
    </div>
  );
}
