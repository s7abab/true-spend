/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /**
   * Public site origin for SEO (canonical, Open Graph, sitemap). No trailing slash.
   * Example production: https://app.example.com — set in CI for correct previews.
   * Local: http://localhost:5173
   */
  readonly VITE_PUBLIC_SITE_URL?: string;
  /** Shown on About / legal pages (mailto). Optional; defaults in app if unset. */
  readonly VITE_PUBLIC_CONTACT_EMAIL?: string;
  /**
   * Which LLM backend powers /chat. `openrouter` | `gemini`.
   * If unset, OpenRouter is used when `VITE_OPENROUTER_API_KEY` is set, else Gemini when `VITE_GEMINI_API_KEY` is set.
   */
  readonly VITE_AI_PROVIDER?: string;
  /** OpenRouter API key (https://openrouter.ai/). */
  readonly VITE_OPENROUTER_API_KEY?: string;
  /** OpenRouter model slug (default: google/gemini-2.0-flash-001). Use :free slugs for $0 (see openrouter.ai/models?q=free). */
  readonly VITE_OPENROUTER_MODEL?: string;
  /** Google AI Studio API key when using Gemini (direct or via VITE_AI_PROVIDER=gemini). */
  readonly VITE_GEMINI_API_KEY?: string;
  /** Optional override for direct Gemini model id (default gemini-2.5-flash). */
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
