import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 60;
const STORAGE_KEY = "loginAttempts";

function getStoredAttempts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { attempts: 0, lastAttempt: 0, lockedUntil: 0 };
    return JSON.parse(data);
  } catch {
    return { attempts: 0, lastAttempt: 0, lockedUntil: 0 };
  }
}

function saveAttempts(attempts, lockedUntil = 0) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      attempts,
      lastAttempt: Date.now(),
      lockedUntil,
    }),
  );
}

function clearAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

const ACCENT = "#afd136";

const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-6">
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#a3e635"
          strokeWidth="3"
          strokeDasharray="283"
          strokeDashoffset="0"
          strokeLinecap="butt"
          style={{
            animation: "stroke-spin 1s linear infinite",
            transformOrigin: "center",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 animate-pulse rounded-[0.5rem]" style={{ backgroundColor: ACCENT }} />
      </div>
    </div>
    <p className="text-zinc-500 text-sm font-black tracking-widest uppercase">Carregando</p>
    <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div className="w-full h-full animate-pulse" style={{ background: `linear-gradient(to right, ${ACCENT}, #c5e05a, ${ACCENT})`, animationDuration: "1.5s" }} />
    </div>
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes stroke-spin {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 283; }
        }
      `
    }} />
  </div>
);

const LoginCard = ({ onLogin, isLocked, cooldown }) => {
  return (
    <div className="relative w-full max-w-md flex flex-col items-center">
      <div className="relative w-full bg-zinc-950/95 backdrop-blur-xl border-2 border-[#afd136] p-10 overflow-hidden">
        <div className="relative z-10 w-full">
          <div className="flex items-center justify-evenly mb-6 gap-5">
            <img src="/assets/logo.svg" alt="Logo da Chevromais" className="w-25 h-auto" />
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase transform skew-x-[-3deg]">
              PneusCuritiba Dashboard
            </h1>
          </div>
          <p className="text-zinc-400 text-center leading-relaxed tracking-widest transform skew-x-[-2deg]">
            Faça login para acessar o dashboard
          </p>
        </div>

        <button
          onClick={onLogin}
          disabled={isLocked}
          className={`group relative z-10 w-full flex items-center my-6 cursor-pointer justify-center gap-3 py-4 px-6 font-black text-base transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#afd136] focus:ring-offset-2 focus:ring-offset-zinc-950 transform skew-x-[-4deg] overflow-hidden ${isLocked
            ? "bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-700"
            : "bg-transparent border border-[#afd136] text-[#afd136] hover:text-zinc-950"
            }`}
        >
          {!isLocked && (
            <div className="absolute inset-0 bg-[#afd136] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
          )}

          <div className="relative z-10 flex-shrink-0 transform skew-x-[4deg]">
            <svg className="w-5 h-5 flex-shrink-0 relative" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <span className="relative z-10 tracking-widest transform skew-x-[4deg]">
            {isLocked ? `Aguarde ${cooldown}s` : "Continuar com Google"}
          </span>
        </button>
      </div>
    </div>
  );
};

const StatusCard = ({ user, status, handleSignOut }) => {
  const isRejected = status === "rejected";
  const safeEmail = user?.email || "";
  const initial = safeEmail ? safeEmail.charAt(0).toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name || (safeEmail ? safeEmail.split("@")[0] : "Usuário");

  const accentBg = isRejected ? "bg-red-500" : `bg-[${ACCENT}]`;
  const accentBorder = isRejected ? "border-red-500" : `border-[${ACCENT}]`;

  return (
    <div className="relative w-full max-w-md flex flex-col items-center">
      <div className={`relative w-full bg-zinc-950/95 backdrop-blur-xl border ${accentBorder} p-10 overflow-hidden rounded-sm`}>
        <div className="relative z-10">
          <div className={`flex items-center gap-3 mb-6 p-4 transform skew-x-[-8deg] ${accentBg}/10 border ${accentBorder}/40`}>
            <div className={`w-10 h-10 flex items-center justify-center ${accentBg}/20 transform skew-x-[8deg]`}>
              {isRejected ? (
                <svg className="w-5 h-5 text-red-400 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="miter" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 text-[${ACCENT}] relative`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="miter" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div className="transform skew-x-[8deg]">
              <h2 className="text-xl font-black text-white tracking-tighter uppercase transform skew-x-[-3deg]">
                {isRejected ? "Acesso Recusado" : "Aprovação Pendente"}
              </h2>
              <p className={`text-sm font-medium ${isRejected ? "text-red-400" : `text-[${ACCENT}]`} transform skew-x-[-2deg]`}>
                Status: {status}
              </p>
            </div>
          </div>

          <p className="text-zinc-400 text-sm mb-8 leading-relaxed tracking-wide transform skew-x-[-2deg]">
            {isRejected
              ? "Sua conta não possui permissão de acesso. Entre em contato com o suporte para mais informações."
              : "Sua conta foi registrada com sucesso. Aguarde a liberação da administração para acessar o sistema."}
          </p>

          <div className="w-full bg-zinc-900/50 border border-zinc-800/50 p-4 flex items-center gap-4 mb-8 transform skew-x-[-4deg]">
            <div className="w-10 h-10 bg-zinc-800/50 flex items-center justify-center font-black text-white text-lg border border-zinc-700 transform skew-x-[4deg]">
              {initial}
            </div>
            <div className="flex flex-col min-w-0 transform skew-x-[4deg]">
              <span className="text-base font-black text-zinc-100 truncate transform skew-x-[-4deg]">{displayName}</span>
              <span className="text-sm text-zinc-500 truncate transform skew-x-[-4deg]">{safeEmail}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="group relative w-full py-4 px-6 bg-transparent text-zinc-400 font-black text-sm transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#afd136] focus:ring-offset-2 focus:ring-offset-zinc-950 border border-zinc-700 hover:text-white transform skew-x-[-4deg] overflow-hidden"
          >
            <div className="absolute inset-0 bg-zinc-800 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
            <span className="relative z-10 transform skew-x-[4deg] tracking-widest block">Trocar de Conta / Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AuthWrapper({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const { attempts, lockedUntil } = getStoredAttempts();
    const now = Date.now();

    if (lockedUntil > now) {
      const remaining = Math.ceil((lockedUntil - now) / 1000);
      setCooldown(remaining);
      setIsLocked(true);
    } else if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = now + COOLDOWN_SECONDS * 1000;
      saveAttempts(attempts, lockUntil);
      setCooldown(COOLDOWN_SECONDS);
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(
        () =>
          setCooldown((c) => {
            const next = c - 1;
            if (next === 0) setIsLocked(false);
            return next;
          }),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        clearAttempts();
      } else {
        setCurrentUser(null);
        setUserStatus(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    let channel = null;

    const fetchAndSubscribe = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("users").select("status").eq("id", currentUser.id).maybeSingle();

        if (error) throw error;

        if (!data) {
          const { data: newUser } = await supabase
            .from("users")
            .insert({
              id: currentUser.id,
              email: currentUser.email,
              display_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Usuário",
              status: "pending",
              role: "user",
            })
            .select("status")
            .single();

          setUserStatus(newUser?.status || "pending");
        } else {
          setUserStatus(data.status);
        }

        channel = supabase
          .channel(`user-status-${currentUser.id}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${currentUser.id}` }, (payload) => {
            if (payload.new?.status) setUserStatus(payload.new.status);
          })
          .subscribe();
      } catch (err) {
        console.error("Erro no AuthWrapper:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSubscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleSignOut = async () => {
    setLoading(true);
    clearAttempts();
    await supabase.auth.signOut();
  };

  const handleLogin = async () => {
    if (isLocked) return;

    const { attempts } = getStoredAttempts();

    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.error("Login error:", err);
      const newAttempts = attempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + COOLDOWN_SECONDS * 1000;
        saveAttempts(newAttempts, lockUntil);
        setCooldown(COOLDOWN_SECONDS);
        setIsLocked(true);
      } else {
        saveAttempts(newAttempts);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-zinc-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative bg-zinc-950">
        <LoginCard onLogin={handleLogin} isLocked={isLocked} cooldown={cooldown} />
      </div>
    );
  }

  if (userStatus === "approved") {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-zinc-950">
      <StatusCard user={currentUser} status={userStatus} handleSignOut={handleSignOut} />
    </div>
  );
}