const sizeMap = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-lg',
  '2xl': 'h-16 w-16 text-2xl',
};

const imgSizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
  '2xl': 'h-16 w-16',
};

export default function UserAvatar({
  user,
  name,
  photoPath,
  size = 'lg',
  className = '',
  gradient = 'from-primary-400 to-primary-600',
  textColor = 'text-white',
}) {
  const photo = photoPath || user?.member?.photo_path || null;
  const displayName = name || user?.name || '?';
  const initial = displayName.charAt(0)?.toUpperCase() || '?';
  const sizeClass = sizeMap[size] || sizeMap.lg;
  const imgSize = imgSizeMap[size] || imgSizeMap.lg;

  if (photo) {
    return (
      <img
        src={`/storage/${photo}`}
        alt={displayName}
        className={`${imgSize} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 ${className}`}>
      <span className={`font-semibold ${textColor}`}>{initial}</span>
    </div>
  );
}
