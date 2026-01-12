import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Question { id: string; text: string; options: string[]; correctIndex: number; }
interface QuizProps { questions: Question[]; onComplete?: (score: number) => void; className?: string; }

export function Quiz({ questions, onComplete, className }: QuizProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const isCorrect = selected === q?.correctIndex;

  const handleAnswer = () => {
    setAnswered(true);
    if (isCorrect) setScore(s => s + 1);
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      onComplete?.(score + (isCorrect ? 1 : 0));
    }
  };

  if (finished) return (
    <div className={cn('p-6 rounded-lg border bg-card text-center', className)}>
      <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
      <h3 className="text-2xl font-bold mb-2">Quiz Completo!</h3>
      <p className="text-lg">Você acertou {score} de {questions.length} questões</p>
    </div>
  );

  return (
    <div className={cn('p-6 rounded-lg border bg-card', className)}>
      <p className="text-sm text-muted-foreground mb-2">Questão {current + 1} de {questions.length}</p>
      <h3 className="font-medium mb-4">{q.text}</h3>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => !answered && setSelected(i)} disabled={answered}
            className={cn('w-full p-3 rounded border text-left', selected === i ? 'border-primary' : '',
              answered && i === q.correctIndex && 'bg-green-50 border-green-500',
              answered && selected === i && !isCorrect && 'bg-red-50 border-red-500')}>
            {opt}
            {answered && i === q.correctIndex && <CheckCircle className="inline ml-2 h-4 w-4 text-green-500" />}
            {answered && selected === i && !isCorrect && <XCircle className="inline ml-2 h-4 w-4 text-red-500" />}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {!answered ? <Button onClick={handleAnswer} disabled={selected === null}>Confirmar</Button>
          : <Button onClick={next}>Próxima<ArrowRight className="ml-2 h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

export default Quiz;
