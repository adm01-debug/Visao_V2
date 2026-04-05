import { useLocation, Link } from "react-router-dom";
import { PageMeta } from '@/components/PageMeta';
import { Shield, Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <PageMeta title="Página Não Encontrada" description="A página solicitada não foi encontrada" />
      
      <motion.div
        className="text-center max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated Shield Icon */}
        <motion.div
          className="relative mx-auto mb-8 w-32 h-32"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="absolute inset-0 bg-primary/10 rounded-3xl rotate-12" />
          <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-6" />
          <div className="relative flex items-center justify-center w-full h-full">
            <Shield className="w-16 h-16 text-primary/60" />
          </div>
          {/* Scanning line effect */}
          <div className="absolute inset-x-4 top-0 h-full overflow-hidden rounded-2xl">
            <motion.div
              className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              animate={{ y: [0, 128, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>

        {/* Error Code */}
        <motion.h1
          className="text-7xl font-bold font-mono tabular-nums text-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          404
        </motion.h1>
        
        <motion.p
          className="text-lg text-muted-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Área não monitorada
        </motion.p>
        
        <motion.p
          className="text-sm text-muted-foreground/70 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          A rota <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{location.pathname}</code> não foi encontrada no sistema.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
            <Link to="/dashboard">
              <Home className="w-4 h-4" />
              Ir para Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
            <Link to="/" onClick={(e) => { e.preventDefault(); window.history.back(); }}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
        </motion.div>

        {/* Footer hint */}
        <motion.p
          className="mt-8 text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Search className="w-3 h-3" />
          Use <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Ctrl+K</kbd> para buscar
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFound;
