import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { admin, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  });

  if (admin) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async ({ email, password, remember }) => {
    setError(null);
    try {
      await signIn(email, password, remember);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <div className="mx-auto grid min-h-screen max-w-[1100px] items-center gap-[70px] p-[50px] max-[700px]:grid-cols-1 md:grid-cols-2">
      <div>
        <span className="eyebrow">Little Legacy</span>
        <h1 className="mt-5 text-[42px] leading-[1.2] max-[700px]:text-[30px]">
          A little care.
          <br />A lasting difference.
        </h1>
        <p className="mt-4 leading-[1.7] text-muted">Your team’s space to support every family.</p>
      </div>

      <form onSubmit={onSubmit} className="rounded-[14px] border border-line bg-white p-10 shadow-[0_15px_50px_#1e293b0a]">
        <span className="eyebrow">Admin panel</span>
        <h2 className="my-[15px] text-3xl">Welcome back</h2>
        <div className="mt-6 grid gap-4">
          <TextField label="Email" type="email" autoComplete="username" error={formState.errors.email?.message} {...register('email')} />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-body">
            <input type="checkbox" className="h-4 w-4 accent-primary" {...register('remember')} />
            Remember me
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full py-3.5" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Signing in…' : 'Sign in →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
