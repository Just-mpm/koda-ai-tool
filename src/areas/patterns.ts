/**
 * Padrões de detecção automática de áreas
 *
 * Define regras para detectar áreas baseado em:
 * - Padrões de pasta (glob)
 * - Keywords no nome do arquivo
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
 */
export const FOLDER_PATTERNS: Array<{ pattern: RegExp; area: string; priority: number }> = [
  // ============================================================================
  // NEXT.JS APP ROUTER - Rotas específicas (alta prioridade)
  // ============================================================================
  { pattern: /app\/.*\/meus-pets\//, area: "meus-pets", priority: 100 },
  { pattern: /app\/.*\/pets\//, area: "meus-pets", priority: 100 },
  { pattern: /app\/.*\/consultas\//, area: "consultas-ia", priority: 100 },
  { pattern: /app\/.*\/dashboard\//, area: "dashboard", priority: 100 },
  { pattern: /app\/.*\/admin\//, area: "admin", priority: 100 },
  { pattern: /app\/.*\/assinatura\//, area: "stripe", priority: 100 },
  { pattern: /app\/.*\/guias\//, area: "training", priority: 100 },
  { pattern: /app\/.*\/treino\//, area: "training", priority: 100 },
  { pattern: /app\/.*\/login\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/cadastro\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/auth\//, area: "auth", priority: 100 },
  { pattern: /app\/.*\/perfil\//, area: "profile", priority: 100 },
  { pattern: /app\/.*\/configuracoes\//, area: "settings", priority: 100 },
  { pattern: /app\/.*\/settings\//, area: "settings", priority: 100 },
  { pattern: /app\/.*\/onboarding/, area: "onboarding", priority: 100 },
  { pattern: /app\/.*\/beta\//, area: "beta", priority: 100 },
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
  { pattern: /app\/.*\/feedback\//, area: "feedback", priority: 100 },

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
  { pattern: /components\/pets\//, area: "meus-pets", priority: 90 },
  { pattern: /components\/pet\//, area: "meus-pets", priority: 90 },
  { pattern: /components\/consultation\//, area: "consultas-ia", priority: 90 },
  { pattern: /components\/chat\//, area: "chat", priority: 90 },
  { pattern: /components\/training\//, area: "training", priority: 90 },
  { pattern: /components\/health\//, area: "health-tracking", priority: 90 },
  { pattern: /components\/auth\//, area: "auth", priority: 90 },
  { pattern: /components\/admin\//, area: "admin", priority: 90 },
  { pattern: /components\/landing\//, area: "landing", priority: 90 },
  { pattern: /components\/marketing\//, area: "landing", priority: 90 },
  { pattern: /components\/dashboard\//, area: "dashboard", priority: 90 },
  { pattern: /components\/subscription\//, area: "stripe", priority: 90 },
  { pattern: /components\/stripe\//, area: "stripe", priority: 90 },
  { pattern: /components\/payment\//, area: "payments", priority: 90 },
  { pattern: /components\/checkout\//, area: "checkout", priority: 90 },
  { pattern: /components\/cart\//, area: "cart", priority: 90 },
  { pattern: /components\/notification\//, area: "notifications", priority: 90 },
  { pattern: /components\/pdf\//, area: "pdf", priority: 90 },
  { pattern: /components\/seo\//, area: "seo", priority: 90 },
  { pattern: /components\/blog\//, area: "blog", priority: 90 },
  { pattern: /components\/docs\//, area: "docs", priority: 90 },
  { pattern: /components\/legal\//, area: "legal", priority: 90 },
  { pattern: /components\/feedback\//, area: "feedback", priority: 90 },
  { pattern: /components\/beta\//, area: "beta", priority: 90 },
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
  { pattern: /components\/layout\//, area: "core", priority: 40 },
  { pattern: /components\/layouts\//, area: "core", priority: 40 },

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
  { pattern: /lib\/firebase\/ai\//, area: "firebase-ai", priority: 85 },
  { pattern: /lib\/firebase\/aiExtraction\//, area: "firebase-ai", priority: 85 },
  { pattern: /lib\/firebase\/firestore\//, area: "firebase-firestore", priority: 85 },
  { pattern: /lib\/firebase\/prompts\//, area: "firebase-ai", priority: 85 },
  { pattern: /lib\/firebase\/analytics\//, area: "analytics", priority: 85 },
  { pattern: /lib\/firebase\//, area: "firebase-core", priority: 80 },
  { pattern: /lib\/stripe\//, area: "stripe", priority: 80 },
  { pattern: /lib\/i18n\//, area: "i18n", priority: 80 },

  // ============================================================================
  // HOOKS - Por nome
  // ============================================================================
  { pattern: /hooks\/.*[Pp]et/, area: "meus-pets", priority: 70 },
  { pattern: /hooks\/.*[Aa]uth/, area: "auth", priority: 70 },
  { pattern: /hooks\/.*[Ss]ubscription/, area: "stripe", priority: 70 },
  { pattern: /hooks\/.*[Nn]otification/, area: "notifications", priority: 70 },
  { pattern: /hooks\/.*[Hh]ealth/, area: "health-tracking", priority: 70 },
  { pattern: /hooks\/.*[Tt]raining/, area: "training", priority: 70 },

  // ============================================================================
  // STORE - Por nome
  // ============================================================================
  { pattern: /store\/.*[Pp]et/, area: "meus-pets", priority: 70 },
  { pattern: /store\/.*[Aa]uth/, area: "auth", priority: 70 },
  { pattern: /store\/.*[Uu]ser/, area: "auth", priority: 70 },

  // ============================================================================
  // SCHEMAS - Por nome
  // ============================================================================
  { pattern: /schemas\/.*[Pp]et/, area: "meus-pets", priority: 70 },
  { pattern: /schemas\/.*[Aa]uth/, area: "auth", priority: 70 },

  // ============================================================================
  // TYPES - Por nome
  // ============================================================================
  { pattern: /types\/.*[Pp]et/, area: "meus-pets", priority: 70 },
  { pattern: /types\/.*[Aa]uth/, area: "auth", priority: 70 },
  { pattern: /types\/.*[Ss]tripe/, area: "stripe", priority: 70 },
  { pattern: /types\/.*[Ss]ubscription/, area: "stripe", priority: 70 },

  // ============================================================================
  // CLOUD FUNCTIONS
  // ============================================================================
  { pattern: /functions\/src\//, area: "cloud-functions", priority: 80 },

  // ============================================================================
  // OUTROS
  // ============================================================================
  { pattern: /messages\//, area: "i18n", priority: 60 },
  { pattern: /i18n\//, area: "i18n", priority: 60 },
  { pattern: /public\//, area: "assets", priority: 50 },
  { pattern: /scripts\//, area: "scripts", priority: 50 },
];

/**
 * Keywords no nome do arquivo → área
 */
export const KEYWORD_PATTERNS: Array<{ keyword: RegExp; area: string; priority: number }> = [
  // Pets
  { keyword: /[Pp]et/, area: "meus-pets", priority: 60 },
  { keyword: /[Vv]accin/, area: "meus-pets", priority: 60 },
  { keyword: /[Dd]eworm/, area: "meus-pets", priority: 60 },
  { keyword: /[Mm]edication/, area: "meus-pets", priority: 60 },
  { keyword: /[Ss]urgery/, area: "meus-pets", priority: 60 },
  { keyword: /[Vv]eterinary/, area: "meus-pets", priority: 60 },

  // Consultas IA
  { keyword: /[Cc]onsultation/, area: "consultas-ia", priority: 60 },
  { keyword: /[Cc]hat/, area: "consultas-ia", priority: 50 },
  { keyword: /[Gg]emini/, area: "firebase-ai", priority: 60 },

  // Health
  { keyword: /[Hh]ealth[Tt]racking/, area: "health-tracking", priority: 65 },
  { keyword: /[Hh]ome[Cc]are/, area: "health-tracking", priority: 65 },

  // Training
  { keyword: /[Tt]raining/, area: "training", priority: 60 },
  { keyword: /[Gg]uide/, area: "training", priority: 55 },
  { keyword: /[Aa]destramento/, area: "training", priority: 60 },

  // Auth
  { keyword: /[Aa]uth/, area: "auth", priority: 60 },
  { keyword: /[Ll]ogin/, area: "auth", priority: 60 },
  { keyword: /[Rr]egister/, area: "auth", priority: 60 },
  { keyword: /[Ss]ignup/, area: "auth", priority: 60 },
  { keyword: /[Ss]ignin/, area: "auth", priority: 60 },

  // Stripe
  { keyword: /[Ss]tripe/, area: "stripe", priority: 65 },
  { keyword: /[Ss]ubscription/, area: "stripe", priority: 60 },
  { keyword: /[Pp]ayment/, area: "stripe", priority: 60 },
  { keyword: /[Cc]heckout/, area: "stripe", priority: 60 },
  { keyword: /[Pp]rice/, area: "pricing", priority: 55 },
  { keyword: /[Pp]ricing/, area: "pricing", priority: 60 },

  // Notifications
  { keyword: /[Nn]otification/, area: "notifications", priority: 60 },
  { keyword: /[Ff][Cc][Mm]/, area: "notifications", priority: 65 },
  { keyword: /[Pp]ush/, area: "notifications", priority: 55 },

  // i18n
  { keyword: /[Ii]18n/, area: "i18n", priority: 60 },
  { keyword: /[Ll]ocale/, area: "i18n", priority: 55 },
  { keyword: /[Tt]ranslat/, area: "i18n", priority: 55 },

  // SEO
  { keyword: /[Ss][Ee][Oo]/, area: "seo", priority: 60 },
  { keyword: /[Ss]itemap/, area: "seo", priority: 60 },
  { keyword: /[Mm]eta/, area: "seo", priority: 50 },

  // Analytics
  { keyword: /[Aa]nalytics/, area: "analytics", priority: 60 },
  { keyword: /[Uu]tm/, area: "analytics", priority: 55 },
  { keyword: /[Tt]racking/, area: "analytics", priority: 50 },

  // Admin
  { keyword: /[Aa]dmin/, area: "admin", priority: 60 },

  // PWA
  { keyword: /[Pp][Ww][Aa]/, area: "pwa", priority: 60 },
  { keyword: /[Ss]ervice[Ww]orker/, area: "pwa", priority: 60 },
  { keyword: /[Mm]anifest/, area: "pwa", priority: 55 },
  { keyword: /[Oo]ffline/, area: "pwa", priority: 55 },

  // PDF
  { keyword: /[Pp]df/, area: "pdf", priority: 60 },
  { keyword: /[Rr]eport/, area: "pdf", priority: 50 },
];

/**
 * Nomes amigáveis das áreas
 */
export const AREA_NAMES: Record<string, string> = {
  // Áreas específicas de domínio
  "meus-pets": "Meus Pets",
  "consultas-ia": "Consultas IA",
  "health-tracking": "Health Tracking",
  training: "Adestramento",

  // Autenticação e usuário
  auth: "Autenticação",
  user: "Usuário",
  profile: "Perfil",
  settings: "Configurações",
  onboarding: "Onboarding",

  // E-commerce
  stripe: "Pagamentos (Stripe)",
  payments: "Pagamentos",
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
  "firebase-core": "Firebase Core",
  "firebase-ai": "Firebase AI",
  "firebase-firestore": "Firestore",

  // Conteúdo
  blog: "Blog",
  docs: "Documentação",
  legal: "Páginas Legais",
  about: "Sobre",

  // Marketing e SEO
  landing: "Landing Pages",
  seo: "SEO",
  analytics: "Analytics",
  beta: "Programa Beta",

  // Admin e Dashboard
  admin: "Admin",
  dashboard: "Dashboard",

  // Técnico
  i18n: "Internacionalização",
  pwa: "PWA",
  pdf: "PDF",
  core: "Core",
  "shared-ui": "UI Compartilhado",
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
 * Descrições padrão das áreas
 */
export const AREA_DESCRIPTIONS: Record<string, string> = {
  // Áreas específicas de domínio
  "meus-pets": "Gerenciamento completo de pets do usuário",
  "consultas-ia": "Chat com IA para consultas veterinárias",
  "health-tracking": "Acompanhamento de saúde e sintomas",
  training: "Sistema de adestramento com guias e progresso",

  // Autenticação e usuário
  auth: "Autenticação e gerenciamento de sessão",
  user: "Gerenciamento de dados do usuário",
  profile: "Perfil do usuário",
  settings: "Configurações do usuário",
  onboarding: "Fluxo de onboarding de novos usuários",

  // E-commerce
  stripe: "Integração Stripe para pagamentos e assinaturas",
  payments: "Sistema de pagamentos",
  checkout: "Fluxo de checkout e finalização de compra",
  cart: "Carrinho de compras",
  shop: "Loja e catálogo de produtos",
  products: "Gerenciamento de produtos",
  orders: "Gerenciamento de pedidos",
  pricing: "Página de preços e planos",

  // Comunicação
  notifications: "Sistema de notificações push",
  chat: "Sistema de chat e mensagens",
  feedback: "Coleta de feedback dos usuários",
  support: "Suporte ao cliente",
  help: "Central de ajuda",
  faq: "Perguntas frequentes",
  contact: "Página de contato",

  // Firebase
  "firebase-core": "Configuração e serviços Firebase client-side",
  "firebase-ai": "Integração com Firebase AI (Gemini)",
  "firebase-firestore": "Operações CRUD no Firestore",

  // Conteúdo
  blog: "Blog e artigos",
  docs: "Documentação e guias",
  legal: "Termos de uso, privacidade e políticas",
  about: "Página sobre a empresa",

  // Marketing e SEO
  landing: "Landing pages e marketing",
  seo: "SEO, meta tags e sitemaps",
  analytics: "Analytics e tracking de eventos",
  beta: "Programa de beta testers",

  // Admin e Dashboard
  admin: "Painel administrativo",
  dashboard: "Dashboard do usuário",

  // Técnico
  i18n: "Internacionalização e traduções",
  pwa: "Progressive Web App (offline, install)",
  pdf: "Geração de relatórios PDF",
  core: "Providers e layout principal",
  "shared-ui": "Componentes de UI compartilhados",
  "cloud-functions": "Cloud Functions (serverless)",
  assets: "Assets públicos (imagens, fontes)",
  scripts: "Scripts de automação",

  // UI patterns
  forms: "Componentes de formulário reutilizáveis",
  tables: "Componentes de tabela reutilizáveis",
  modals: "Modais e dialogs reutilizáveis",

  // Genéricos
  app: "Área principal da aplicação",
};
