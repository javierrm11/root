import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-8 px-6 pb-16">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent font-mono text-lg font-bold text-ink">&gt;_</span>
        <div>
          <p className="font-mono text-2xl font-bold tracking-tight">root</p>
          <p className="text-sm text-muted">Tu vida, organizada.</p>
        </div>
      </div>
      <LoginForm />
    </main>
  );
}
