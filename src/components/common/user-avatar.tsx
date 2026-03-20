import { getInitials } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

interface UserAvatarProps {
  name: string;
  avatarColor?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({
  name,
  avatarColor,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initials = getInitials(name);
  const color = avatarColor || "#4A6741";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZES[size]} ${className}`}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
