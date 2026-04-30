import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AppHeader } from '@/components/AppHeader'

export default function Index() {
  const { user } = useAuth()

  return (
    <>
      <AppHeader />
      <div className="p-8 max-w-5xl mx-auto w-full animate-fade-in">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-8">
          Bem-vindo, {user?.name.split(' ')[0]}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/boards" className="block h-full">
            <Card className="border-border/60 hover-scale shadow-subtle cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg">Quadros</CardTitle>
                <CardDescription>Seus quadros de processos e campanhas.</CardDescription>
              </CardHeader>
              <CardContent className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20">
                <p className="text-muted-foreground text-sm font-medium">
                  Os quadros aparecerão aqui em breve.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-border/60 hover-scale shadow-subtle cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Atividades Recentes</CardTitle>
              <CardDescription>O que precisa da sua atenção hoje.</CardDescription>
            </CardHeader>
            <CardContent className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20">
              <p className="text-muted-foreground text-sm font-medium">
                Nenhuma atividade pendente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
