import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'
import { ReportsPoller } from '@/components/reports/ReportsPoller'

const PAGE_SIZE = 20

interface ReportsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const t = await getTranslations()
  const { page: pageParam } = await searchParams
  const page = parseInt(pageParam || '1', 10)
  const skip = (page - 1) * PAGE_SIZE

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Get user with org and reports
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              reports: {
                orderBy: { createdAt: 'desc' },
                take: PAGE_SIZE,
                skip: skip,
              },
            },
          },
        },
      },
    },
  })

  const org = user?.membership[0]?.org
  const reports = org?.reports || []

  // Get total count for pagination
  const totalReports = await prisma.report.count({
    where: { orgId: org?.id },
  })

  const totalPages = Math.ceil(totalReports / PAGE_SIZE)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div>
      <ReportsPoller reports={reports.map(r => ({ id: r.id, status: r.status }))} />
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{t('reports.title')}</h1>
        </div>
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
        <>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{t('reports.columns.name')}</th>
                  <th>Secteur</th>
                  <th>{t('reports.columns.status')}</th>
                  <th>{t('reports.columns.date')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-medium">{report.title}</td>
                    <td className="text-muted-foreground">{report.sector}</td>
                    <td>
                      <Badge
                        variant={
                          report.status === 'DONE'
                            ? 'success'
                            : report.status === 'ERROR'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {t(`reports.status.${report.status.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <Link href={`/reports/${report.id}`}>
                        <Button size="sm">{t('common.seeAll')}</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="app-pagination">
              <div className="app-pagination-info">
                Affichage de {(page - 1) * PAGE_SIZE + 1} à{' '}
                {Math.min(page * PAGE_SIZE, totalReports)} sur {totalReports} rapports
              </div>
              <div className="app-pagination-actions">
                <Link href={hasPrevPage ? `?page=${page - 1}` : '#'}>
                  <Button variant="outline" size="sm" disabled={!hasPrevPage}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} sur {totalPages}
                </span>
                <Link href={hasNextPage ? `?page=${page + 1}` : '#'}>
                  <Button variant="outline" size="sm" disabled={!hasNextPage}>
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
