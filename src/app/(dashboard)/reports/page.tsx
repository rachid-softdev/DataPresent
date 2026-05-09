import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t('reports.empty')}</p>
          <Link href="/new">
            <Button>{t('reports.uploadData')}</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">{t('reports.columns.name')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Secteur</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">{t('reports.columns.status')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">{t('reports.columns.date')}</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4">{report.title}</td>
                  <td className="px-6 py-4">{report.sector}</td>
                  <td className="px-6 py-4">
                    <Badge variant={report.status === 'DONE' ? 'success' : report.status === 'ERROR' ? 'error' : 'warning'}>
                      {t(`reports.status.${report.status.toLowerCase()}`)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
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