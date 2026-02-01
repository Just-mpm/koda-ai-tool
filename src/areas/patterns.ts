/**
 * Padrões de detecção automática de áreas
 *
 * Define regras GENÉRICAS para detectar áreas baseado em:
 * - Padrões de pasta (glob)
 * - Keywords no nome do arquivo
 *
 * IMPORTANTE: Estes padrões são usados apenas quando autoDetect: true
 * Para projetos específicos, use areas.config.json com autoDetect: false
 *
 * Suporta múltiplos frameworks:
 * - Next.js (App Router e Pages Router)
 * - Vite (React, Vue)
 * - Create React App
 * - Remix
 * - Nuxt
 * - SvelteKit
 * - Astro
 */

/**
 * Padrões de pasta → área
 * Ordem importa: mais específico primeiro
 *
 * NOTA: Apenas padrões genéricos que funcionam em qualquer projeto
 * Evitar padrões específicos de domínio (ex: pets, veterinary, etc)
 */
export const FOLDER_PATTERNS: Array<{ pattern: RegExp; area: string; priority: number }> = [
  // ============================================================================
  // NEXT.JS APP ROUTER - Rotas genéricas (alta prioridade)
  // ============================================================================
  { pattern: /app\/.*\/dashboard\//, area: "dashboard", priority: 100 },
  { pattern: /app\/.*\/admin\//, area: "admin", priority: 100 },
  { pattern: /app\/.*\/login\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/cadastro\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/signup\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/register\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/auth\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/perfil\//, area: "profile", priority: 100 },
  { pattern: /app\/.*\/profile\//, area: "profile", priority: 100 },
  { pattern: /app\/.*\/configuracoes\//, area: "settings", priority: 100 },
  { pattern: /app\/.*\/settings\//, area: "settings", priority: 100 },
  { pattern: /app\/.*\/onboarding/, area: "onboarding", priority: 100 },
  { pattern: /app\/.*\/precos\//, area: "pricing", priority: 100 },
  { pattern: /app\/.*\/pricing\//, area: "pricing", priority: 100 },
  { pattern: /app\/.*\/checkout\//, area: "checkout", priority: 100 },
  { pattern: /app\/.*\/cart\//, area: "cart", priority: 100 },
  { pattern: /app\/.*\/shop\//, area: "shop", priority: 100 },
  { pattern: /app\/.*\/products\//, area: "products", priority: 100 },
  { pattern: /app\/.*\/orders\//, area: "orders", priority: 100 },
  { pattern: /app\/.*\/blog\//, area: "blog", priority: 100 },
  { pattern: /app\/.*\/docs\//, area: "docs", priority: 100 },
  { pattern: /app\/.*\/legal\//, area: "legal", priority: 100 },
  { pattern: /app\/.*\/privacy\//, area: "legal", priority: 100 },
  { pattern: /app\/.*\/terms\//, area: "legal", priority: 100 },
  { pattern: /app\/.*\/about\//, area: "about", priority: 100 },
  { pattern: /app\/.*\/contact\//, area: "contact", priority: 100 },
  { pattern: /app\/.*\/faq\//, area: "faq", priority: 100 },
  { pattern: /app\/.*\/help\//, area: "help", priority: 100 },
  { pattern: /app\/.*\/support\//, area: "support", priority: 100 },

  // ============================================================================
  // VITE / CRA - src/pages/ ou src/views/ (alta prioridade)
  // ============================================================================
  { pattern: /src\/pages\/[Dd]ashboard/, area: "dashboard", priority: 100 },
  { pattern: /src\/pages\/[Aa]dmin/, area: "admin", priority: 100 },
  { pattern: /src\/pages\/[Aa]uth/, area: "auth", priority: 100 },
  { pattern: /src\/pages\/[Ll]ogin/, area: "auth", priority: 100 },
  { pattern: /src\/pages\/[Rr]egister/, area: "auth", priority: 100 },
  { pattern: /src\/pages\/[Ss]ignup/, area: "auth", priority: 100 },
  { pattern: /src\/pages\/[Pp]rofile/, area: "profile", priority: 100 },
  { pattern: /src\/pages\/[Ss]ettings/, area: "settings", priority: 100 },
  { pattern: /src\/pages\/[Pp]ricing/, area: "pricing", priority: 100 },
  { pattern: /src\/pages\/[Cc]heckout/, area: "checkout", priority: 100 },
  { pattern: /src\/pages\/[Cc]art/, area: "cart", priority: 100 },
  { pattern: /src\/pages\/[Ss]hop/, area: "shop", priority: 100 },
  { pattern: /src\/pages\/[Pp]roducts?/, area: "products", priority: 100 },
  { pattern: /src\/pages\/[Oo]rders?/, area: "orders", priority: 100 },
  { pattern: /src\/pages\/[Bb]log/, area: "blog", priority: 100 },
  { pattern: /src\/views\/[Dd]ashboard/, area: "dashboard", priority: 100 },
  { pattern: /src\/views\/[Aa]dmin/, area: "admin", priority: 100 },
  { pattern: /src\/views\/[Aa]uth/, area: "auth", priority: 100 },

  // ============================================================================
  // REMIX - app/routes/
  // ============================================================================
  { pattern: /app\/routes\/dashboard/, area: "dashboard", priority: 100 },
  { pattern: /app\/routes\/admin/, area: "admin", priority: 100 },
  { pattern: /app\/routes\/auth/, area: "auth", priority: 100 },
  { pattern: /app\/routes\/login/, area: "auth", priority: 100 },
  { pattern: /app\/routes\/_auth/, area: "auth", priority: 100 },

  // ============================================================================
  // NUXT - pages/ (sem src/)
  // ============================================================================
  { pattern: /^pages\/dashboard/, area: "dashboard", priority: 100 },
  { pattern: /^pages\/admin/, area: "admin", priority: 100 },
  { pattern: /^pages\/auth/, area: "auth", priority: 100 },

  // ============================================================================
  // SVELTEKIT - src/routes/
  // ============================================================================
  { pattern: /src\/routes\/dashboard/, area: "dashboard", priority: 100 },
  { pattern: /src\/routes\/admin/, area: "admin", priority: 100 },
  { pattern: /src\/routes\/auth/, area: "auth", priority: 100 },
  { pattern: /src\/routes\/\(auth\)/, area: "auth", priority: 100 },
  { pattern: /src\/routes\/\(app\)/, area: "app", priority: 90 },

  // ============================================================================
  // ASTRO - src/pages/
  // ============================================================================
  { pattern: /src\/pages\/blog/, area: "blog", priority: 100 },
  { pattern: /src\/pages\/docs/, area: "docs", priority: 100 },

  // ============================================================================
  // COMPONENTS - Por subpasta (alta prioridade)
  // Funciona em qualquer framework (com ou sem src/)
  // ============================================================================
  { pattern: /components\/chat\//, area: "chat", priority: 90 },
  { pattern: /components\/auth\//, area: "auth", priority: 90 },
  { pattern: /components\/admin\//, area: "admin", priority: 90 },
  { pattern: /components\/landing\//, area: "landing", priority: 90 },
  { pattern: /components\/marketing\//, area: "landing", priority: 90 },
  { pattern: /components\/dashboard\//, area: "dashboard", priority: 90 },
  { pattern: /components\/subscription\//, area: "billing", priority: 90 },
  { pattern: /components\/stripe\//, area: "billing", priority: 90 },
  { pattern: /components\/payment\//, area: "billing", priority: 90 },
  { pattern: /components\/checkout\//, area: "checkout", priority: 90 },
  { pattern: /components\/cart\//, area: "cart", priority: 90 },
  { pattern: /components\/notification\//, area: "notifications", priority: 90 },
  { pattern: /components\/seo\//, area: "seo", priority: 90 },
  { pattern: /components\/blog\//, area: "blog", priority: 90 },
  { pattern: /components\/docs\//, area: "docs", priority: 90 },
  { pattern: /components\/legal\//, area: "legal", priority: 90 },
  { pattern: /components\/onboarding\//, area: "onboarding", priority: 90 },
  { pattern: /components\/settings\//, area: "settings", priority: 90 },
  { pattern: /components\/profile\//, area: "profile", priority: 90 },
  { pattern: /components\/user\//, area: "user", priority: 90 },
  { pattern: /components\/products?\//, area: "products", priority: 90 },
  { pattern: /components\/orders?\//, area: "orders", priority: 90 },
  { pattern: /components\/shop\//, area: "shop", priority: 90 },
  { pattern: /components\/forms?\//, area: "forms", priority: 85 },
  { pattern: /components\/tables?\//, area: "tables", priority: 85 },
  { pattern: /components\/modals?\//, area: "modals", priority: 85 },
  { pattern: /components\/dialogs?\//, area: "modals", priority: 85 },

  // Componentes compartilhados (baixa prioridade)
  { pattern: /components\/ui\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/common\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/shared\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/base\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/core\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/primitives\//, area: "shared-ui", priority: 30 },
  { pattern: /components\/providers\//, area: "core", priority: 40 },
  { pattern: /components\/layout\//, area: "layout", priority: 40 },
  { pattern: /components\/layouts\//, area: "layout", priority: 40 },

  // ============================================================================
  // FEATURES (padrão comum em projetos maiores)
  // ============================================================================
  { pattern: /features\/auth\//, area: "auth", priority: 95 },
  { pattern: /features\/dashboard\//, area: "dashboard", priority: 95 },
  { pattern: /features\/admin\//, area: "admin", priority: 95 },
  { pattern: /features\/checkout\//, area: "checkout", priority: 95 },
  { pattern: /features\/cart\//, area: "cart", priority: 95 },
  { pattern: /features\/products?\//, area: "products", priority: 95 },
  { pattern: /features\/orders?\//, area: "orders", priority: 95 },
  { pattern: /features\/user\//, area: "user", priority: 95 },
  { pattern: /features\/settings\//, area: "settings", priority: 95 },
  { pattern: /features\/notifications?\//, area: "notifications", priority: 95 },
  { pattern: /features\/blog\//, area: "blog", priority: 95 },

  // ============================================================================
  // MODULES (outro padrão comum)
  // ============================================================================
  { pattern: /modules\/auth\//, area: "auth", priority: 95 },
  { pattern: /modules\/dashboard\//, area: "dashboard", priority: 95 },
  { pattern: /modules\/admin\//, area: "admin", priority: 95 },
  { pattern: /modules\/checkout\//, area: "checkout", priority: 95 },
  { pattern: /modules\/products?\//, area: "products", priority: 95 },

  // ============================================================================
  // LIB - Módulos específicos
  // ============================================================================
  { pattern: /lib\/firebase\//, area: "firebase", priority: 80 },
  { pattern: /lib\/stripe\//, area: "billing", priority: 80 },
  { pattern: /lib\/i18n\//, area: "i18n", priority: 80 },
  { pattern: /lib\/analytics\//, area: "analytics", priority: 80 },

  // ============================================================================
  // HOOKS - Por nome genérico
  // ============================================================================
  { pattern: /hooks\/.*[Aa]uth/, area: "auth", priority: 70 },
  { pattern: /hooks\/.*[Ss]ubscription/, area: "billing", priority: 70 },
  { pattern: /hooks\/.*[Nn]otification/, area: "notifications", priority: 70 },

  // ============================================================================
  // STORE - Por nome genérico
  // ============================================================================
  { pattern: /store\/.*[Aa]uth/, area: "auth", priority: 70 },
  { pattern: /store\/.*[Uu]ser/, area: "user", priority: 70 },

  // ============================================================================
  // CLOUD FUNCTIONS
  // ============================================================================
  { pattern: /functions\/src\//, area: "cloud-functions", priority: 80 },

  // ============================================================================
  // OUTROS
  // ============================================================================
  { pattern: /messages\//, area: "i18n", priority: 60 },
  { pattern: /i18n\//, area: "i18n", priority: 60 },
  { pattern: /locales\//, area: "i18n", priority: 60 },
  { pattern: /public\//, area: "assets", priority: 50 },
  { pattern: /scripts\//, area: "scripts", priority: 50 },
];

/**
 * Keywords no nome do arquivo → área
 *
 * NOTA: Apenas keywords genéricas que não são específicas de domínio
 */
export const KEYWORD_PATTERNS: Array<{ keyword: RegExp; area: string; priority: number }> = [
  // Auth (genérico)
  { keyword: /[Aa]uth(?!or)/, area: "auth", priority: 60 }, // auth mas não author
  { keyword: /[Ll]ogin/, area: "auth", priority: 60 },
  { keyword: /[Rr]egister/, area: "auth", priority: 60 },
  { keyword: /[Ss]ignup/, area: "auth", priority: 60 },
  { keyword: /[Ss]ignin/, area: "auth", priority: 60 },
  { keyword: /[Ss]ignout/, area: "auth", priority: 60 },
  { keyword: /[Ll]ogout/, area: "auth", priority: 60 },

  // Billing/Payments (genérico)
  { keyword: /[Ss]tripe/, area: "billing", priority: 65 },
  { keyword: /[Ss]ubscription/, area: "billing", priority: 60 },
  { keyword: /[Pp]ayment/, area: "billing", priority: 60 },
  { keyword: /[Bb]illing/, area: "billing", priority: 65 },
  { keyword: /[Ii]nvoice/, area: "billing", priority: 60 },

  // Checkout (genérico)
  { keyword: /[Cc]heckout/, area: "checkout", priority: 60 },

  // Pricing (genérico)
  { keyword: /[Pp]ricing/, area: "pricing", priority: 60 },

  // Notifications (genérico)
  { keyword: /[Nn]otification/, area: "notifications", priority: 60 },
  { keyword: /[Ff][Cc][Mm]/, area: "notifications", priority: 65 },

  // i18n (genérico)
  { keyword: /[Ii]18n/, area: "i18n", priority: 60 },
  { keyword: /[Ll]ocale/, area: "i18n", priority: 55 },
  { keyword: /[Tt]ranslat/, area: "i18n", priority: 55 },

  // SEO (genérico)
  { keyword: /[Ss][Ee][Oo]/, area: "seo", priority: 60 },
  { keyword: /[Ss]itemap/, area: "seo", priority: 60 },

  // Analytics (genérico)
  { keyword: /[Aa]nalytics/, area: "analytics", priority: 60 },

  // Admin (genérico)
  { keyword: /[Aa]dmin/, area: "admin", priority: 55 },

  // PWA (genérico)
  { keyword: /[Pp][Ww][Aa]/, area: "pwa", priority: 60 },
  { keyword: /[Ss]ervice[Ww]orker/, area: "pwa", priority: 60 },
  { keyword: /[Mm]anifest/, area: "pwa", priority: 55 },

  // PDF (genérico)
  { keyword: /[Pp]df[Ee]xport/, area: "export", priority: 60 },
  { keyword: /[Dd]ocx[Ee]xport/, area: "export", priority: 60 },
];

/**
 * Nomes amigáveis das áreas (genéricos)
 */
export const AREA_NAMES: Record<string, string> = {
  // Autenticação e usuário
  auth: "Autenticação",
  user: "Usuário",
  profile: "Perfil",
  settings: "Configurações",
  onboarding: "Onboarding",

  // E-commerce / Billing
  billing: "Pagamentos",
  checkout: "Checkout",
  cart: "Carrinho",
  shop: "Loja",
  products: "Produtos",
  orders: "Pedidos",
  pricing: "Preços",

  // Comunicação
  notifications: "Notificações",
  chat: "Chat",
  feedback: "Feedback",
  support: "Suporte",
  help: "Ajuda",
  faq: "FAQ",
  contact: "Contato",

  // Firebase
  firebase: "Firebase",

  // Conteúdo
  blog: "Blog",
  docs: "Documentação",
  legal: "Páginas Legais",
  about: "Sobre",

  // Marketing e SEO
  landing: "Landing Pages",
  seo: "SEO",
  analytics: "Analytics",

  // Admin e Dashboard
  admin: "Admin",
  dashboard: "Dashboard",

  // Técnico
  i18n: "Internacionalização",
  pwa: "PWA",
  export: "Exportação",
  core: "Core",
  layout: "Layout",
  "shared-ui": "UI Compartilhada",
  "cloud-functions": "Cloud Functions",
  assets: "Assets",
  scripts: "Scripts",

  // UI patterns
  forms: "Formulários",
  tables: "Tabelas",
  modals: "Modais",

  // Genéricos
  app: "Aplicação",
};

/**
 * Descrições padrão das áreas (genéricas)
 */
export const AREA_DESCRIPTIONS: Record<string, string> = {
  // Autenticação e usuário
  auth: "Autenticação e gerenciamento de sessão",
  user: "Gerenciamento de dados do usuário",
  profile: "Perfil do usuário",
  settings: "Configurações do usuário",
  onboarding: "Fluxo de onboarding de novos usuários",

  // E-commerce / Billing
  billing: "Sistema de pagamentos e assinaturas",
  checkout: "Fluxo de checkout e finalização",
  cart: "Carrinho de compras",
  shop: "Loja e catálogo",
  products: "Gerenciamento de produtos",
  orders: "Gerenciamento de pedidos",
  pricing: "Página de preços e planos",

  // Comunicação
  notifications: "Sistema de notificações",
  chat: "Sistema de chat e mensagens",
  feedback: "Coleta de feedback",
  support: "Suporte ao cliente",
  help: "Central de ajuda",
  faq: "Perguntas frequentes",
  contact: "Página de contato",

  // Firebase
  firebase: "Configuração e serviços Firebase",

  // Conteúdo
  blog: "Blog e artigos",
  docs: "Documentação e guias",
  legal: "Termos de uso, privacidade e políticas",
  about: "Página sobre",

  // Marketing e SEO
  landing: "Landing pages e marketing",
  seo: "SEO, meta tags e sitemaps",
  analytics: "Analytics e tracking",

  // Admin e Dashboard
  admin: "Painel administrativo",
  dashboard: "Dashboard do usuário",

  // Técnico
  i18n: "Internacionalização e traduções",
  pwa: "Progressive Web App",
  export: "Exportação de documentos",
  core: "Providers e configuração principal",
  layout: "Layout e navegação",
  "shared-ui": "Componentes de UI compartilhados",
  "cloud-functions": "Cloud Functions (serverless)",
  assets: "Assets públicos",
  scripts: "Scripts de automação",

  // UI patterns
  forms: "Componentes de formulário",
  tables: "Componentes de tabela",
  modals: "Modais e dialogs",

  // Genéricos
  app: "Área principal da aplicação",
};
