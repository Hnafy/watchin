import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/LanguageProvider';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Play, Film, Tv, Sparkles } from 'lucide-react';

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
type Form = z.infer<typeof schema>;

const features = [
  { icon: Film, text: 'auth.featureSync' },
  { icon: Tv, text: 'auth.featureTrending' },
  { icon: Sparkles, text: 'auth.featureAI' },
];

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 -right-40 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute -bottom-48 -left-40 h-[520px] w-[520px] rounded-full bg-primary-600/10 blur-[140px]" />
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl lg:grid-cols-[1fr_1.05fr]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative order-2 p-8 sm:p-10 lg:order-1 lg:p-12"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">Watchin</span>
          </div>

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

          <p className="mt-8 text-center text-sm text-dark-400">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
              {t('auth.signIn')}
            </Link>
          </p>
        </motion.div>

        {/* Brand panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative order-1 hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-primary-950/80 p-10 lg:order-2 lg:flex"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-500/10 blur-[90px]" />

          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_8px_30px_rgba(124,58,237,0.45)]">
              <Play className="h-5 w-5 fill-white text-white" />
            </div>
            <h1 className="mt-8 font-display text-4xl font-bold leading-tight tracking-tight text-white">
              {t('auth.heroStory')}
              <br />
              <span className="bg-gradient-to-r from-sky-400 to-primary-400 bg-clip-text text-transparent">{t('auth.heroStarts')}</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-dark-400">
              {t('auth.heroOneAccount')}
            </p>
          </div>

          <ul className="relative space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-dark-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <Icon className="h-4 w-4 text-primary-400" />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
