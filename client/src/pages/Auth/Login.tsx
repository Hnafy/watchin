import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/LanguageProvider';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AuthShell } from '../../components/auth/AuthShell';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

function GoogleSignInButton({ onCredential, errorMessage }: { onCredential: (idToken: string) => Promise<void>; errorMessage: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !ref.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (res) => {
          try {
            await onCredential(res.credential);
          } catch (e: any) {
            toast.error(e.response?.data?.message || errorMessage);
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current!, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 320,
        text: 'continue_with',
      });
    };

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = initGoogle;
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, [onCredential, errorMessage]);

  return <div ref={ref} className="flex justify-center" />;
}

export function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { login, isLoggingIn, googleLogin, isGoogleLoggingIn } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: Form) => {
    try {
      await login(data);
      toast.success(t('auth.welcomeBackToast'));
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('auth.invalidCredentials'));
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    await googleLogin(idToken);
    toast.success(t('auth.welcomeBackToast'));
    navigate('/');
  };

  return (
    <AuthShell
      footer={
        <p className="text-sm text-dark-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
            {t('auth.createOne')}
          </Link>
        </p>
      }
    >
      <h2 className="font-display text-3xl font-bold tracking-tight text-white">{t('auth.welcomeBack')}</h2>
      <p className="mt-2 text-sm text-dark-400">{t('auth.signInSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <Input {...register('email')} type="email" label={t('auth.email')} placeholder={t('auth.enterEmail')} error={errors.email?.message} />
        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label={t('auth.password')}
            placeholder={t('auth.passPlaceholder')}
            error={errors.password?.message}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-dark-400 transition-colors hover:text-dark-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="submit" size="lg" shine className="mt-2 w-full" loading={isLoggingIn}>
          {t('auth.signIn')}
        </Button>
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-wider text-dark-400">{t('auth.orContinueWith')}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          {isGoogleLoggingIn ? (
            <div className="flex justify-center text-sm text-dark-400">...</div>
          ) : (
            <GoogleSignInButton onCredential={handleGoogleCredential} errorMessage={t('auth.googleSignInFailed')} />
          )}
        </>
      )}
    </AuthShell>
  );
}
