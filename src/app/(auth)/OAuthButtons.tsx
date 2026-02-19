"use client";

import { createClient } from "../utils/supabase/client"; // Use Client version!
import { Github } from "lucide-react";

export function OAuthButtons() {
  const supabase = createClient();

  const handleLogin = async (provider: "github" | "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Redirect to our callback route from Step 1
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* GitHub Button */}
      <button
        onClick={() => handleLogin("github")}
        className="w-full flex items-center justify-center gap-3 bg-[#24292F] text-white font-medium py-2.5 rounded-lg hover:bg-[#24292F]/90 transition-all shadow-sm"
      >
        <Github size={20} />
        <span>Continue with GitHub</span>
      </button>

      {/* Google Button */}
      <button
        onClick={() => handleLogin("google")}
        className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
      >
        {/* Google Icon SVG */}
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">Or continue with</span>
        </div>
      </div>
    </div>
  );
}
