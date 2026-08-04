/**
 * VISÃO - Telegram Setup Instructions (Accordion)
 */
import { HelpCircle, ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

export function TelegramInstructions() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="create-bot">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Como criar um bot no Telegram?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Abra o Telegram e procure por{' '}
              <code className="bg-muted px-1 rounded">@BotFather</code>
            </li>
            <li>
              Envie o comando <code className="bg-muted px-1 rounded">/newbot</code>
            </li>
            <li>Escolha um nome para seu bot (ex: "VISÃO Alertas")</li>
            <li>Escolha um username único terminando em "bot" (ex: "visao_alertas_bot")</li>
            <li>Copie o token fornecido e cole no campo acima</li>
          </ol>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://t.me/BotFather', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir BotFather
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="get-chat-id">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Como obter o Chat ID?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Para chat pessoal:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Abra o Telegram e procure por{' '}
                <code className="bg-muted px-1 rounded">@userinfobot</code>
              </li>
              <li>Envie qualquer mensagem para ele</li>
              <li>Ele responderá com seu ID</li>
            </ol>
            <p>
              <strong>Para grupos:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Adicione seu bot ao grupo</li>
              <li>
                Adicione também o <code className="bg-muted px-1 rounded">@userinfobot</code>
              </li>
              <li>Envie uma mensagem no grupo</li>
              <li>O bot mostrará o ID do grupo (começa com -)</li>
            </ol>
            <p>
              <strong>Para canais:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Adicione seu bot como administrador do canal</li>
              <li>
                Encaminhe uma mensagem do canal para{' '}
                <code className="bg-muted px-1 rounded">@userinfobot</code>
              </li>
              <li>Ele mostrará o ID do canal</li>
            </ol>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://t.me/userinfobot', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir UserInfoBot
          </Button>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="test-bot">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />O que fazer se o teste falhar?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm text-muted-foreground">
          <p>Verifique os seguintes pontos:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>O token do bot está correto (sem espaços extras)</li>
            <li>Você enviou uma mensagem para o bot antes (isso ativa o chat)</li>
            <li>O Chat ID está correto (grupos começam com -)</li>
            <li>O bot está adicionado ao grupo/canal como administrador</li>
            <li>O bot não está bloqueado ou removido</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
