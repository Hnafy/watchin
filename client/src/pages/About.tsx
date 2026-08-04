import { motion } from 'framer-motion';
import { Play, Film, Tv, Globe, Shield, Sparkles } from 'lucide-react';

const features = [
  { icon: Film, title: 'Extensive Library', desc: 'Thousands of movies, TV shows, and anime titles spanning every genre and era.' },
  { icon: Tv, title: 'Multi-Device Streaming', desc: 'Seamless playback across desktop, tablet, and mobile devices with sync progress.' },
  { icon: Shield, title: 'High Quality', desc: 'Crystal-clear HD and 4K streams with adaptive bitrate for smooth viewing.' },
  { icon: Globe, title: 'Global Content', desc: 'Curated international catalog with multi-language support and regional favorites.' },
  { icon: Sparkles, title: 'Personalized Picks', desc: 'Smart recommendations powered by your watch history and ratings.' },
  { icon: Play, title: 'Watch Together', desc: 'Create watchlists, track progress, and never lose your place.' },
];

export function About() {
  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/15 mb-6">
            <Play className="h-8 w-8 text-primary-400 fill-primary-400 ml-0.5" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            About Watch In
          </h1>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto leading-relaxed">
            Your ultimate destination for streaming entertainment. We bring together movies,
            TV series, and anime in one beautifully crafted platform.
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-2xl bg-dark-900/70 border border-white/[0.04] p-6 hover:border-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-600/15 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-dark-300 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-primary-600/10 to-dark-900/70 border border-primary-600/20 p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            Built for Entertainment Lovers
          </h2>
          <p className="text-dark-300 max-w-xl mx-auto mb-8 leading-relaxed">
            We believe great content deserves a great experience. From intelligent search
            to personalized watchlists, every detail is designed to help you discover and
            enjoy your next favorite show.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { value: '10K+', label: 'Titles' },
              { value: '50+', label: 'Genres' },
              { value: '1080p/4K', label: 'Quality' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-primary-400 mb-1">{stat.value}</p>
                <p className="text-sm text-dark-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
