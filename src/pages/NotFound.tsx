import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center px-4">
      <div className="w-14 h-14 studio-gradient rounded-2xl flex items-center justify-center mb-6 glow-violet">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h1 className="font-display text-6xl font-black text-foreground mb-2">404</h1>
      <p className="text-muted-foreground text-base mb-6">This page doesn't exist in our reality</p>
      <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl studio-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity">
        ← Back to Studio
      </Link>
    </div>
  );
}
