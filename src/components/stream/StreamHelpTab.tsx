/**
 * VISÃO - Stream Help Tab
 */
import { Video, Wifi, Server, Zap, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function StreamHelpTab() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="rtsp">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Como encontrar a URL RTSP da minha câmera?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          <p className="text-sm text-muted-foreground">A URL RTSP geralmente segue o padrão:</p>
          <code className="block p-2 bg-muted rounded text-xs">
            rtsp://usuario:senha@IP:porta/caminho
          </code>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Hikvision:</strong> rtsp://admin:senha@IP:554/Streaming/Channels/101
            </p>
            <p>
              <strong>Dahua:</strong> rtsp://admin:senha@IP:554/cam/realmonitor?channel=1
            </p>
            <p>
              <strong>Intelbras:</strong> rtsp://admin:senha@IP:554/cam/realmonitor?channel=1
            </p>
            <p>
              <strong>Axis:</strong> rtsp://IP/axis-media/media.amp
            </p>
            <p>
              <strong>Tapo:</strong> rtsp://usuario:senha@IP:554/stream1
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="hls">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Por que usar HLS ao invés de RTSP?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Navegadores web não suportam RTSP nativamente por questões de segurança. HLS é o padrão
            mais compatível:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Funciona em todos os navegadores modernos</li>
            <li>Suporta qualidade adaptativa</li>
            <li>Mais resiliente a problemas de rede</li>
            <li>Compatível com CDNs</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="server">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Qual servidor de mídia devo usar?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Recomendamos o <strong>MediaMTX</strong> (antigo rtsp-simple-server):
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Gratuito e open-source</li>
            <li>Suporta RTSP, HLS, WebRTC, SRT</li>
            <li>Baixo consumo de recursos</li>
            <li>Fácil configuração via Docker</li>
            <li>Transcodificação automática</li>
          </ul>
          <p className="mt-2">Alternativas: nginx-rtmp, Wowza, Ant Media Server</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="latency">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Como reduzir a latência do stream?
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm text-muted-foreground">
          <p>Para reduzir a latência:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use preset "ultrafast" ou "superfast"</li>
            <li>Reduza o tamanho dos segmentos HLS (2s ou menos)</li>
            <li>Use Low-Latency HLS (LL-HLS)</li>
            <li>Considere WebRTC para latência sub-segundo</li>
            <li>Use conexão com fio ao invés de WiFi</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="troubleshoot">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Resolução de Problemas
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-foreground">Stream não conecta:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Verifique se a câmera está ligada e acessível na rede</li>
                <li>Teste a URL RTSP em VLC Player primeiro</li>
                <li>Confirme usuário e senha</li>
                <li>Verifique se a porta está aberta no firewall</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Stream trava ou fica lento:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Reduza a resolução/FPS na câmera</li>
                <li>Use preset mais rápido de transcodificação</li>
                <li>Verifique largura de banda da rede</li>
                <li>Use TCP ao invés de UDP para RTSP</li>
              </ul>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
