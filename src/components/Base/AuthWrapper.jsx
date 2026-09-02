import React, { useEffect, useState } from "react";
import { auth, db } from "@/components/firebase-config";
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function AuthGuard({ children }) {
	const [currentUser, setCurrentUser] = useState(null);
	const [userStatus, setUserStatus] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let unsubscribeSnapshot = null;

		const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUser(user);
				setLoading(true);

				const userRef = doc(db, "users", user.uid);

				unsubscribeSnapshot = onSnapshot(
					userRef,
					async (docSnap) => {
						if (docSnap.exists()) {
							setUserStatus(docSnap.data().status || "pending");
						} else {
							// Criação de novo usuário com a chave 'role'
							await setDoc(userRef, {
								email: user.email,
								displayName: user.displayName || user.email?.split("@")[0] || "Usuário",
								status: "pending",
								role: "user", // <-- Chave adicionada aqui
								createdAt: new Date().toISOString(),
							});
							setUserStatus("pending");
						}
						setLoading(false);
					},
					(error) => {
						console.error("Erro ao consultar Firestore:", error);
						setUserStatus("pending");
						setLoading(false);
					},
				);
			} else {
				setCurrentUser(null);
				setUserStatus(null);
				if (unsubscribeSnapshot) unsubscribeSnapshot();
				setLoading(false);
			}
		});

		return () => {
			unsubscribeAuth();
			if (unsubscribeSnapshot) unsubscribeSnapshot();
		};
	}, []);

	const handleSignOut = async () => {
		try {
			setLoading(true);
			await signOut(auth);
		} catch (error) {
			console.error("Erro ao encerrar sessão:", error);
			setLoading(false);
		}
	};

	const handleLogin = async () => {
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
		} catch (error) {
			console.error("Erro no login:", error);
		}
	};

	// 1. Tela de Carregamento (Spinner com tom lime-400)
	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#09090b]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
			</div>
		);
	}

	// 2. Tela de Login Inicial (Visual Dark + Lime 400 + UX de Impacto)
	if (!currentUser) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 font-sans text-zinc-100">
				<div className="relative flex flex-col items-center p-10 bg-[#121214] rounded-3xl border border-zinc-800/80 shadow-2xl max-w-sm w-full text-center overflow-hidden">
					{/* Efeitos de Iluminação (Glow) */}
					<div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />
					<div className="absolute -top-24 opacity-20 blur-[60px] w-48 h-48 bg-lime-400 rounded-full" />

					{/* Ícone Moderno */}
					<div className="relative w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 mb-6 shadow-[0_0_20px_-5px_rgba(163,230,53,0.2)]">
						<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
						</svg>
					</div>

					<h2 className="text-2xl font-extrabold tracking-tight text-white mb-2 relative z-10">Acesso ao Sistema</h2>
					<p className="text-zinc-400 text-sm mb-8 relative z-10">Faça login para acessar o painel administrativo.</p>

					{/* Botão de Impacto com Lime-400 */}
					<button onClick={handleLogin} className="relative z-10 w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold rounded-xl transition-all hover:shadow-[0_0_25px_-5px_rgba(163,230,53,0.5)] active:scale-[0.98] cursor-pointer">
						<div className="bg-white p-1 rounded-full flex items-center justify-center">
							<img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
						</div>
						Entrar com Google
					</button>
				</div>
			</div>
		);
	}

	// 3. Status 'approved' -> Acesso Liberado
	if (userStatus === "approved") {
		return <>{React.cloneElement(children, { handleSignOut, currentUser })}</>;
	}

	// 4. Status 'pending' ou 'rejected' -> Card de Bloqueio
	return (
		<div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 font-sans">
			<StatusCard user={currentUser} status={userStatus} handleSignOut={handleSignOut} />
		</div>
	);
}

/* --- COMPONENTE VISUAL DO CARD DE STATUS (SOMENTE INICIAL DO EMAIL) --- */
function StatusCard({ user, status, handleSignOut }) {
	const isRejected = status === "rejected";

	const safeEmail = user?.email || "";
	const initial = safeEmail ? safeEmail.charAt(0).toUpperCase() : "U";
	const displayName = user?.displayName || (safeEmail ? safeEmail.split("@")[0] : "Usuário");

	const config = isRejected
		? {
				badgeBg: "bg-red-500/10 text-red-500 border-red-500/20",
				badgeDot: "bg-red-500",
				badgeText: "Acesso Recusado",
				iconBg: "bg-red-500/10 border-red-500/20 text-red-500",
				avatarBg: "bg-red-500/20 border-red-500/40 text-red-500",
				title: "Solicitação Rejeitada",
				message: (
					<>
						Sua conta (<strong className="text-zinc-200 font-semibold">{safeEmail}</strong>) não foi aprovada. Entre em contato com um administrador.
					</>
				),
				icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
			}
		: {
				badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
				badgeDot: "bg-amber-500 animate-pulse",
				badgeText: "Aguardando Aprovação",
				iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
				avatarBg: "bg-amber-500/20 border-amber-500/40 text-amber-500",
				title: "Solicitação Pendente",
				message: (
					<>
						Sua conta (<strong className="text-zinc-200 font-semibold">{safeEmail}</strong>) foi registrada. Solicite a liberação do seu acesso a um administrador.
					</>
				),
				icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
			};

	return (
		<div className="flex flex-col items-center text-center p-8 bg-[#121214] rounded-3xl border border-zinc-800 max-w-md w-full shadow-2xl">
			<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border mb-8 ${config.badgeBg}`}>
				<span className={`w-1.5 h-1.5 rounded-full ${config.badgeDot}`} />
				{config.badgeText}
			</span>

			<div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-6 ${config.iconBg}`}>
				<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					{config.icon}
				</svg>
			</div>

			<h2 className="text-2xl font-extrabold text-white mb-3">{config.title}</h2>
			<p className="text-sm text-zinc-400 mb-8 leading-relaxed px-4">{config.message}</p>

			{/* Box do Usuário com Letra Inicial */}
			<div className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4 mb-8 text-left">
				<div className={`w-11 h-11 rounded-full border flex items-center justify-center font-bold text-lg shrink-0 ${config.avatarBg}`}>{initial}</div>
				<div className="flex flex-col min-w-0">
					<span className="text-sm font-bold text-zinc-100 truncate">{displayName}</span>
					<span className="text-xs text-zinc-500 truncate">{safeEmail}</span>
				</div>
			</div>

			<button onClick={handleSignOut} type="button" className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm rounded-xl transition-all border border-zinc-700/50 active:scale-[0.98] cursor-pointer">
				Sair ou trocar de conta
			</button>
		</div>
	);
}
