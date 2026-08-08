# Avni Image Studio

Avni Image Studio is a state-of-the-art Web Application designed for creative image generation and editing. Powered by Google Gemini AI, Ollama, and Supabase backend services, it offers a fast, fluid, and premium creative workflow.

## Features

- **Text to Image Generation**: Transform rich descriptive prompts into detailed visuals.
- **Image Editing & Inpainting**: Upload an image and request target modifications using natural language prompts.
- **Inspire Me**: Instantly autocomplete and enhance prompts with themes and dynamic presets.
- **AI Chat Assistant (Avni)**: An agentic chat interface that helps you write prompts, automatically configures control parameters, and guides your studio usage.
- **Community Gallery**: A public gallery displaying featured generations with metadata, filters, and bulk ZIP download.
- **Personal Sidebar History**: Search, filter, and sort through all of your past generations.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, PKCE OAuth flows)
- **AI Engine**: Gemini API & Ollama (local LLM/LMM instances)
- **Deployment**: Vercel production hosting

## Local Setup

### Prerequisites

- Node.js (v20 or higher)
- npm or bun

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tabrezahmed51/Avni-Image-Studio.git
   cd Avni-Image-Studio
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Production Deployment

This project is configured for deployment to **Vercel** with full Single Page Application (SPA) routing support:
```bash
# Production deploy via Vercel CLI
npx vercel --prod
```
The application routing rules are handled via the `vercel.json` rewrites configuration.
