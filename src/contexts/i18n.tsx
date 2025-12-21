/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Internacionalização (i18n)
 * 
 * Sistema de tradução com suporte a:
 * - Português (Brasil) - padrão
 * - Inglês (US)
 * - Espanhol (ES)
 * - Interpolação de variáveis
 * - Pluralização
 * - Formatação de datas e números
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================
// TIPOS
// ============================================

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

export interface TranslationParams {
  [key: string]: string | number;
}

export interface PluralRules {
  zero?: string;
  one: string;
  few?: string;
  many?: string;
  other: string;
}

// ============================================
// TRADUÇÕES
// ============================================

const translations: Record<SupportedLocale, Record<string, any>> = {
  'pt-BR': {
    // Navegação
    nav: {
      dashboard: 'Dashboard',
      cameras: 'Câmeras',
      alerts: 'Alertas',
      recordings: 'Gravações',
      people: 'Colaboradores',
      recognition: 'Reconhecimento',
      recognitionLogs: 'Logs de Reconhecimento',
      zones: 'Zonas',
      plates: 'Placas',
      analytics: 'Analytics',
      security: 'Segurança',
      settings: 'Configurações',
      reports: 'Relatórios',
      heatmap: 'Mapa de Calor',
    },

    // Comum
    common: {
      loading: 'Carregando...',
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      add: 'Adicionar',
      search: 'Buscar',
      filter: 'Filtrar',
      refresh: 'Atualizar',
      export: 'Exportar',
      import: 'Importar',
      close: 'Fechar',
      confirm: 'Confirmar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      yes: 'Sim',
      no: 'Não',
      all: 'Todos',
      none: 'Nenhum',
      select: 'Selecionar',
      actions: 'Ações',
      status: 'Status',
      name: 'Nome',
      description: 'Descrição',
      date: 'Data',
      time: 'Hora',
      type: 'Tipo',
      details: 'Detalhes',
      more: 'Mais',
      less: 'Menos',
      view: 'Visualizar',
      download: 'Baixar',
      upload: 'Enviar',
      copy: 'Copiar',
      copied: 'Copiado!',
      error: 'Erro',
      success: 'Sucesso',
      warning: 'Atenção',
      info: 'Informação',
    },

    // Status
    status: {
      online: 'Online',
      offline: 'Offline',
      active: 'Ativo',
      inactive: 'Inativo',
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      recording: 'Gravando',
      paused: 'Pausado',
      stopped: 'Parado',
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Visão geral do sistema de vigilância',
      totalCameras: 'Total de Câmeras',
      onlineCameras: 'Câmeras Online',
      offlineCameras: 'Câmeras Offline',
      alertsToday: 'Alertas Hoje',
      peopleDetected: 'Pessoas Detectadas',
      activeZones: 'Zonas Ativas',
      storageUsed: 'Armazenamento Usado',
      systemHealth: 'Saúde do Sistema',
      recentAlerts: 'Alertas Recentes',
      cameraGrid: 'Grid de Câmeras',
      liveView: 'Visualização ao Vivo',
      noAlerts: 'Nenhum alerta recente',
      viewAll: 'Ver todos',
    },

    // Câmeras
    cameras: {
      title: 'Câmeras',
      subtitle: 'Gerenciamento de câmeras de vigilância',
      addCamera: 'Adicionar Câmera',
      editCamera: 'Editar Câmera',
      deleteCamera: 'Excluir Câmera',
      cameraName: 'Nome da Câmera',
      location: 'Localização',
      streamUrl: 'URL do Stream',
      protocol: 'Protocolo',
      thumbnail: 'Miniatura',
      lastActivity: 'Última Atividade',
      detectedPeople: 'Pessoas Detectadas',
      alertsCount: 'Contagem de Alertas',
      fullscreen: 'Tela Cheia',
      settings: 'Configurações da Câmera',
      record: 'Gravar',
      snapshot: 'Capturar',
      noStream: 'Sem stream disponível',
      reconnecting: 'Reconectando...',
      streamError: 'Erro no stream',
      confirmDelete: 'Tem certeza que deseja excluir esta câmera?',
      online: 'Online',
      offline: 'Offline',
      streamUnavailable: 'Stream não disponível',
      live: 'Ao Vivo',
      alerts: 'Alertas',
      config: 'Config',
      status: 'Status',
      resolution: 'Resolução',
      statsToday: 'Estatísticas Hoje',
      people: 'Pessoas',
      analyses: 'Análises',
      recorded: 'Gravado',
      noRecentAlerts: 'Nenhum alerta recente',
      features: 'Funcionalidades',
      aiAnalysis: 'Análise de IA',
      faceRecognition: 'Reconhecimento Facial',
      zonesOfInterest: 'Zonas de Interesse',
      all: 'Todos',
      recording: 'Gravando',
      noCameraFound: 'Nenhuma câmera encontrada',
      of: 'de',
      inAlert: 'em alerta',
      searchPlaceholder: 'Buscar câmeras...',
    },

    // Alertas
    alerts: {
      title: 'Alertas',
      subtitle: 'Central de alertas e notificações',
      newAlert: 'Novo Alerta',
      markAsRead: 'Marcar como Lido',
      markAllRead: 'Marcar Todos como Lidos',
      deleteAlert: 'Excluir Alerta',
      severity: 'Severidade',
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica',
      alertType: 'Tipo de Alerta',
      intrusion: 'Intrusão',
      motion: 'Movimento',
      face: 'Reconhecimento Facial',
      blacklist: 'Pessoa na Blacklist',
      zone: 'Violação de Zona',
      camera: 'Câmera Offline',
      timestamp: 'Data/Hora',
      acknowledged: 'Reconhecido',
      pending: 'Pendente',
      noAlerts: 'Nenhum alerta encontrado',
      filterBySeverity: 'Filtrar por Severidade',
      filterByType: 'Filtrar por Tipo',
      filterByCamera: 'Filtrar por Câmera',
    },

    // Reconhecimento Facial
    faceRecognition: {
      title: 'Reconhecimento Facial',
      subtitle: 'Detecção e identificação de faces',
      registerFace: 'Cadastrar Rosto',
      trainModel: 'Treinar Modelo',
      matchThreshold: 'Limiar de Correspondência',
      detectedFaces: 'Rostos Detectados',
      knownFaces: 'Rostos Conhecidos',
      unknownFaces: 'Rostos Desconhecidos',
      blacklist: 'Blacklist',
      vipList: 'Lista VIP',
      addToBlacklist: 'Adicionar à Blacklist',
      removeFromBlacklist: 'Remover da Blacklist',
      addToVIP: 'Marcar como VIP',
      removeFromVIP: 'Remover VIP',
      similarity: 'Similaridade',
      lastSeen: 'Visto por Último',
      timesRecognized: 'Vezes Reconhecido',
      captureFromCamera: 'Capturar da Câmera',
      uploadPhoto: 'Enviar Foto',
      modelsLoading: 'Carregando modelos de IA...',
      modelsReady: 'Modelos prontos',
      noFacesDetected: 'Nenhum rosto detectado',
    },

    // Zonas
    zones: {
      title: 'Zonas',
      subtitle: 'Gerenciamento de zonas de interesse',
      addZone: 'Adicionar Zona',
      editZone: 'Editar Zona',
      deleteZone: 'Excluir Zona',
      zoneName: 'Nome da Zona',
      camera: 'Câmera',
      zoneType: 'Tipo de Zona',
      restricted: 'Área Restrita',
      counting: 'Contagem de Pessoas',
      parking: 'Estacionamento',
      entrance: 'Entrada',
      exit: 'Saída',
      polygon: 'Polígono da Zona',
      drawPolygon: 'Desenhar Polígono',
      clearPolygon: 'Limpar Polígono',
      entry: 'Entrada',
      current: 'Atual',
      avgTime: 'Tempo médio',
      alerts: 'Alertas',
      alertsToday: 'Alertas hoje',
      draw: 'Desenhar Zona',
      nameLabel: 'Nome da Zona',
      type: 'Tipo',
      color: 'Cor',
      active: 'Zona Ativa',
      visualization: 'Visualização',
      statistics: 'Estatísticas',
      status: 'Status',
      entries: 'Entradas',
      exits: 'Saídas',
      currentOccupancy: 'Ocupação Atual',
      total: 'Total',
      activeCount: 'Ativas',
      allCameras: 'Todas câmeras',
      allTypes: 'Todos tipos',
    },

    // Gravações
    recordings: {
      title: 'Gravações',
      subtitle: 'Visualize e gerencie os clips de vídeo gravados',
      addRecording: 'Adicionar Gravação',
      startTime: 'Início',
      endTime: 'Fim',
      duration: 'Duração',
      camera: 'Câmera',
      download: 'Baixar',
      play: 'Reproduzir',
      pause: 'Pausar',
      noRecordings: 'Nenhuma gravação encontrada',
      delete: 'Excluir',
      clips: 'Clips',
      totalDuration: 'Duração total',
      allCameras: 'Todas as câmeras',
      today: 'Hoje',
      yesterday: 'Ontem',
      all: 'Todos',
      confirmDelete: 'Confirmar exclusão',
    },

    // Analytics
    analytics: {
      title: 'Analytics',
      subtitle: 'Análise de dados e estatísticas',
      overview: 'Visão Geral',
      totalAlerts: 'Total de Alertas',
      totalPeople: 'Total de Pessoas',
      avgOccupancy: 'Ocupação Média',
      peakHour: 'Hora de Pico',
      charts: 'Gráficos',
      exportData: 'Exportar Dados',
      dateRange: 'Período',
      noChange: 'Sem alteração',
      total: 'Total',
      alertTrend: 'Tendência de Alertas',
      alertsPerDay: 'Alertas por dia no período selecionado',
      alertsByType: 'Alertas por Tipo',
      distributionByCategory: 'Distribuição por categoria',
      cameraPerformance: 'Performance por Câmera',
      top5Cameras: 'Top 5 câmeras com mais atividade',
      noCameraFound: 'Nenhuma câmera encontrada',
      hourlyDistribution: 'Distribuição por Hora',
      alertConcentration: 'Concentração de alertas ao longo do dia',
      lowerActivity: 'Menor atividade',
      higherActivity: 'Maior atividade',
      periodSummary: 'Resumo do Período',
    },

    // Configurações
    settings: {
      title: 'Configurações',
      subtitle: 'Configure o sistema de acordo com suas necessidades',
      general: 'Geral',
      notifications: 'Notificações',
      analysis: 'Análise IA',
      faceRecognition: 'Reconhecimento Facial',
      security: 'Segurança',
      storage: 'Armazenamento',
      integrations: 'Integrações',
      systemName: 'Nome do Sistema',
      timezone: 'Fuso Horário',
      language: 'Idioma',
      theme: 'Tema',
      darkMode: 'Modo Escuro',
      lightMode: 'Modo Claro',
      systemMode: 'Seguir Sistema',
      soundEnabled: 'Sons Habilitados',
      autoRefresh: 'Atualização Automática',
      refreshInterval: 'Intervalo de Atualização',
      emailNotifications: 'Notificações por Email',
      whatsappNotifications: 'Notificações por WhatsApp',
      pushNotifications: 'Notificações Push',
      webhookNotifications: 'Notificações por Webhook',
      saveSettings: 'Salvar Configurações',
      resetSettings: 'Restaurar Padrões',
      settingsSaved: 'Configurações salvas com sucesso!',
      settingsError: 'Erro ao salvar configurações',
    },

    // Mensagens de erro
    errors: {
      generic: 'Ocorreu um erro. Tente novamente.',
      networkError: 'Erro de conexão. Verifique sua internet.',
      unauthorized: 'Acesso não autorizado.',
      notFound: 'Recurso não encontrado.',
      validationError: 'Dados inválidos. Verifique os campos.',
      serverError: 'Erro no servidor. Tente novamente mais tarde.',
      sessionExpired: 'Sessão expirada. Faça login novamente.',
      cameraOffline: 'Câmera offline ou inacessível.',
      streamError: 'Erro ao carregar stream de vídeo.',
      facesNotLoaded: 'Erro ao carregar modelos de reconhecimento.',
    },

    // Mensagens de sucesso
    success: {
      saved: 'Salvo com sucesso!',
      deleted: 'Excluído com sucesso!',
      updated: 'Atualizado com sucesso!',
      created: 'Criado com sucesso!',
      copied: 'Copiado para a área de transferência!',
      exported: 'Exportado com sucesso!',
      imported: 'Importado com sucesso!',
    },

    // Formatação
    format: {
      dateShort: 'dd/MM/yyyy',
      dateLong: "dd 'de' MMMM 'de' yyyy",
      timeShort: 'HH:mm',
      timeLong: 'HH:mm:ss',
      dateTime: 'dd/MM/yyyy HH:mm',
      currency: 'R$',
      decimal: ',',
      thousands: '.',
    },

    // Pluralização
    plurals: {
      camera: {
        one: '{{count}} câmera',
        other: '{{count}} câmeras',
      },
      alert: {
        one: '{{count}} alerta',
        other: '{{count}} alertas',
      },
      person: {
        one: '{{count}} pessoa',
        other: '{{count}} pessoas',
      },
      recording: {
        one: '{{count}} gravação',
        other: '{{count}} gravações',
      },
      minute: {
        one: '{{count}} minuto',
        other: '{{count}} minutos',
      },
      hour: {
        one: '{{count}} hora',
        other: '{{count}} horas',
      },
      day: {
        one: '{{count}} dia',
        other: '{{count}} dias',
      },
    },
  },

  'en-US': {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      cameras: 'Cameras',
      alerts: 'Alerts',
      recordings: 'Recordings',
      people: 'People',
      recognition: 'Recognition',
      recognitionLogs: 'Recognition Logs',
      zones: 'Zones',
      plates: 'License Plates',
      analytics: 'Analytics',
      security: 'Security',
      settings: 'Settings',
      reports: 'Reports',
      heatmap: 'Heatmap',
    },

    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      close: 'Close',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      none: 'None',
      select: 'Select',
      actions: 'Actions',
      status: 'Status',
      name: 'Name',
      description: 'Description',
      date: 'Date',
      time: 'Time',
      type: 'Type',
      details: 'Details',
      more: 'More',
      less: 'Less',
      view: 'View',
      download: 'Download',
      upload: 'Upload',
      copy: 'Copy',
      copied: 'Copied!',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
    },

    // Status
    status: {
      online: 'Online',
      offline: 'Offline',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      connected: 'Connected',
      disconnected: 'Disconnected',
      recording: 'Recording',
      paused: 'Paused',
      stopped: 'Stopped',
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Surveillance system overview',
      totalCameras: 'Total Cameras',
      onlineCameras: 'Online Cameras',
      offlineCameras: 'Offline Cameras',
      alertsToday: 'Alerts Today',
      peopleDetected: 'People Detected',
      activeZones: 'Active Zones',
      storageUsed: 'Storage Used',
      systemHealth: 'System Health',
      recentAlerts: 'Recent Alerts',
      cameraGrid: 'Camera Grid',
      liveView: 'Live View',
      noAlerts: 'No recent alerts',
      viewAll: 'View all',
    },

    // Cameras
    cameras: {
      title: 'Cameras',
      subtitle: 'Surveillance camera management',
      addCamera: 'Add Camera',
      editCamera: 'Edit Camera',
      deleteCamera: 'Delete Camera',
      cameraName: 'Camera Name',
      location: 'Location',
      streamUrl: 'Stream URL',
      protocol: 'Protocol',
      thumbnail: 'Thumbnail',
      lastActivity: 'Last Activity',
      detectedPeople: 'Detected People',
      alertsCount: 'Alerts Count',
      fullscreen: 'Fullscreen',
      settings: 'Settings',
      record: 'Record',
      snapshot: 'Snapshot',
      noStream: 'No stream available',
      reconnecting: 'Reconnecting...',
      streamError: 'Stream error',
      confirmDelete: 'Are you sure you want to delete this camera?',
    },

    // Alerts
    alerts: {
      title: 'Alerts',
      subtitle: 'Alert and notification center',
      newAlert: 'New Alert',
      markAsRead: 'Mark as Read',
      markAllRead: 'Mark All as Read',
      deleteAlert: 'Delete Alert',
      severity: 'Severity',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
      alertType: 'Alert Type',
      intrusion: 'Intrusion',
      motion: 'Motion',
      face: 'Face Recognition',
      blacklist: 'Blacklisted Person',
      zone: 'Zone Violation',
      camera: 'Camera Offline',
      timestamp: 'Timestamp',
      acknowledged: 'Acknowledged',
      pending: 'Pending',
      noAlerts: 'No alerts found',
      filterBySeverity: 'Filter by Severity',
      filterByType: 'Filter by Type',
      filterByCamera: 'Filter by Camera',
    },

    // Face Recognition
    faceRecognition: {
      title: 'Face Recognition',
      subtitle: 'Face detection and identification',
      registerFace: 'Register Face',
      trainModel: 'Train Model',
      matchThreshold: 'Match Threshold',
      detectedFaces: 'Detected Faces',
      knownFaces: 'Known Faces',
      unknownFaces: 'Unknown Faces',
      blacklist: 'Blacklist',
      vipList: 'VIP List',
      addToBlacklist: 'Add to Blacklist',
      removeFromBlacklist: 'Remove from Blacklist',
      addToVIP: 'Mark as VIP',
      removeFromVIP: 'Remove VIP',
      similarity: 'Similarity',
      lastSeen: 'Last Seen',
      timesRecognized: 'Times Recognized',
      captureFromCamera: 'Capture from Camera',
      uploadPhoto: 'Upload Photo',
      modelsLoading: 'Loading AI models...',
      modelsReady: 'Models ready',
      noFacesDetected: 'No faces detected',
    },

    // Zones
    zones: {
      title: 'Monitoring Zones',
      subtitle: 'Define areas of interest in cameras',
      addZone: 'Add Zone',
      editZone: 'Edit Zone',
      deleteZone: 'Delete Zone',
      zoneName: 'Zone Name',
      zoneType: 'Zone Type',
      restricted: 'Restricted Area',
      monitoring: 'Monitoring',
      counting: 'Counting',
      tripwire: 'Tripwire',
      polygon: 'Polygon',
      rectangle: 'Rectangle',
      drawZone: 'Draw Zone',
      clearDrawing: 'Clear Drawing',
      saveZone: 'Save Zone',
      activeEvents: 'Active Events',
      peopleInZone: 'People in Zone',
      alertOnEntry: 'Alert on Entry',
      alertOnExit: 'Alert on Exit',
      alertOnLoiter: 'Alert on Loitering',
      loiterTime: 'Loiter Time (sec)',
    },

    // Recordings
    recordings: {
      title: 'Recordings',
      subtitle: 'Clips and recordings history',
      newRecording: 'New Recording',
      clipRecording: 'Clip',
      continuousRecording: 'Continuous',
      eventRecording: 'Event-based',
      duration: 'Duration',
      size: 'Size',
      startTime: 'Start Time',
      endTime: 'End Time',
      download: 'Download',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      deleteRecording: 'Delete Recording',
      noRecordings: 'No recordings found',
      filterByDate: 'Filter by Date',
      filterByCamera: 'Filter by Camera',
      storageInfo: 'Storage Info',
      usedSpace: 'Used Space',
      freeSpace: 'Free Space',
      retentionDays: 'Retention Days',
    },

    // Analytics
    analytics: {
      title: 'Analytics',
      subtitle: 'System statistics and reports',
      overview: 'Overview',
      trends: 'Trends',
      heatmap: 'Heatmap',
      reports: 'Reports',
      alertsByType: 'Alerts by Type',
      alertsBySeverity: 'Alerts by Severity',
      alertsByCamera: 'Alerts by Camera',
      alertsByHour: 'Alerts by Hour',
      alertsByDay: 'Alerts by Day',
      peopleCounting: 'People Counting',
      cameraUptime: 'Camera Uptime',
      averageResponseTime: 'Average Response Time',
      detectionAccuracy: 'Detection Accuracy',
      exportReport: 'Export Report',
      generateReport: 'Generate Report',
      dateRange: 'Date Range',
      today: 'Today',
      yesterday: 'Yesterday',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      custom: 'Custom',
    },

    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Configure the system according to your needs',
      general: 'General',
      notifications: 'Notifications',
      analysis: 'AI Analysis',
      faceRecognition: 'Face Recognition',
      security: 'Security',
      storage: 'Storage',
      integrations: 'Integrations',
      systemName: 'System Name',
      timezone: 'Timezone',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemMode: 'System Default',
      soundEnabled: 'Sound Enabled',
      autoRefresh: 'Auto Refresh',
      refreshInterval: 'Refresh Interval',
      emailNotifications: 'Email Notifications',
      whatsappNotifications: 'WhatsApp Notifications',
      pushNotifications: 'Push Notifications',
      webhookNotifications: 'Webhook Notifications',
      saveSettings: 'Save Settings',
      resetSettings: 'Reset to Defaults',
      settingsSaved: 'Settings saved successfully!',
      settingsError: 'Error saving settings',
    },

    // Error messages
    errors: {
      generic: 'An error occurred. Please try again.',
      networkError: 'Connection error. Check your internet.',
      unauthorized: 'Unauthorized access.',
      notFound: 'Resource not found.',
      validationError: 'Invalid data. Check the fields.',
      serverError: 'Server error. Please try again later.',
      sessionExpired: 'Session expired. Please login again.',
      cameraOffline: 'Camera offline or unreachable.',
      streamError: 'Error loading video stream.',
      facesNotLoaded: 'Error loading recognition models.',
    },

    // Success messages
    success: {
      saved: 'Saved successfully!',
      deleted: 'Deleted successfully!',
      updated: 'Updated successfully!',
      created: 'Created successfully!',
      copied: 'Copied to clipboard!',
      exported: 'Exported successfully!',
      imported: 'Imported successfully!',
    },

    // Formatting
    format: {
      dateShort: 'MM/dd/yyyy',
      dateLong: 'MMMM dd, yyyy',
      timeShort: 'h:mm a',
      timeLong: 'h:mm:ss a',
      dateTime: 'MM/dd/yyyy h:mm a',
      currency: '$',
      decimal: '.',
      thousands: ',',
    },

    // Plurals
    plurals: {
      camera: {
        one: '{{count}} camera',
        other: '{{count}} cameras',
      },
      alert: {
        one: '{{count}} alert',
        other: '{{count}} alerts',
      },
      person: {
        one: '{{count}} person',
        other: '{{count}} people',
      },
      recording: {
        one: '{{count}} recording',
        other: '{{count}} recordings',
      },
      minute: {
        one: '{{count}} minute',
        other: '{{count}} minutes',
      },
      hour: {
        one: '{{count}} hour',
        other: '{{count}} hours',
      },
      day: {
        one: '{{count}} day',
        other: '{{count}} days',
      },
    },
  },

  'es-ES': {
    nav: {
      dashboard: 'Panel',
      cameras: 'Cámaras',
      alerts: 'Alertas',
      recordings: 'Grabaciones',
      people: 'Personas',
      recognition: 'Reconocimiento',
      recognitionLogs: 'Registros de Reconocimiento',
      zones: 'Zonas',
      plates: 'Matrículas',
      analytics: 'Analíticas',
      security: 'Seguridad',
      settings: 'Configuración',
      reports: 'Informes',
      heatmap: 'Mapa de Calor',
    },
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Añadir',
      search: 'Buscar',
      filter: 'Filtrar',
      refresh: 'Actualizar',
      export: 'Exportar',
      import: 'Importar',
      close: 'Cerrar',
      confirm: 'Confirmar',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      yes: 'Sí',
      no: 'No',
      all: 'Todos',
      none: 'Ninguno',
      select: 'Seleccionar',
      actions: 'Acciones',
      status: 'Estado',
      name: 'Nombre',
      description: 'Descripción',
      date: 'Fecha',
      time: 'Hora',
      type: 'Tipo',
      details: 'Detalles',
      more: 'Más',
      less: 'Menos',
      view: 'Ver',
      download: 'Descargar',
      upload: 'Subir',
      copy: 'Copiar',
      copied: '¡Copiado!',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
    },
    status: {
      online: 'En línea',
      offline: 'Desconectado',
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      recording: 'Grabando',
      paused: 'Pausado',
      stopped: 'Detenido',
    },
    dashboard: {
      title: 'Panel',
      subtitle: 'Visión general del sistema de vigilancia',
      totalCameras: 'Total de Cámaras',
      onlineCameras: 'Cámaras En Línea',
      offlineCameras: 'Cámaras Desconectadas',
      alertsToday: 'Alertas Hoy',
      peopleDetected: 'Personas Detectadas',
      activeZones: 'Zonas Activas',
      storageUsed: 'Almacenamiento Usado',
      systemHealth: 'Estado del Sistema',
      recentAlerts: 'Alertas Recientes',
      cameraGrid: 'Cuadrícula de Cámaras',
      liveView: 'Vista en Vivo',
      noAlerts: 'Sin alertas recientes',
      viewAll: 'Ver todas',
    },
    format: {
      dateShort: 'dd/MM/yyyy',
      dateLong: "dd 'de' MMMM 'de' yyyy",
      timeShort: 'HH:mm',
      timeLong: 'HH:mm:ss',
      dateTime: 'dd/MM/yyyy HH:mm',
      currency: '€',
      decimal: ',',
      thousands: '.',
    },
    plurals: {
      camera: {
        one: '{{count}} cámara',
        other: '{{count}} cámaras',
      },
      alert: {
        one: '{{count}} alerta',
        other: '{{count}} alertas',
      },
      person: {
        one: '{{count}} persona',
        other: '{{count}} personas',
      },
    },
  },
};

// ============================================
// CONTEXT
// ============================================

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
  tp: (key: string, count: number, params?: TranslationParams) => string;
  formatDate: (date: Date | string, format?: string) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number) => string;
  availableLocales: SupportedLocale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: SupportedLocale;
}

export function I18nProvider({ children, defaultLocale = 'pt-BR' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const saved = localStorage.getItem('visao-locale');
    return (saved as SupportedLocale) || defaultLocale;
  });

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('visao-locale', newLocale);
    document.documentElement.lang = newLocale.split('-')[0];
  }, []);

  // Traduzir chave
  const t = useCallback((key: string, params?: TranslationParams): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback para pt-BR
        value = translations['pt-BR'];
        for (const fk of keys) {
          value = value?.[fk];
          if (value === undefined) break;
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`[i18n] Missing translation: ${key}`);
      return key;
    }

    // Interpolação
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => 
        String(params[paramKey] ?? `{{${paramKey}}}`)
      );
    }

    return value;
  }, [locale]);

  // Traduzir com pluralização
  const tp = useCallback((key: string, count: number, params?: TranslationParams): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (!value || typeof value !== 'object') {
      return t(key, { ...params, count });
    }

    const pluralForm = count === 1 ? 'one' : 'other';
    const template = value[pluralForm] || value.other || '';

    return template.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
      if (paramKey === 'count') return String(count);
      return String(params?.[paramKey] ?? `{{${paramKey}}}`);
    });
  }, [locale, t]);

  // Formatar data
  const formatDate = useCallback((date: Date | string, format?: string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      dateStyle: format === 'long' ? 'long' : 'short',
      timeStyle: format?.includes('time') ? 'short' : undefined,
    }).format(d);
  }, [locale]);

  // Formatar número
  const formatNumber = useCallback((num: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, options).format(num);
  }, [locale]);

  // Formatar moeda
  const formatCurrency = useCallback((amount: number): string => {
    const currency = locale === 'en-US' ? 'USD' : locale === 'es-ES' ? 'EUR' : 'BRL';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }, [locale]);

  // Definir lang do documento
  useEffect(() => {
    document.documentElement.lang = locale.split('-')[0];
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    tp,
    formatDate,
    formatNumber,
    formatCurrency,
    availableLocales: ['pt-BR', 'en-US', 'es-ES'],
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useI18n() {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  
  return context;
}

// ============================================
// EXPORTS
// ============================================

export { translations };
export default useI18n;
