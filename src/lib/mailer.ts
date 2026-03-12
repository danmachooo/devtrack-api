import nodemailer from 'nodemailer'

import { logger } from '@/core/logger/logger'

type InvitationEmailInput = {
  invitationId: string
  email: string
  organizationName: string
  inviterEmail: string
  role: string
}

const getMailerConfig = () => {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

  if (!host || !port || !user || !pass || !from) {
    return null
  }

  return {
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from
  }
}

const createInvitationEmailHtml = (
  input: InvitationEmailInput,
  acceptUrl: string
): string => {
  return `
    <p>You have been invited to join <strong>${input.organizationName}</strong> on DevTrack.</p>
    <p>Invited by: ${input.inviterEmail}</p>
    <p>Role: ${input.role}</p>
    <p>Accept the invitation by opening this link:</p>
    <p><a href="${acceptUrl}">${acceptUrl}</a></p>
  `
}

export const sendOrganizationInvitationEmail = async (
  input: InvitationEmailInput
): Promise<void> => {
  const mailerConfig = getMailerConfig()

  if (!mailerConfig) {
    logger.warn('SMTP configuration is incomplete. Invitation email was not sent.', {
      email: input.email,
      invitationId: input.invitationId
    })
    return
  }

  const transport = nodemailer.createTransport({
    host: mailerConfig.host,
    port: mailerConfig.port,
    secure: mailerConfig.secure,
    auth: {
      user: mailerConfig.user,
      pass: mailerConfig.pass
    }
  })

  const frontendUrl = process.env.FRONTEND_URL ?? ''
  const acceptUrl = `${frontendUrl}/organization/accept-invitation?id=${input.invitationId}`

  await transport.sendMail({
    from: mailerConfig.from,
    to: input.email,
    subject: `Invitation to join ${input.organizationName} on DevTrack`,
    text: [
      `You have been invited to join ${input.organizationName} on DevTrack.`,
      `Invited by: ${input.inviterEmail}`,
      `Role: ${input.role}`,
      `Accept the invitation: ${acceptUrl}`
    ].join('\n'),
    html: createInvitationEmailHtml(input, acceptUrl)
  })
}
