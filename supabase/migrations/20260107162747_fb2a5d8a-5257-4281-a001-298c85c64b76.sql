-- Create table for rule execution history
CREATE TABLE public.rule_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actions_executed TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rule_executions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own rule executions" 
ON public.rule_executions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rule executions" 
ON public.rule_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rule executions" 
ON public.rule_executions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_rule_executions_rule_id ON public.rule_executions(rule_id);
CREATE INDEX idx_rule_executions_triggered_at ON public.rule_executions(triggered_at DESC);