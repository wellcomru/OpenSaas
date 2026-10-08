import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

/** Как кабинет, но без отступов и на всю высоту: чату нужен весь экран. */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-[100dvh] bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-h-0 flex-1">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
