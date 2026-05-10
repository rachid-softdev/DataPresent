import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSpreadsheet } from 'lucide-react'

export default async function ReportsPage() {
  const t = await getTranslations()
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { reports: { orderBy: { createdAt: 'desc' } } } } } } },
  })

  const reports = user?.membership[0]?.org?.reports || []

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <Link href="/new">
          <Button>{t('reports.new')}</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t('reports.empty')}
          description={t('reports.uploadData')}
          action={{ label: t('reports.new'), href: '/new' }}
        />
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">{t('reports.columns.name')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Secteur</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">{t('reports.columns.status')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">{t('reports.columns.date')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{report.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{report.sector}</td>
                  <td className="px-6 py-4">
                    <Badge variant={report.status === 'DONE' ? 'success' : report.status === 'ERROR' ? 'error' : 'warning'}>
                      {t(`reports.status.${report.status.toLowerCase()}`)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/reports/${report.id}`}>
                      <Button size="sm">{t('common.seeAll')}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
