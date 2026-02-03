import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, MessageSquare, BarChart3 } from 'lucide-react';
import dealexpressLogo from '@/assets/dealexpress-logo.png';

const features = [
  {
    icon: Zap,
    title: 'Geração Rápida',
    description: 'Crie propostas profissionais em minutos, não horas.',
  },
  {
    icon: MessageSquare,
    title: 'Envio via WhatsApp',
    description: 'Envie propostas diretamente para seus clientes.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Completos',
    description: 'Acompanhe métricas e performance da equipe.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    description: 'Seus dados protegidos com criptografia avançada.',
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={dealexpressLogo} alt="DealExpress" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold">DealExpress</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-gradient-primary shadow-primary hover:opacity-90">
              <Link to="/register">
                Começar Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-50" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Automatize suas propostas comerciais
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Gere propostas em{' '}
              <span className="text-gradient">minutos</span>,
              <br />
              não em horas.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              DealExpress é a plataforma completa para criar, gerenciar e enviar propostas
              comerciais profissionais via WhatsApp. Simples, rápido e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-gradient-primary shadow-primary hover:opacity-90 h-12 px-8 text-base"
              >
                <Link to="/login">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link to="/login">Ver Demo</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
      </section>

      {/* Features */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar todo o ciclo de vendas, desde a cotação até o
              fechamento.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-gradient-surface border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-gradient-hero rounded-3xl p-12 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 pattern-dots opacity-10" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pronto para acelerar suas vendas?
              </h2>
              <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
                Junte-se a centenas de empresas que já automatizaram suas propostas comerciais.
              </p>
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="h-12 px-8 text-base font-semibold"
              >
                <Link to="/login">
                  Começar Gratuitamente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={dealexpressLogo} alt="DealExpress" className="w-8 h-8 object-contain" />
              <span className="font-bold">DealExpress</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 DealExpress. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
