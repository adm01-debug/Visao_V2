# ❓ FAQ - Projeto VISÃO

## Perguntas Frequentes

---

### 🔧 Instalação e Configuração

**Q: Quais são os requisitos mínimos de hardware?**

A: 
- CPU: Intel i5 8ª geração ou superior
- RAM: 8 GB (16 GB recomendado)
- GPU: Integrada (dedicada recomendada para IA)
- Storage: SSD 256 GB
- Rede: 100 Mbps

---

**Q: Como configurar uma câmera RTSP?**

A: 
1. Obtenha a URL RTSP da câmera (geralmente `rtsp://ip:554/stream`)
2. Vá em Configurações → Câmeras → Adicionar
3. Cole a URL RTSP
4. Configure credenciais se necessário
5. Teste a conexão

---

**Q: O sistema funciona offline?**

A: Sim, o VISÃO possui modo PWA com:
- Cache de interface
- Gravações locais
- Sincronização ao reconectar
- Alertas offline

---

### 📹 Streaming e Câmeras

**Q: Quantas câmeras posso monitorar simultaneamente?**

A: Depende do hardware:
- CPU i5: 4-6 câmeras em 720p
- CPU i7 + GPU: 8-12 câmeras em 1080p
- Server dedicado: 16+ câmeras

---

**Q: Por que o stream está com delay?**

A: O delay pode ser causado por:
- Protocolo HLS (2-6s normal)
- Rede lenta
- Servidor sobrecarregado

Soluções:
- Use WebRTC para baixa latência
- Verifique bandwidth da rede
- Otimize resolução do stream

---

**Q: Quais formatos de câmera são suportados?**

A:
- RTSP (H.264, H.265)
- HLS
- WebRTC
- MJPEG
- Câmeras USB locais

---

### 🧑 Reconhecimento Facial

**Q: Qual a precisão do reconhecimento facial?**

A: Com condições ideais:
- Detecção: 99%+
- Reconhecimento: 95%+ (threshold 0.6)
- Falsos positivos: < 1%

Fatores que afetam:
- Iluminação
- Ângulo da face
- Qualidade da imagem

---

**Q: Quantas faces posso cadastrar?**

A: Não há limite técnico. Recomendamos:
- Até 1.000: Performance ótima
- 1.000-10.000: Boa performance
- 10.000+: Considere otimizações

---

**Q: Como melhorar a precisão?**

A:
1. Cadastre múltiplas fotos por pessoa (3-5)
2. Use boa iluminação nas câmeras
3. Ajuste o threshold conforme necessidade
4. Atualize encodings periodicamente

---

### 🚨 Alertas e Notificações

**Q: Por que não estou recebendo notificações?**

A: Verifique:
1. Push notifications habilitadas no navegador
2. Configuração do Telegram/Email
3. Filtros de alerta ativos
4. Horário de notificação (DND)

---

**Q: Como configurar alertas por Telegram?**

A:
1. Crie um bot no @BotFather
2. Obtenha o token do bot
3. Inicie conversa com o bot
4. Obtenha seu chat_id
5. Configure em Settings → Notificações

---

**Q: Posso criar regras customizadas?**

A: Sim, você pode criar regras com:
- Condições (tipo de alerta, severidade, horário)
- Ações (notificar, gravar, webhook)
- Escalonamento automático

---

### 📊 Performance

**Q: Como reduzir uso de CPU?**

A:
1. Reduza FPS de análise
2. Use resolução menor para IA
3. Habilite hardware acceleration
4. Distribua processamento

---

**Q: O sistema está lento, o que fazer?**

A:
1. Verifique uso de CPU/RAM
2. Reduza número de câmeras ativas
3. Aumente intervalo de análise
4. Limpe gravações antigas
5. Atualize para hardware melhor

---

### 🔒 Segurança

**Q: Os dados são criptografados?**

A: Sim:
- HTTPS em todas comunicações
- Face encodings criptografados
- Backup criptografado opcional
- RLS no database

---

**Q: Como funciona o controle de acesso?**

A: Sistema de roles:
- Admin: Acesso total
- Manager: Gerenciar câmeras/alertas
- Operator: Operar e reconhecer alertas
- Viewer: Somente visualização

---

**Q: O sistema é compatível com LGPD?**

A: Sim, oferecemos:
- Consentimento para coleta
- Direito ao esquecimento
- Exportação de dados
- Logs de auditoria
- Retenção configurável

---

### 💰 Licenciamento

**Q: Qual o custo do sistema?**

A: VISÃO é open-source sob licença MIT.
Custos envolvidos:
- Infraestrutura (seu servidor)
- Supabase (plano free disponível)
- Storage para gravações

---

**Q: Posso usar comercialmente?**

A: Sim, a licença MIT permite uso comercial sem restrições.

---

### 🆘 Suporte

**Q: Onde reportar bugs?**

A: Abra uma issue no GitHub:
https://github.com/adm01-debug/vis-o/issues

---

**Q: Como contribuir?**

A: 
1. Fork o repositório
2. Crie uma branch
3. Faça suas alterações
4. Abra um Pull Request

Veja CONTRIBUTING.md para detalhes.

---

**Última atualização:** 06/01/2026
