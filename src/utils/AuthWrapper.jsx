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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    attempts,
    lastAttempt: Date.now(),
    lockedUntil
  }));
}

function clearAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

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
      const timer = setTimeout(() => setCooldown(c => {
        const next = c - 1;
        if (next === 0) setIsLocked(false);
        return next;
      }), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        clearAttempts(); // Reset attempts on successful login
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
        const { data, error } = await supabase
          .from("users")
          .select("status")
          .eq("id", currentUser.id)
          .maybeSingle();

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
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${currentUser.id}` },
            (payload) => {
              if (payload.new?.status) setUserStatus(payload.new.status);
            }
          ).subscribe();
      } catch (err) {
        console.error("Erro no AuthWrapper:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSubscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const handleSignOut = async () => {
    setLoading(true);
    clearAttempts(); // Reset attempts on intentional logout
    await supabase.auth.signOut();
  };

  const handleLogin = async () => {
    if (isLocked) return;
    
    const { attempts } = getStoredAttempts();
    
    try {
      await supabase.auth.signInWithOAuth({ 
        provider: "google", 
        options: { redirectTo: window.location.origin } 
      });
      // On successful redirect, attempts will be cleared by the auth state change
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

  const LayoutCentered = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black p-4 font-sans text-zinc-100">
      {children}
    </div>
  );

  if (loading) {
    return (
      <LayoutCentered>
        <div className="relative flex justify-center items-center h-16 w-16">
          <div className="absolute inset-0 rounded-full border-t-2 border-lime-400 animate-spin"></div>
          <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
        </div>
      </LayoutCentered>
    );
  }

  if (!currentUser) {
    return (
      <LayoutCentered>
        <div className="flex flex-col p-8 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl max-w-sm w-full relative">
          <div className="mb-10 relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
            <p className="text-zinc-400 text-sm">Faça login para continuar.</p>
          </div>
          <button onClick={handleLogin} disabled={isLocked} className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl transition-all cursor-pointer">
            {isLocked ? `Aguarde ${cooldown}s` : "Continuar com Google"}
          </button>
        </div>
      </LayoutCentered>
    );
  }

  // USUÁRIO APROVADO: Retorna apenas o que estiver dentro da tag AuthGuard no layout principal
  if (userStatus === "approved") {
    return children;
  }

  return (
    <LayoutCentered>
      <StatusCard user={currentUser} status={userStatus} handleSignOut={handleSignOut} />
    </LayoutCentered>
  );
}

function StatusCard({ user, status, handleSignOut }) {
  const isRejected = status === "rejected";
  const safeEmail = user?.email || "";
  const initial = safeEmail ? safeEmail.charAt(0).toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name || (safeEmail ? safeEmail.split("@")[0] : "Usuário");

  return (
    <div className="flex flex-col p-8 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl max-w-md w-full shadow-2xl relative">
      <div className={`absolute top-0 left-0 w-full h-1 ${isRejected ? "bg-red-500" : "bg-amber-400"}`}></div>
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{isRejected ? "Acesso Recusado" : "Aprovação Pendente"}</h2>
          <p className={`text-sm font-medium ${isRejected ? "text-red-400" : "text-amber-400"}`}>Status: {status}</p>
        </div>
      </div>
      <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
        {isRejected ? "Conta sem permissão. Contate o suporte." : "Conta registrada. Aguarde a liberação da administração."}
      </p>
      <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">{initial}</div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-zinc-100 truncate">{displayName}</span>
          <span className="text-xs text-zinc-500 truncate">{safeEmail}</span>
        </div>
      </div>
      <button onClick={handleSignOut} className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer">
        Trocar de Conta / Sair
      </button>
    </div>
  );
}