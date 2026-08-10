/**
 * VISÃO - Help Page Data (FAQ, links, tutorials)
 */
import { HelpCircle, Camera, Bell, Shield, Video, Settings } from 'lucide-react';

export const faqCategories = [
  {
    id: 'geral',
    title: 'Geral',
    icon: HelpCircle,
    questions: [
      {
        q: 'O que é o VISÃO?',
        a: 'VISÃO é um sistema de vigilância inteligente que utiliza tecnologias avançadas de IA para monitoramento de segurança em tempo real. Ele permite gerenciar câmeras, detectar ameaças automaticamente e receber alertas instantâneos.',
      },
      {
        q: 'Como começar a usar o sistema?',
        a: "Após fazer login, você pode adicionar suas câmeras na seção 'Câmeras', configurar zonas de monitoramento e definir regras de automação para receber alertas personalizados.",
      },
      {
        q: 'O sistema funciona offline?',
        a: 'O sistema requer conexão com internet para funcionar completamente. No entanto, as câmeras podem continuar gravando localmente e sincronizar quando a conexão for restabelecida.',
      },
    ],
  },
  {
    id: 'cameras',
    title: 'Câmeras',
    icon: Camera,
    questions: [
      {
        q: 'Como adicionar uma nova câmera?',
        a: "Vá para a seção 'Câmeras', clique em 'Adicionar Câmera' e insira a URL do stream RTSP ou HTTP da sua câmera. O sistema suporta a maioria das câmeras IP modernas.",
      },
      {
        q: 'Quais formatos de stream são suportados?',
        a: 'O sistema suporta streams RTSP, HTTP, HLS e WebRTC. A maioria das câmeras IP comerciais são compatíveis.',
      },
      {
        q: 'Como resolver problemas de conexão com a câmera?',
        a: 'Verifique se a URL do stream está correta, se a câmera está na mesma rede, e se as credenciais de acesso estão corretas. Tente reiniciar a câmera se o problema persistir.',
      },
    ],
  },
  {
    id: 'alertas',
    title: 'Alertas',
    icon: Bell,
    questions: [
      {
        q: 'Como configurar notificações por email?',
        a: "Acesse 'Configurações' > 'Notificações' e adicione seu endereço de email. Você pode escolher quais tipos de alertas deseja receber.",
      },
      {
        q: 'Posso receber alertas no Telegram?',
        a: 'Sim! Configure seu bot do Telegram nas configurações de notificação. Você receberá alertas instantâneos com imagens das detecções.',
      },
      {
        q: 'Como reduzir alertas falsos?',
        a: 'Ajuste a sensibilidade de detecção nas configurações, defina zonas específicas de monitoramento e configure horários de funcionamento das regras.',
      },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    icon: Shield,
    questions: [
      {
        q: 'Meus dados estão seguros?',
        a: 'Sim, utilizamos criptografia de ponta a ponta e armazenamento seguro em nuvem. Seus dados são protegidos por padrões de segurança de nível empresarial.',
      },
      {
        q: 'Quem tem acesso às minhas câmeras?',
        a: 'Apenas você e os usuários que você autorizar têm acesso às suas câmeras. Cada conta é isolada e protegida.',
      },
      {
        q: 'O que acontece se eu esquecer minha senha?',
        a: "Use a opção 'Esqueci minha senha' na tela de login. Um email de recuperação será enviado para redefinir sua senha.",
      },
    ],
  },
];

export const quickLinks = [
  { title: 'Adicionar Câmera', href: '/cameras', icon: Camera },
  { title: 'Configurar Alertas', href: '/alerts', icon: Bell },
  { title: 'Gerenciar Zonas', href: '/zones', icon: Shield },
  { title: 'Ver Gravações', href: '/recordings', icon: Video },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

export const tutorials = [
  {
    title: 'Primeiros Passos',
    description: 'Aprenda a configurar o sistema do zero',
    duration: '5 min',
    level: 'Iniciante' as const,
  },
  {
    title: 'Configurando Câmeras IP',
    description: 'Como adicionar e configurar suas câmeras',
    duration: '8 min',
    level: 'Iniciante' as const,
  },
  {
    title: 'Criando Zonas de Monitoramento',
    description: 'Defina áreas específicas para vigilância',
    duration: '6 min',
    level: 'Intermediário' as const,
  },
  {
    title: 'Regras de Automação',
    description: 'Automatize ações baseadas em eventos',
    duration: '10 min',
    level: 'Avançado' as const,
  },
  {
    title: 'Reconhecimento Facial',
    description: 'Configure a identificação de pessoas',
    duration: '12 min',
    level: 'Avançado' as const,
  },
  {
    title: 'Integrações e APIs',
    description: 'Conecte com outros sistemas',
    duration: '15 min',
    level: 'Avançado' as const,
  },
];
