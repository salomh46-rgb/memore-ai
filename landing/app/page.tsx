import TelegramWebAppInit from "@/components/TelegramWebAppInit";
import WorkspaceApp from "@/components/WorkspaceApp";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050B18]">
      <TelegramWebAppInit />
      <WorkspaceApp />
    </main>
  );
}
