/**
 * Página de Acesso Negado
 * Rota: /acesso-negado
 */

import { AccessDenied } from '@/components/AccessDenied';
import { useNavigate } from 'react-router-dom';

const AcessoNegadoPage = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    // Tentar voltar para a página anterior ou home
    navigate(-1);
  };

  return (
    <AccessDenied
      showContactInfo={true}
      showRetryButton={true}
      onRetry={handleRetry}
    />
  );
};

export default AcessoNegadoPage;
