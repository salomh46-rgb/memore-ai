export default function Footer() {
  return (
    <footer className="border-t border-glass-border mt-20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-2xl font-bold tracking-tight">
          Me'mor<span className="text-accent">AI</span>
        </div>
        
        <div className="flex gap-4">
          <button className="text-sm font-medium hover:text-accent transition-colors">UZ</button>
          <span className="text-gray-600">|</span>
          <button className="text-sm font-medium text-gray-500 hover:text-accent transition-colors">RU</button>
          <span className="text-gray-600">|</span>
          <button className="text-sm font-medium text-gray-500 hover:text-accent transition-colors">EN</button>
        </div>

        <div className="text-sm text-gray-500">
          &copy; 2026 Me'morAI. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </footer>
  );
}
