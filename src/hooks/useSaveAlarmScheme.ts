/**
 * Onda 218 — Gravação do esquema de alarme.
 *
 * A mutação **nunca** decide nada sozinha: ela recebe o veredito de
 * `admitSchemeSubmission` e só toca o banco quando `allowed`. Se ainda assim o
 * servidor recusar (a última linha de defesa da Onda 217), a mensagem crua é
 * traduzida — o operador precisa saber *qual guarda* barrou, não ver um código
 * de erro do Postgres.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  admitSchemeSubmission,
  draftToPayload,
  formToDraft,
  type AlarmSchemeFormState,
} from '@/lib/alarms/alarmSchemeForm';
import type { SchemeContext } from '@/lib/alarms/alarmScheme';
import type { TablesInsert, Json } from '@/integrations/supabase/types';

/** Traduz a recusa do trigger/CHECK (Onda 217) para linguagem de operador. */
export function translateServerRefusal(message: string): string {
  if (message.includes('alarm_scheme_channel_budget_exceeded')) {
    return 'O servidor recusou: a soma de canais exibidos + gravados passa de 36 por evento.';
  }
  if (message.includes('alarm_scheme_face_library_required')) {
    return 'O servidor recusou: "Face reconhecida" exige exatamente uma biblioteca de faces.';
  }
  if (message.includes('alarm_schemes_event_type_catalog')) {
    return 'O servidor recusou: tipo de evento fora do catálogo.';
  }
  if (message.includes('alarm_schemes_name_useful')) {
    return 'O servidor recusou: o nome precisa ter de 1 a 120 caracteres úteis.';
  }
  if (message.includes('alarm_schemes_disconnect_range')) {
    return 'O servidor recusou: o limiar de desconexão precisa ficar entre 30 e 3600 segundos.';
  }
  if (message.includes('alarm_schemes_actions_is_array')) {
    return 'O servidor recusou: a lista de ações chegou malformada.';
  }
  return message;
}

export class SchemeAdmissionError extends Error {
  constructor(public readonly reasons: readonly string[]) {
    super(reasons[0] ?? 'Cadastro recusado na pré-validação.');
    this.name = 'SchemeAdmissionError';
  }
}

export function useSaveAlarmScheme(context: SchemeContext = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: AlarmSchemeFormState) => {
      const admission = admitSchemeSubmission(form, context);
      if (!admission.allowed) {
        throw new SchemeAdmissionError(admission.refusals.map((r) => r.message));
      }

      // `actions` é JSONB no banco; o tipo gerado exige `Json`, que não aceita
      // interfaces nomeadas (falta index signature). A conversão é estrutural,
      // não semântica: o conteúdo gravado é exatamente o julgado (F4).
      const built = draftToPayload(formToDraft(form));
      // `actions` é JSONB: o tipo gerado exige `Json`, que não aceita interfaces
      // nomeadas (falta index signature). A conversão é estrutural, não
      // semântica — o conteúdo gravado é exatamente o julgado (F4).
      const payload: TablesInsert<'alarm_schemes'> = {
        ...built,
        actions: built.actions as unknown as Json,
        schedule: (built.schedule ?? null) as unknown as Json,
      };


      if (form.id) {
        const { error } = await supabase
          .from('alarm_schemes')
          .update(payload)
          .eq('id', form.id);
        if (error) throw new Error(translateServerRefusal(error.message));
        return form.id;
      }

      const { data, error } = await supabase
        .from('alarm_schemes')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw new Error(translateServerRefusal(error.message));
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alarm-schemes'] });
    },
  });
}

export function useDeleteAlarmScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alarm_schemes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alarm-schemes'] });
    },
  });
}
