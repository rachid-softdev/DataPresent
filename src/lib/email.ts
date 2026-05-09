import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { getEmailTemplate, emailConfig } from './email-templates'

const isDev = process.env.NODE_ENV === 'development'
const emailFrom = process.env.EMAIL_FROM || 'DataPresent <noreply@datapresent.com>'
const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

let resend: Resend | null = null
let transporter: nodemailer.Transporter | null = null

if (!isDev && process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

if (isDev && process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '2525'),
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  if (isDev && transporter) {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      html,
    })
    return info
  } else if (!isDev && resend) {
    return resend.emails.send({
      from: emailFrom,
      to,
      subject,
      html,
    })
  } else if (isDev) {
    return { id: 'dev-mode', message: 'Email logged to console' }
  } else {
    throw new Error('Email provider not configured')
  }
}

export async function sendMagicLinkEmail(to: string, magicLink: string) {
  const config = emailConfig.magicLink
  const html = getEmailTemplate('magic-link', {
    title: 'Connexion à DataPresent',
    subtitle: 'Cliquez sur le bouton ci-dessous pour vous connecter instantanément à votre compte.',
    actionUrl: magicLink,
    actionLabel: 'Se connecter à DataPresent',
    linkText: 'Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :',
    expiryMinutes: '10',
    infoLabel: 'Sécurité',
    securityNote: 'Ce lien est personnel et usage unique. Il expire dans 10 minutes. Si vous n\'avez pas demandé ce lien, vous pouvez ignorer cet email.',
    footerText: 'Vous avez reçu cet email car vous avez demandé une connexion par lien magique.',
  })

  return sendEmail(to, config.subject, html)
}

export async function sendWelcomeEmail(to: string, name: string) {
  const config = emailConfig.welcome
  const html = getEmailTemplate('welcome', {
    emoji: '🎉',
    title: 'Bienvenue sur DataPresent !',
    subtitle: `Bonjour ${name}, nous sommes ravis de vous avoir parmi nous !`,
    creditsLabel: 'Vos crédits gratuits',
    creditsAmount: '35',
    feature1Icon: '📊',
    feature1Title: 'Importez vos données',
    feature1Desc: 'Excel, CSV, PDF ou Google Sheets - nous supportons tous les formats.',
    feature2Icon: '🤖',
    feature2Title: 'Générez avec l\'IA',
    feature2Desc: 'Notre IA transforme vos données en présentation professionnelle en quelques secondes.',
    feature3Icon: '📄',
    feature3Title: 'Exportez partout',
    feature3Desc: 'PPT, PDF ou DOCX - utilisez vos présentations où vous voulez.',
    actionUrl: appUrl,
    actionLabel: 'Commencer maintenant',
    linkText: 'Prêt à transformer vos données ?',
    footerText: 'Questions ? Répondez à cet email, notre équipe vous répondra avec plaisir.',
  })

  return sendEmail(to, config.subject, html)
}