export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden p-6">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50/20 pointer-events-none" />

      {/* Floating Accent Elements */}
      <div className="absolute top-20 right-10 w-48 h-48 bg-indigo-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-indigo-100/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md z-10">{children}</div>
    </div>
  );
}
