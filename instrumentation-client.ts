import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://8e8dd1fa2b050ee59f7adf73f0e2f05e@o4511133792272384.ingest.de.sentry.io/4511133804331088',
  tunnel: '/api/sentry-tunnel',
  tracesSampleRate: 1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration(),
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
