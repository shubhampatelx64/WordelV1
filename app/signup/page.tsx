import { SignupForm } from '@/components/SignupForm';

export default function SignupPage() {
  return (
    <div className="max-w-sm mx-auto pt-8">
      <h1 className="text-2xl font-bold text-center mb-6">Create your account</h1>
      <SignupForm />
    </div>
  );
}
