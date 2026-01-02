'use client';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthLevel {
  label: string;
  color: string;
  bgColor: string;
  minScore: number;
}

const STRENGTH_LEVELS: StrengthLevel[] = [
  { label: 'Very Weak', color: 'text-red-400', bgColor: 'bg-red-500', minScore: 0 },
  { label: 'Weak', color: 'text-orange-400', bgColor: 'bg-orange-500', minScore: 1 },
  { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-500', minScore: 2 },
  { label: 'Good', color: 'text-lime-400', bgColor: 'bg-lime-500', minScore: 3 },
  { label: 'Strong', color: 'text-green-400', bgColor: 'bg-green-500', minScore: 4 },
];

function calculateStrength(password: string): number {
  if (!password) return 0;
  
  let score = 0;
  
  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // Normalize to 0-4 scale
  return Math.min(4, Math.floor(score * 0.67));
}

function getStrengthLevel(score: number): StrengthLevel {
  return STRENGTH_LEVELS.find((_, i, arr) => 
    i === arr.length - 1 || score < arr[i + 1].minScore
  ) || STRENGTH_LEVELS[0];
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const score = calculateStrength(password);
  const level = getStrengthLevel(score);
  const percentage = (score / 4) * 100;
  
  if (!password) return null;
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500">Password strength</span>
        <span className={level.color}>{level.label}</span>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${level.bgColor} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ul className="text-xs text-zinc-500 space-y-0.5 mt-2">
        <li className={password.length >= 8 ? 'text-green-400' : ''}>
          {password.length >= 8 ? '✓' : '○'} At least 8 characters
        </li>
        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-400' : ''}>
          {/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '○'} Upper and lowercase letters
        </li>
        <li className={/[0-9]/.test(password) ? 'text-green-400' : ''}>
          {/[0-9]/.test(password) ? '✓' : '○'} At least one number
        </li>
        <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-400' : ''}>
          {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} At least one special character
        </li>
      </ul>
    </div>
  );
}
