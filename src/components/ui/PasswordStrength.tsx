import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

// Common leaked/weak passwords (top entries from HIBP)
const COMMON_PASSWORDS = new Set([
  '123456',
  'password',
  '12345678',
  'qwerty',
  '123456789',
  '12345',
  '1234',
  '111111',
  '1234567',
  'dragon',
  '123123',
  'baseball',
  'abc123',
  'football',
  'monkey',
  'letmein',
  'shadow',
  'master',
  '666666',
  'qwerty123',
  'mustang',
  'michael',
  '654321',
  'superman',
  '1qaz2wsx',
  '7777777',
  '121212',
  '000000',
  'qazwsx',
  '123qwe',
  'killer',
  'trustno1',
  'jordan',
  'jennifer',
  'hunter',
  'buster',
  'soccer',
  'harley',
  'batman',
  'andrew',
  'tigger',
  'sunshine',
  'iloveyou',
  '2000',
  'charlie',
  'robert',
  'thomas',
  'hockey',
  'ranger',
  'daniel',
  'starwars',
  'klaster',
  '112233',
  'george',
  'computer',
  'michelle',
  'jessica',
  'pepper',
  '1111',
  'zxcvbn',
  '555555',
  '11111111',
  '131313',
  'freedom',
  '777777',
  'pass',
  'maggie',
  '159753',
  'aaaaaa',
  'ginger',
  'princess',
  'joshua',
  'cheese',
  'amanda',
  'summer',
  'love',
  'ashley',
  'nicole',
  'chelsea',
  'biteme',
  'matthew',
  'access',
  'yankees',
  '987654321',
  'dallas',
  'austin',
  'thunder',
  'taylor',
  'matrix',
  'senha',
  'senha123',
  'admin',
  'admin123',
  'root',
  'toor',
  'welcome',
  'welcome1',
  'p@ssw0rd',
  'passw0rd',
]);

export interface PasswordStrengthResult {
  level: number;
  label: string;
  isBlocked: boolean;
  blockReason?: string;
  requirements: { met: boolean; label: string }[];
}

export const getPasswordStrength = (pw: string): PasswordStrengthResult => {
  const requirements = [
    { met: pw.length >= 8, label: 'Mínimo 8 caracteres' },
    { met: /[A-Z]/.test(pw), label: 'Uma letra maiúscula' },
    { met: /[a-z]/.test(pw), label: 'Uma letra minúscula' },
    { met: /[0-9]/.test(pw), label: 'Um número' },
    { met: /[^A-Za-z0-9]/.test(pw), label: 'Um caractere especial (!@#$...)' },
  ];

  if (!pw) return { level: 0, label: '', isBlocked: false, requirements };

  // Check common passwords
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
    return {
      level: 0,
      label: 'Senha vazada',
      isBlocked: true,
      blockReason: 'Esta senha aparece em listas de senhas vazadas e não pode ser usada.',
      requirements,
    };
  }

  // Check sequential/repeated patterns
  if (/^(.)\1+$/.test(pw)) {
    return {
      level: 0,
      label: 'Muito fraca',
      isBlocked: true,
      blockReason: 'Não use caracteres repetidos.',
      requirements,
    };
  }

  if (/^(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(pw)) {
    if (pw.length < 8) {
      return {
        level: 1,
        label: 'Fraca',
        isBlocked: true,
        blockReason: 'Sequências simples são facilmente adivinhadas.',
        requirements,
      };
    }
  }

  // Min length enforcement
  if (pw.length < 8) {
    return {
      level: 1,
      label: 'Muito curta',
      isBlocked: true,
      blockReason: 'A senha deve ter no mínimo 8 caracteres.',
      requirements,
    };
  }

  const metCount = requirements.filter((r) => r.met).length;

  if (metCount <= 2)
    return {
      level: 1,
      label: 'Fraca',
      isBlocked: true,
      blockReason: 'Atenda pelo menos 3 requisitos.',
      requirements,
    };
  if (metCount === 3) return { level: 2, label: 'Razoável', isBlocked: false, requirements };
  if (metCount === 4) return { level: 3, label: 'Boa', isBlocked: false, requirements };
  return { level: 4, label: 'Forte', isBlocked: false, requirements };
};

const colors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-primary', 'bg-success'];
const textColors = [
  'text-destructive',
  'text-destructive',
  'text-warning',
  'text-primary',
  'text-success',
];

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const result = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  const { level, label, isBlocked, blockReason, requirements } = result;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar — exposta como medidor para leitores de tela (antes eram
          só divs coloridas, sem nome nem valor acessível). */}
      <div
        className="flex gap-1"
        role="meter"
        aria-label="Força da senha"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={level}
        aria-valuetext={label || undefined}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i <= (level || 1) && level > 0
                ? colors[level]
                : i === 1 && isBlocked
                  ? 'bg-destructive'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Label + icon */}
      <div className="flex items-center gap-1.5">
        {isBlocked ? (
          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : level >= 3 ? (
          <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
        ) : (
          <Shield className="h-3.5 w-3.5 text-warning shrink-0" />
        )}
        <p
          className={cn(
            'text-[11px] font-medium transition-colors',
            isBlocked ? 'text-destructive' : textColors[level]
          )}
        >
          {label}
        </p>
      </div>

      {/* Block reason */}
      {isBlocked && blockReason && (
        <p className="text-[11px] text-destructive/90 bg-destructive/10 rounded-md px-2 py-1.5 border border-destructive/20">
          ⚠️ {blockReason}
        </p>
      )}

      {/* Requirements checklist */}
      {showRequirements && password.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {requirements.map((req, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  req.met ? 'bg-success' : 'bg-muted-foreground/30'
                )}
              />
              <span
                className={cn(
                  'text-[10px] transition-colors',
                  req.met ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
