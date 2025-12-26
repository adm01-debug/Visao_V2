/**
 * Word Cloud Component
 * Tag cloud visualization with weighted words
 */

import React, { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';

export interface WordCloudItem {
  text: string;
  value: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface WordCloudProps {
  words: WordCloudItem[];
  width?: number;
  height?: number;
  minFontSize?: number;
  maxFontSize?: number;
  fontFamily?: string;
  spiral?: 'archimedean' | 'rectangular';
  padding?: number;
  rotations?: number[];
  colorScale?: string[];
  onWordClick?: (word: WordCloudItem) => void;
  onWordHover?: (word: WordCloudItem | null) => void;
  className?: string;
}

interface PlacedWord extends WordCloudItem {
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  width: number;
  height: number;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// Simple spiral placement
function spiralPosition(step: number, type: 'archimedean' | 'rectangular'): [number, number] {
  if (type === 'rectangular') {
    const side = Math.floor(Math.sqrt(step));
    const offset = step - side * side;
    if (offset < side + 1) {
      return [offset - side / 2, side / 2];
    } else {
      return [side / 2, offset - side - side / 2];
    }
  }
  
  // Archimedean spiral
  const angle = step * 0.1;
  const radius = step * 0.5;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

// Check if two rectangles overlap
function overlaps(a: PlacedWord, b: PlacedWord, padding: number): boolean {
  return !(
    a.x + a.width / 2 + padding < b.x - b.width / 2 - padding ||
    a.x - a.width / 2 - padding > b.x + b.width / 2 + padding ||
    a.y + a.height / 2 + padding < b.y - b.height / 2 - padding ||
    a.y - a.height / 2 - padding > b.y + b.height / 2 + padding
  );
}

export const WordCloud: React.FC<WordCloudProps> = ({
  words,
  width = 600,
  height = 400,
  minFontSize = 12,
  maxFontSize = 60,
  fontFamily = 'system-ui, sans-serif',
  spiral = 'archimedean',
  padding = 2,
  rotations = [0],
  colorScale = COLORS,
  onWordClick,
  onWordHover,
  className,
}) => {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const placedWords = useMemo(() => {
    if (words.length === 0) return [];

    // Sort by value descending
    const sortedWords = [...words].sort((a, b) => b.value - a.value);

    // Calculate font sizes
    const minValue = Math.min(...words.map(w => w.value));
    const maxValue = Math.max(...words.map(w => w.value));
    const valueRange = maxValue - minValue || 1;

    const placed: PlacedWord[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    sortedWords.forEach((word, index) => {
      // Calculate font size based on value
      const normalized = (word.value - minValue) / valueRange;
      const fontSize = minFontSize + normalized * (maxFontSize - minFontSize);
      
      // Estimate word dimensions (rough approximation)
      const charWidth = fontSize * 0.6;
      const wordWidth = word.text.length * charWidth;
      const wordHeight = fontSize * 1.2;
      
      // Choose rotation
      const rotation = rotations[index % rotations.length];
      
      // Find position using spiral
      let step = 0;
      let x = centerX;
      let y = centerY;
      let foundPosition = false;

      const newWord: PlacedWord = {
        ...word,
        x,
        y,
        fontSize,
        rotation,
        width: rotation === 0 ? wordWidth : wordHeight,
        height: rotation === 0 ? wordHeight : wordWidth,
      };

      while (!foundPosition && step < 1000) {
        const [dx, dy] = spiralPosition(step, spiral);
        newWord.x = centerX + dx;
        newWord.y = centerY + dy;

        // Check bounds
        const halfW = newWord.width / 2;
        const halfH = newWord.height / 2;
        if (
          newWord.x - halfW < 0 ||
          newWord.x + halfW > width ||
          newWord.y - halfH < 0 ||
          newWord.y + halfH > height
        ) {
          step++;
          continue;
        }

        // Check overlap with placed words
        const hasOverlap = placed.some(p => overlaps(newWord, p, padding));
        if (!hasOverlap) {
          foundPosition = true;
        } else {
          step++;
        }
      }

      if (foundPosition) {
        placed.push(newWord);
      }
    });

    return placed;
  }, [words, width, height, minFontSize, maxFontSize, spiral, padding, rotations]);

  const getColor = (word: PlacedWord, index: number) => {
    if (word.color) return word.color;
    return colorScale[index % colorScale.length];
  };

  const handleWordHover = (word: PlacedWord | null) => {
    setHoveredWord(word?.text || null);
    onWordHover?.(word);
  };

  return (
    <div className={cn('word-cloud relative', className)}>
      <svg width={width} height={height} className="overflow-visible">
        {placedWords.map((word, index) => (
          <text
            key={word.text}
            x={word.x}
            y={word.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={getColor(word, index)}
            fontSize={word.fontSize}
            fontFamily={fontFamily}
            fontWeight={word.value > (words.reduce((sum, w) => sum + w.value, 0) / words.length) ? 'bold' : 'normal'}
            transform={word.rotation !== 0 ? `rotate(${word.rotation}, ${word.x}, ${word.y})` : undefined}
            className={cn(
              'transition-all cursor-pointer select-none',
              hoveredWord === word.text && 'opacity-80 scale-105',
              onWordClick && 'hover:opacity-80'
            )}
            style={{
              transformOrigin: `${word.x}px ${word.y}px`,
            }}
            onClick={() => onWordClick?.(word)}
            onMouseEnter={() => handleWordHover(word)}
            onMouseLeave={() => handleWordHover(null)}
          >
            {word.text}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredWord && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-popover text-popover-foreground rounded-lg shadow-lg text-sm">
          {(() => {
            const word = placedWords.find(w => w.text === hoveredWord);
            if (!word) return null;
            return (
              <>
                <div className="font-medium">{word.text}</div>
                <div className="text-muted-foreground">{word.value.toLocaleString()}</div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default WordCloud;
