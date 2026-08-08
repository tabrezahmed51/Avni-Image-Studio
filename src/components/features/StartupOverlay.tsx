import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Volume2, VolumeX, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StartupOverlayProps {
  onClose: () => void;
}

export default function StartupOverlay({ onClose }: StartupOverlayProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('Connecting to Supabase...');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Progress bar simulation
  useEffect(() => {
    const intervals = [
      { progress: 25, label: 'Initializing AI Engine...', delay: 600 },
      { progress: 55, label: 'Loading Gemini Modalities...', delay: 1100 },
      { progress: 85, label: 'Synchronizing Studio Workspace...', delay: 1800 },
      { progress: 100, label: 'Ready to Create!', delay: 2400 },
    ];

    let timer: NodeJS.Timeout;
    
    // Smooth frame progress increment
    const startProgress = () => {
      const startTime = Date.now();
      const duration = 2800; // 2.8 seconds total startup simulation

      const update = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        
        // Custom easing curve
        const progress = Math.round(ratio * 100);
        setLoadingProgress(progress);

        if (progress < 25) {
          setLoadingPhase('Connecting to Supabase...');
        } else if (progress < 55) {
          setLoadingPhase('Initializing AI Engine...');
        } else if (progress < 85) {
          setLoadingPhase('Loading Gemini Modalities...');
        } else if (progress < 100) {
          setLoadingPhase('Synchronizing Studio Workspace...');
        } else {
          setLoadingPhase('Ready to Create!');
          setIsLoaded(true);
          return;
        }

        if (ratio < 1) {
          requestAnimationFrame(update);
        }
      };
      
      requestAnimationFrame(update);
    };

    timer = setTimeout(startProgress, 300);

    return () => clearTimeout(timer);
  }, []);

  // 2. Play video when component mounts
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setVideoStarted(true))
        .catch((err) => {
          console.warn('[StartupOverlay] Autoplay blocked, playing muted fallback:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setVideoStarted(true));
          }
        });
    }
  }, []);

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleEnter = () => {
    // Save that user has seen startup video in sessionStorage for this session
    sessionStorage.setItem('hasSeenStartupVideo', 'true');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col justify-between items-center py-12 px-6 overflow-hidden select-none"
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/make_this_image_alive_cinemat.mp4"
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] transition-all"
        style={{ transform: 'scale(1.05)', transitionDuration: '2s' }}
      />

      {/* Cinematic Vignette / Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-5xl flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 studio-gradient rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-wider text-foreground">AVNI</span>
        </motion.div>

        {/* Mute controls */}
        {videoStarted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            onClick={handleToggleMute}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-all text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Central Glass Card */}
      <div className="relative z-10 max-w-lg w-full flex flex-col items-center justify-center my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="w-full backdrop-blur-xl bg-black/45 border border-white/10 rounded-2xl p-8 text-center shadow-2xl flex flex-col items-center justify-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-primary/30"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="font-display text-3xl sm:text-4xl font-black leading-none mb-2 tracking-tight text-white"
          >
            Avni Image Studio
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xs sm:text-sm text-studio-gold italic font-display mb-8"
          >
            "Imagination is next reality"
          </motion.p>

          <div className="w-full h-12 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isLoaded ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full space-y-2.5"
                >
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                    <span className="animate-pulse">{loadingPhase}</span>
                    <span>{loadingProgress}%</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="loaded-cta"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-full flex justify-center"
                >
                  <Button
                    onClick={handleEnter}
                    className="studio-gradient text-white border-0 text-xs px-8 py-4 h-auto rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-violet-500/20"
                  >
                    Enter Studio
                    <ArrowRight className="w-4 h-4 ml-1.5 animate-bounce-x" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Credits */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        {!isLoaded && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            whileHover={{ opacity: 0.9 }}
            onClick={handleEnter}
            className="text-[10px] text-white uppercase tracking-widest hover:underline cursor-pointer"
          >
            Skip Intro & Enter
          </motion.button>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-[9px] text-white/50 tracking-widest uppercase"
        >
          Powered by Gemini & Supabase · Cinematic Audio Active
        </motion.p>
      </div>
    </motion.div>
  );
}
