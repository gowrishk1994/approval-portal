import nodemailer from 'nodemailer';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function createNotificationService({
  env = process.env,
  logger = console,
  createTransport = nodemailer.createTransport,
} = {}) {
  const smtpHost = env.SMTP_HOST;
  const smtpPort = Number(env.SMTP_PORT || 587);
  const transporter = smtpHost
    ? createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    })
    : null;

  return {
    async send({ type, to, workflowId, projectName }) {
      const signatureRequested = type === 'signature-request';
      const subject = `Please sign: ${projectName}`
      const actionText = 'Your project has been approved. Review the documents and sign to complete the workflow.'
      const appUrl = env.APP_URL || 'http://localhost:5173';
      const signatureUrl = new URL('/', appUrl);
      signatureUrl.searchParams.set('workflow', workflowId);
      signatureUrl.searchParams.set('action', 'sign');
      const actionUrl = signatureRequested ? signatureUrl.toString() : appUrl;
      const actionLabel = signatureRequested ? 'Review and sign the document' : 'Open portal';
      const safeProjectName = escapeHtml(projectName);
      const safeWorkflowId = escapeHtml(workflowId);
      const safeActionUrl = escapeHtml(actionUrl);
      const text = [
        'Hello,',
        '',
        actionText,
        `Project: ${projectName}`,
        `Workflow ID: ${workflowId}`,
        `${actionLabel}: ${actionUrl}`
      ].join('\n');

      if (!transporter) {
        logger.info(`[notification] mode=local-log type=${type} to=${to} workflow=${workflowId}`);
        return { delivered: false, mode: 'local-log' };
      }

      await transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject,
        text,
        html: `<p>Hello,</p><p>${escapeHtml(actionText)}</p><p><strong>Project:</strong> ${safeProjectName}<br/><strong>Workflow ID:</strong> ${safeWorkflowId}</p><p><a href="${safeActionUrl}">${actionLabel}</a></p><p>Regards,<br/>Approval Portal</p>`,
      });
      return { delivered: true, mode: 'smtp' };
    },
  };
}
