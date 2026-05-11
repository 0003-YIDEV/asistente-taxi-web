import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
}

export function BentoCard({ children, className, title, icon }: BentoCardProps) {
  return (
    <div className={cn("bento-card flex flex-col gap-4", className)}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <div className="text-brand-primary">{icon}</div>}
          {title && <h3 className="text-sm font-semibold text-brand-secondary uppercase tracking-wider">{title}</h3>}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
