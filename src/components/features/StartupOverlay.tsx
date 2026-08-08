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
      className="fixed inset-0 z-[9999] bg-background overflow-hidden select-none"
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
      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center">
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

      {/* Bottom Bar - Complete Bottom Flat Slim Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 right-0 w-full z-10 backdrop-blur-md bg-black/85 border-t border-white/10 py-3 px-6 flex flex-row items-center justify-between gap-4 select-none"
      >
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="w-4 h-4 text-primary animate-pulse shrink-0" />
          <span className="font-display text-sm font-bold text-white tracking-tight shrink-0">
            Avni Image Studio
          </span>
          <span className="text-[10px] text-studio-gold italic font-display hidden sm:inline shrink-0">
            "Imagination is next reality"
          </span>
          
          <span className="text-white/20 hidden md:inline">|</span>
          
          <div className="text-[10px] text-white/70 truncate hidden md:block">
            {!isLoaded ? (
              <span className="animate-pulse">{loadingPhase}</span>
            ) : (
              <span className="text-emerald-400 font-medium">Ready to Create</span>
            )}
          </div>
        </div>

        {/* Center/Progress: loading bar (only shown if loading) */}
        {!isLoaded ? (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[9px] text-white/50 font-mono tracking-wider">LOADING</span>
            <div className="w-20 sm:w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-white/50 font-mono w-8 text-right">{loadingProgress}%</span>
          </div>
        ) : null}

        {/* Right: Actions */}
        <div className="flex items-center gap-4 shrink-0 justify-end">
          <AnimatePresence mode="wait">
            {!isLoaded ? (
              <motion.button
                key="skip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                onClick={handleEnter}
                className="text-[10px] text-white/70 hover:text-white transition-colors uppercase tracking-widest font-semibold cursor-pointer py-1 px-2.5"
              >
                Skip
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
                  className="studio-gradient text-white border-0 text-xs px-4 h-8 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md shadow-violet-500/10 flex items-center gap-1"
                >
                  Enter Studio
                  <ArrowRight className="w-3 h-3 ml-0.5 animate-bounce-x" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
