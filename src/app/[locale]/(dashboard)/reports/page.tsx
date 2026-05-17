import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'

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
        <>
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t('reports.columns.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Secteur
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t('reports.columns.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t('reports.columns.date')}
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{report.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{report.sector}</td>
                    <td className="px-6 py-4">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Affichage de {(page - 1) * PAGE_SIZE + 1} à{' '}
                {Math.min(page * PAGE_SIZE, totalReports)} sur {totalReports} rapports
              </div>
              <div className="flex items-center gap-2">
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
