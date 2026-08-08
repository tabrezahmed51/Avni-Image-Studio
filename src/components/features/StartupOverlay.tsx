import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Volume2, VolumeX } from 'lucide-react';
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
    let timer: NodeJS.Timeout;
    
    const startProgress = () => {
      const startTime = Date.now();
      const duration = 2800; // 2.8 seconds total startup simulation

      const update = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        
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
    sessionStorage.setItem('hasSeenStartupVideo', 'true');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col justify-between items-center py-6 px-6 overflow-hidden select-none"
    >
      {/* Background Video - High Quality, No Blur, No Filter */}
      <video
        ref={videoRef}
        src="/make_this_image_alive_cinemat.mp4"
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-all"
        style={{ transitionDuration: '2s' }}
      />

      {/* Top Header - Controls overlaying the video */}
      <div className="relative z-10 w-full max-w-5xl flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2.5 bg-black/40 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
        >
          <div className="w-5.5 h-5.5 studio-gradient rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-3 h-3 text-white animate-pulse" />
          </div>
          <span className="font-display font-extrabold text-sm tracking-wider text-white">AVNI</span>
        </motion.div>

        {/* Mute controls */}
        {videoStarted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            onClick={handleToggleMute}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-all text-white backdrop-blur-sm"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Bottom Bar - Floating Glass Dashboard Card */}
      <div className="relative z-10 w-full max-w-5xl mt-auto pb-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full backdrop-blur-md bg-black/60 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          {/* Left Side: Branding / Loading Info */}
          <div className="flex-1 w-full min-w-0 text-left">
            <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
              <Sparkles className="w-4 h-4 text-primary animate-pulse shrink-0" />
              <h1 className="font-display text-lg font-bold tracking-tight text-white truncate">
                Avni Image Studio
              </h1>
              <span className="text-[10px] text-studio-gold italic font-display opacity-80 shrink-0">
                "Imagination is next reality"
              </span>
            </div>
            
            <div className="text-xs text-white/70 min-h-[18px]">
              {!isLoaded ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                  <span className="animate-pulse">{loadingPhase}</span>
                </div>
              ) : (
                <p>Branding environment initialized. Click Enter Studio to launch the workspace.</p>
              )}
            </div>
          </div>

          {/* Center: Progress Slider (if loading) */}
          {!isLoaded ? (
            <div className="w-full md:max-w-xs flex flex-col gap-1.5 shrink-0">
              <div className="flex justify-between items-center text-[9px] text-white/50 font-mono tracking-wider">
                <span>STARTING WORKSPACE</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* Right Side: Action Controls */}
          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-end">
            <AnimatePresence mode="wait">
              {!isLoaded ? (
                <motion.button
                  key="skip"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={handleEnter}
                  className="text-xs text-white/70 hover:text-white transition-colors uppercase tracking-widest cursor-pointer px-3 py-1.5 font-medium"
                >
                  Skip & Enter
                </motion.button>
              ) : (
                <motion.div
                  key="enter-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <Button
                    onClick={handleEnter}
                    className="studio-gradient text-white border-0 text-xs px-6 py-3 h-auto rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-violet-500/20"
                  >
                    Enter Studio
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 animate-bounce-x" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Floating copyright labels */}
        <div className="flex justify-between items-center px-4 mt-3 text-[9px] text-white/40 tracking-widest uppercase select-none">
          <span>Powered by Gemini & Supabase</span>
          <span>© 2026 AVNI</span>
        </div>
      </div>
    </motion.div>
  );
}
