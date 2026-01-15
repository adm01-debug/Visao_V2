/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Help Page - Página de Ajuda e Suporte
 */

import { useState } from "react";
import {
  HelpCircle,
  Book,
  MessageSquare,
  Video,
  Shield,
  Camera,
  Bell,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// FAQ Data
const faqCategories = [
  {
    id: "geral",
    title: "Geral",
    icon: HelpCircle,
    questions: [
      {
        q: "O que é o VISÃO?",
        a: "VISÃO é um sistema de vigilância inteligente que utiliza tecnologias avançadas de IA para monitoramento de segurança em tempo real. Ele permite gerenciar câmeras, detectar ameaças automaticamente e receber alertas instantâneos.",
      },
      {
        q: "Como começar a usar o sistema?",
        a: "Após fazer login, você pode adicionar suas câmeras na seção 'Câmeras', configurar zonas de monitoramento e definir regras de automação para receber alertas personalizados.",
      },
      {
        q: "O sistema funciona offline?",
        a: "O sistema requer conexão com internet para funcionar completamente. No entanto, as câmeras podem continuar gravando localmente e sincronizar quando a conexão for restabelecida.",
      },
    ],
  },
  {
    id: "cameras",
    title: "Câmeras",
    icon: Camera,
    questions: [
      {
        q: "Como adicionar uma nova câmera?",
        a: "Vá para a seção 'Câmeras', clique em 'Adicionar Câmera' e insira a URL do stream RTSP ou HTTP da sua câmera. O sistema suporta a maioria das câmeras IP modernas.",
      },
      {
        q: "Quais formatos de stream são suportados?",
        a: "O sistema suporta streams RTSP, HTTP, HLS e WebRTC. A maioria das câmeras IP comerciais são compatíveis.",
      },
      {
        q: "Como resolver problemas de conexão com a câmera?",
        a: "Verifique se a URL do stream está correta, se a câmera está na mesma rede, e se as credenciais de acesso estão corretas. Tente reiniciar a câmera se o problema persistir.",
      },
    ],
  },
  {
    id: "alertas",
    title: "Alertas",
    icon: Bell,
    questions: [
      {
        q: "Como configurar notificações por email?",
        a: "Acesse 'Configurações' > 'Notificações' e adicione seu endereço de email. Você pode escolher quais tipos de alertas deseja receber.",
      },
      {
        q: "Posso receber alertas no Telegram?",
        a: "Sim! Configure seu bot do Telegram nas configurações de notificação. Você receberá alertas instantâneos com imagens das detecções.",
      },
      {
        q: "Como reduzir alertas falsos?",
        a: "Ajuste a sensibilidade de detecção nas configurações, defina zonas específicas de monitoramento e configure horários de funcionamento das regras.",
      },
    ],
  },
  {
    id: "seguranca",
    title: "Segurança",
    icon: Shield,
    questions: [
      {
        q: "Meus dados estão seguros?",
        a: "Sim, utilizamos criptografia de ponta a ponta e armazenamento seguro em nuvem. Seus dados são protegidos por padrões de segurança de nível empresarial.",
      },
      {
        q: "Quem tem acesso às minhas câmeras?",
        a: "Apenas você e os usuários que você autorizar têm acesso às suas câmeras. Cada conta é isolada e protegida.",
      },
      {
        q: "O que acontece se eu esquecer minha senha?",
        a: "Use a opção 'Esqueci minha senha' na tela de login. Um email de recuperação será enviado para redefinir sua senha.",
      },
    ],
  },
];

// Quick links
const quickLinks = [
  { title: "Adicionar Câmera", href: "/cameras", icon: Camera },
  { title: "Configurar Alertas", href: "/alerts", icon: Bell },
  { title: "Gerenciar Zonas", href: "/zones", icon: Shield },
  { title: "Ver Gravações", href: "/recordings", icon: Video },
  { title: "Configurações", href: "/settings", icon: Settings },
];

export default function HelpPage() {
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("geral");

  // Filter FAQs based on search
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Central de Ajuda</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Encontre respostas para suas dúvidas, tutoriais e suporte técnico para o sistema VISÃO
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar na ajuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickLinks.map((link) => (
          <Button
            key={link.href}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
            onClick={() => window.location.href = link.href}
          >
            <link.icon className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">{link.title}</span>
          </Button>
        ))}
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Tutoriais
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Suporte
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Categorias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {faqCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={expandedCategory === category.id ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                      onClick={() => setExpandedCategory(category.id)}
                    >
                      <category.icon className="h-4 w-4" />
                      {category.title}
                      <Badge variant="outline" className="ml-auto">
                        {category.questions.length}
                      </Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="pt-6">
                  {(searchQuery ? filteredCategories : faqCategories.filter(c => c.id === expandedCategory)).map((category) => (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <category.icon className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{category.title}</h3>
                      </div>
                      <Accordion type="single" collapsible className="space-y-2">
                        {category.questions.map((item, index) => (
                          <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                            <AccordionTrigger className="hover:no-underline text-left">
                              {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {item.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))}
                  {searchQuery && filteredCategories.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum resultado encontrado para "{searchQuery}"</p>
                      <p className="text-sm mt-2">Tente buscar com outras palavras</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Primeiros Passos",
                description: "Aprenda a configurar o sistema do zero",
                duration: "5 min",
                level: "Iniciante",
              },
              {
                title: "Configurando Câmeras IP",
                description: "Como adicionar e configurar suas câmeras",
                duration: "8 min",
                level: "Iniciante",
              },
              {
                title: "Criando Zonas de Monitoramento",
                description: "Defina áreas específicas para vigilância",
                duration: "6 min",
                level: "Intermediário",
              },
              {
                title: "Regras de Automação",
                description: "Automatize ações baseadas em eventos",
                duration: "10 min",
                level: "Avançado",
              },
              {
                title: "Reconhecimento Facial",
                description: "Configure a identificação de pessoas",
                duration: "12 min",
                level: "Avançado",
              },
              {
                title: "Integrações e APIs",
                description: "Conecte com outros sistemas",
                duration: "15 min",
                level: "Avançado",
              },
            ].map((tutorial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={
                      tutorial.level === "Iniciante" ? "secondary" :
                      tutorial.level === "Intermediário" ? "default" : "destructive"
                    }>
                      {tutorial.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.duration}
                    </span>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {tutorial.title}
                  </CardTitle>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full gap-2">
                    <Video className="h-4 w-4" />
                    Assistir Tutorial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Suporte por Email
                </CardTitle>
                <CardDescription>
                  Envie sua dúvida e receba uma resposta em até 24 horas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Nossa equipe de suporte está disponível para ajudar com questões técnicas,
                  configurações e problemas gerais.
                </p>
                <Button className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  suporte@visao.app
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat ao Vivo
                </CardTitle>
                <CardDescription>
                  Fale com um especialista em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Disponível de segunda a sexta, das 9h às 18h (horário de Brasília).
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Iniciar Chat
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  Recursos Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Book className="h-6 w-6" />
                    <span>Documentação</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Video className="h-6 w-6" />
                    <span>Canal YouTube</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <MessageSquare className="h-6 w-6" />
                    <span>Comunidade</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
