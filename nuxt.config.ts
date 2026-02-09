// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@pinia/nuxt'
  ],
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  },
  image: {
    imagekit: {
      baseURL: process.env.IMAGEKIT_URL_ENDPOINT
    }
  },
  runtimeConfig: {
    imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY, // Hanya tersedia di server
    public: {
      imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    }
  }
})