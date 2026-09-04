export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`animate-spin ${sizes[size]} border-4 border-brand-500 border-t-transparent rounded-full`} />
    </div>
  );
}
