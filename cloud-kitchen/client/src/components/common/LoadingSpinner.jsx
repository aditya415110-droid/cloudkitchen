export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

  return (
    <div className="flex items-center justify-center p-8">
      <div className={`relative ${sizes[size]}`}>
        {/* Static track, so the moving arc reads as progress rather than a flicker. */}
        <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
        <div className={`absolute inset-0 animate-spin rounded-full border-4 border-brand-500 border-t-transparent`} />
      </div>
    </div>
  );
}
