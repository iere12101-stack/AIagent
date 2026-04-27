export const PIPELINE_VERSION = 'aya-pipeline-v2026-04-24b'

export const BUILD_ID =
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  process.env.RENDER_GIT_COMMIT ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.npm_package_version ??
  'local-dev'

export function buildRuntimeFingerprint(port: number, connectedDeviceIds: string[]) {
  return {
    pipelineVersion: PIPELINE_VERSION,
    buildId: BUILD_ID,
    port,
    connectedDeviceIds,
  }
}
