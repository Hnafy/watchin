import { useState } from 'react';
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

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
type Form = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { register: registerUser, isRegistering } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: Form) => {
    try {
      await registerUser(data);
      toast.success(t('auth.accountCreatedToast'));
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('auth.registrationFailed'));
    }
  };

  return (
    <AuthShell
      footer={
        <p className="text-sm text-dark-400">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
            {t('auth.signIn')}
          </Link>
        </p>
      }
    >
      <h2 className="font-display text-3xl font-bold tracking-tight text-white">{t('auth.createAccount')}</h2>
      <p className="mt-2 text-sm text-dark-400">{t('auth.createSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <Input {...register('username')} label={t('auth.username')} placeholder={t('auth.enterUsername')} error={errors.username?.message} />
        <Input {...register('email')} type="email" label={t('auth.email')} placeholder={t('auth.enterEmail')} error={errors.email?.message} />
        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label={t('auth.password')}
            placeholder={t('auth.passMin')}
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
        <Button type="submit" size="lg" shine className="mt-2 w-full" loading={isRegistering}>
          {t('auth.createAccountBtn')}
        </Button>
      </form>
    </AuthShell>
  );
}
