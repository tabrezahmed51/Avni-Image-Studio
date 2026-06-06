import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import HomePage from '@/pages/HomePage';

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'hsl(240, 12%, 8%)',
            color: 'hsl(280, 20%, 96%)',
            border: '1px solid hsl(240, 10%, 16%)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
