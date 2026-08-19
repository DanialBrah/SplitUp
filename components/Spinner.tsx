type SpinnerProps = {
  className?: string;
};

export function Spinner({ className = "h-5 w-5" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 ${className}`}
    />
  );
}
