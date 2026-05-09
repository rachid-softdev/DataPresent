import fs from 'fs'
import path from 'path'

type TemplateData = Record<string, string>

const TEMPLATE_DIR = path.join(process.cwd(), 'src', 'lib', 'email-templates')

function loadTemplate(templateName: string): string {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`)
  return fs.readFileSync(templatePath, 'utf-8')
}

function renderTemplate(template: string, data: TemplateData): string {
  let result = template

  result = result.replace(/\{\{year\}\}/g, new Date().getFullYear().toString())

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }

  const unusedPlaceholders = result.match(/\{\{[^}]+\}\}/g)
  if (unusedPlaceholders) {
    console.warn('Unused template variables:', unusedPlaceholders)
  }

  return result
}

export function getEmailTemplate(templateName: string, data: TemplateData): string {
  const template = loadTemplate(templateName)
  return renderTemplate(template, data)
}

export const emailConfig = {
  magicLink: {
    subject: '🔗 Connectez-vous à DataPresent',
    requiredData: ['title', 'subtitle', 'actionUrl', 'actionLabel', 'linkText', 'expiryMinutes', 'infoLabel', 'securityNote', 'footerText'],
  },
  welcome: {
    subject: '🚀 Bienvenue sur DataPresent !',
    requiredData: ['emoji', 'title', 'subtitle', 'creditsLabel', 'creditsAmount', 'feature1Icon', 'feature1Title', 'feature1Desc', 'feature2Icon', 'feature2Title', 'feature2Desc', 'feature3Icon', 'feature3Title', 'feature3Desc', 'actionUrl', 'actionLabel', 'linkText', 'footerText'],
  },
}