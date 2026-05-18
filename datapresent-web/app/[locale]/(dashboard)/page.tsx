import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureUserHasOrganization } from '@/lib/org'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { UsageCard } from '@/components/usage/UsageCard'
import { PlusCircle } from 'lucide-react'

export default async function DashboardPage() {
  const t = await getTranslations()
  const session = await auth()
  
  if (!session?.user?.id) redirect('/login')

  await ensureUserHasOrganization(session.user.id, session.user.email || '')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { reports: { orderBy: { createdAt: 'desc' }, take: 5 } } } } } },
  })

  const reports = user?.membership[0]?.org?.reports || []

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.recentReports')}</h1>
        <Link href="/new">
          <Button data-onboarding="new-report">{t('dashboard.newReport')}</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
          {reports.length === 0 ? (
            <EmptyState
              icon={PlusCircle}
              title={t('dashboard.noReports')}
              description={t('dashboard.noReportsDesc')}
              action={{ label: t('dashboard.newReport'), href: '/new' }}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.status === 'DONE' ? 'success' : report.status === 'ERROR' ? 'error' : 'warning'}>
                          {t(`reports.status.${report.status.toLowerCase()}`)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{report.sector}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <UsageCard />
        </div>
      </div>
    </div>
  )
}