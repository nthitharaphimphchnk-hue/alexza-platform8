import { logger } from "../utils/logger";

export default async function sendTestAlertImpl(message: string): Promise<void> {
  const slackUrl = process.env.ALERT_SLACK_WEBHOOK_URL?.trim() || "";
  const discordUrl = process.env.ALERT_DISCORD_WEBHOOK_URL?.trim() || "";
  const emailTo = process.env.ALERT_EMAIL_TO?.trim() || "";

  const tasks: Promise<void>[] = [];

  if (slackUrl) {
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      }).then(
        () => {},
        (err) => {
          logger.error({ err: String(err) }, "[Alerts] Slack webhook failed (test)");
        }
      )
    );
  }

  if (discordUrl) {
    tasks.push(
      fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      }).then(
        () => {},
        (err) => {
          logger.error({ err: String(err) }, "[Alerts] Discord webhook failed (test)");
        }
      )
    );
  }

  if (emailTo) {
    tasks.push(
      (async () => {
        try {
          const { getEmailProvider } = await import("../notifications");
          const emailProvider = getEmailProvider();
          await emailProvider.send({
            to: emailTo,
            subject: "[ALEXZA] Test alert",
            text: message,
            html: `<pre>${message}</pre>`,
          });
        } catch (err) {
          logger.error({ err: String(err) }, "[Alerts] Email alert failed (test)");
        }
      })()
    );
  }

  if (tasks.length === 0) {
    logger.warn("[Alerts] No alert destinations configured for test alert");
    return;
  }

  await Promise.all(tasks);
}

