// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [],
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000'
    }
  },

  app: {
    head: {
      title: 'Folder Structure App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/icon?family=Material+Icons'
        }
      ]
    }
  },

  compatibilityDate: '2025-01-22'
})