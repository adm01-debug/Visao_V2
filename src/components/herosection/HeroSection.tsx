import React from 'react';
import { cn } from '@/lib/utils';
import { Rocket, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps { title: string; subtitle?: string; ctaText?: string; ctaSecondary?: string; onCta?: () => void; onSecondaryCta?: () => void; backgroundImage?: string; className?: string; }

export function HeroSection({ title, subtitle, ctaText = 'Começar', ctaSecondary, onCta, onSecondaryCta, backgroundImage, className }: HeroSectionProps) {
  return (
    <div className={cn('relative py-24 px-6 text-center overflow-hidden', className)} style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' } : {}}>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
      <div className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm mb-6"><Sparkles className="h-4 w-4 text-primary" />Novo! Versão 2.0</div>
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{title}</h1>
        {subtitle && <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{subtitle}</p>}
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={onCta}><Rocket className="mr-2 h-5 w-5" />{ctaText}</Button>
          {ctaSecondary && <Button size="lg" variant="outline" onClick={onSecondaryCta}>{ctaSecondary}<ArrowRight className="ml-2 h-5 w-5" /></Button>}
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
