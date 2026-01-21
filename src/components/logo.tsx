import { useLanguage } from "@/lib/language-context";

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo matching footer design */}
      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
        <svg 
          viewBox="0 0 24 24" 
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18 2 4 4" />
          <path d="m17 6 4 4" />
          <path d="m3 11 18-5" />
          <path d="m3 11 6 4" />
          <path d="m3 11 6-4" />
        </svg>
      </div>
      
      {/* Restaurant Name */}
      <div className="flex flex-col">
        <span className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          Tirvan Kahvila
        </span>
      </div>
    </div>
  );
}