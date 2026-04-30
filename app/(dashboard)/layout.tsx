import { Navbar } from "@/components/navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div className="relative flex flex-col h-dvh overflow-hidden">
        <Navbar />
        <main className="container mx-auto max-w-7xl pt-4 md:pt-6 px-4 md:px-6 flex-grow flex flex-col overflow-y-auto pb-6">
          {children}
        </main>
      </div>
    </section>
  );
}