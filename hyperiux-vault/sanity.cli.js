import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'qrtsgg7p',
    dataset: 'production'
  },
  deployment: {
    appId: 'br8l6a6ucf3dbi2mdh8n76vd',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  /**
   * The schema worker bundles with `ssr.noExternal: true`, which inlines every
   * dependency into one ESM bundle. `lexorank` (pulled in by
   * @sanity/orderable-document-list) is CommonJS and assigns to a bare
   * `exports`, which does not exist in that context - so schema extract/deploy
   * failed with "exports is not defined". Keeping it external leaves it as CJS
   * and the worker loads it fine.
   */
  vite: (config) => ({
    ...config,
    ssr: {...config.ssr, noExternal: true, external: ['lexorank']},
  }),
})
