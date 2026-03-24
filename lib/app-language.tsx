'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const LANGUAGE_OPTIONS = [
  'English (US)',
  'Spanish',
  'Portuguese',
  'French',
  'German',
  'Italian',
] as const;

type LanguageLabel = (typeof LANGUAGE_OPTIONS)[number];
type LanguageCode = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it';

type AppLanguageContextValue = {
  languageLabel: LanguageLabel;
  languageCode: LanguageCode;
  setLanguageLabel: (label: LanguageLabel) => void;
  t: (value: string) => string;
};

const DEFAULT_LANGUAGE: LanguageLabel = 'English (US)';
const STORAGE_KEY = 'investup_language';
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title'] as const;

const textNodeOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();

const LANGUAGE_LABEL_TO_CODE: Record<LanguageLabel, LanguageCode> = {
  'English (US)': 'en',
  Spanish: 'es',
  Portuguese: 'pt',
  French: 'fr',
  German: 'de',
  Italian: 'it',
};

const DICTIONARY: Record<Exclude<LanguageCode, 'en'>, Record<string, string>> = {
  es: {
    Home: 'Inicio',
    Activity: 'Actividad',
    Payments: 'Pagos',
    Profile: 'Perfil',
    Send: 'Enviar',
    Language: 'Idioma',
    'Choose the language for your account': 'Elige el idioma de tu cuenta',
    'Currently selected': 'Seleccionado actualmente',
    'Tap to use this language': 'Toca para usar este idioma',
    'My listings': 'Mis publicaciones',
    'Active investments': 'Inversiones activas',
    'Add new listing': 'Agregar publicación',
    'Invest in a new venture': 'Invertir en un nuevo proyecto',
    Transactions: 'Transacciones',
    'View all': 'Ver todo',
    'Loading transactions...': 'Cargando transacciones...',
    'Your activity will appear here.': 'Tu actividad aparecerá aquí.',
    'Loading your latest listing...': 'Cargando tu última publicación...',
    'Your listings will appear here once they are active.': 'Tus publicaciones aparecerán aquí cuando estén activas.',
    'Loading your active investments...': 'Cargando tus inversiones activas...',
    'You do not have active investments yet.': 'Todavía no tienes inversiones activas.',
    'Loading projects...': 'Cargando publicaciones...',
    'You have not published any projects yet.': 'Todavía no has publicado ningún proyecto.',
    'My published projects': 'Mis proyectos publicados',
    'Publish project': 'Publicar proyecto',
    Published: 'Publicado',
    Paused: 'Pausado',
    Closed: 'Cerrado',
    'Financing in progress': 'Financiacion en progreso',
    Edit: 'Editar',
    Pause: 'Pausar',
    Resume: 'Reanudar',
    Delete: 'Eliminar',
    Repayment: 'Reembolso',
    'Investment transfer': 'Transferencia de inversion',
    'Choose an investor to send a repayment.': 'Elige un inversionista para enviar un reembolso.',
    'Choose a recipient to send a direct transfer.': 'Elige un destinatario para enviar una transferencia directa.',
    Select: 'Seleccionar',
    Selected: 'Seleccionado',
  },
  pt: {
    Home: 'Inicio',
    Activity: 'Atividade',
    Payments: 'Pagamentos',
    Profile: 'Perfil',
    Send: 'Enviar',
    Language: 'Idioma',
    'Choose the language for your account': 'Escolha o idioma da sua conta',
    'Currently selected': 'Selecionado no momento',
    'Tap to use this language': 'Toque para usar este idioma',
    'My listings': 'Minhas publicacoes',
    'Active investments': 'Investimentos ativos',
    'Add new listing': 'Adicionar publicacao',
    'Invest in a new venture': 'Investir em um novo projeto',
    Transactions: 'Transacoes',
    'View all': 'Ver tudo',
    'Loading transactions...': 'Carregando transacoes...',
    'Your activity will appear here.': 'Sua atividade aparecera aqui.',
    'Loading your latest listing...': 'Carregando sua ultima publicacao...',
    'Your listings will appear here once they are active.': 'Suas publicacoes aparecerao aqui quando estiverem ativas.',
    'Loading your active investments...': 'Carregando seus investimentos ativos...',
    'You do not have active investments yet.': 'Voce ainda nao tem investimentos ativos.',
    'Loading projects...': 'Carregando publicacoes...',
    'You have not published any projects yet.': 'Voce ainda nao publicou nenhum projeto.',
    'My published projects': 'Meus projetos publicados',
    'Publish project': 'Publicar projeto',
    Published: 'Publicado',
    Paused: 'Pausado',
    Closed: 'Fechado',
    'Financing in progress': 'Financiamento em andamento',
    Edit: 'Editar',
    Pause: 'Pausar',
    Resume: 'Retomar',
    Delete: 'Excluir',
    Repayment: 'Reembolso',
    'Investment transfer': 'Transferencia de investimento',
    'Choose an investor to send a repayment.': 'Escolha um investidor para enviar um reembolso.',
    'Choose a recipient to send a direct transfer.': 'Escolha um destinatario para enviar uma transferencia direta.',
    Select: 'Selecionar',
    Selected: 'Selecionado',
  },
  fr: {
    Home: 'Accueil',
    Activity: 'Activite',
    Payments: 'Paiements',
    Profile: 'Profil',
    Send: 'Envoyer',
    Language: 'Langue',
    'Choose the language for your account': 'Choisissez la langue de votre compte',
    'Currently selected': 'Actuellement selectionne',
    'Tap to use this language': 'Touchez pour utiliser cette langue',
    'My listings': 'Mes publications',
    'Active investments': 'Investissements actifs',
    'Add new listing': 'Ajouter une publication',
    'Invest in a new venture': 'Investir dans un nouveau projet',
    Transactions: 'Transactions',
    'View all': 'Voir tout',
    'Loading transactions...': 'Chargement des transactions...',
    'Your activity will appear here.': 'Votre activite apparaitra ici.',
    'Loading your latest listing...': 'Chargement de votre derniere publication...',
    'Your listings will appear here once they are active.': 'Vos publications apparaitront ici une fois actives.',
    'Loading your active investments...': 'Chargement de vos investissements actifs...',
    'You do not have active investments yet.': "Vous n'avez pas encore d'investissements actifs.",
    'Loading projects...': 'Chargement des publications...',
    'You have not published any projects yet.': "Vous n'avez encore publie aucun projet.",
    'My published projects': 'Mes projets publies',
    'Publish project': 'Publier un projet',
    Published: 'Publie',
    Paused: 'En pause',
    Closed: 'Ferme',
    'Financing in progress': 'Financement en cours',
    Edit: 'Modifier',
    Pause: 'Mettre en pause',
    Resume: 'Reprendre',
    Delete: 'Supprimer',
    Repayment: 'Remboursement',
    'Investment transfer': "Transfert d'investissement",
    'Choose an investor to send a repayment.': 'Choisissez un investisseur pour envoyer un remboursement.',
    'Choose a recipient to send a direct transfer.': 'Choisissez un destinataire pour envoyer un transfert direct.',
    Select: 'Selectionner',
    Selected: 'Selectionne',
  },
  de: {
    Home: 'Start',
    Activity: 'Aktivitat',
    Payments: 'Zahlungen',
    Profile: 'Profil',
    Send: 'Senden',
    Language: 'Sprache',
    'Choose the language for your account': 'Wahle die Sprache fur dein Konto',
    'Currently selected': 'Derzeit ausgewahlt',
    'Tap to use this language': 'Tippe, um diese Sprache zu verwenden',
    'My listings': 'Meine Angebote',
    'Active investments': 'Aktive Investitionen',
    'Add new listing': 'Neues Angebot hinzufugen',
    'Invest in a new venture': 'In ein neues Projekt investieren',
    Transactions: 'Transaktionen',
    'View all': 'Alle ansehen',
    'Loading transactions...': 'Transaktionen werden geladen...',
    'Your activity will appear here.': 'Deine Aktivitat erscheint hier.',
    'Loading your latest listing...': 'Dein letztes Angebot wird geladen...',
    'Your listings will appear here once they are active.': 'Deine Angebote erscheinen hier, sobald sie aktiv sind.',
    'Loading your active investments...': 'Deine aktiven Investitionen werden geladen...',
    'You do not have active investments yet.': 'Du hast noch keine aktiven Investitionen.',
    'Loading projects...': 'Angebote werden geladen...',
    'You have not published any projects yet.': 'Du hast noch keine Projekte veroffentlicht.',
    'My published projects': 'Meine veroffentlichten Projekte',
    'Publish project': 'Projekt veroffentlichen',
    Published: 'Veroffentlicht',
    Paused: 'Pausiert',
    Closed: 'Geschlossen',
    'Financing in progress': 'Finanzierung lauft',
    Edit: 'Bearbeiten',
    Pause: 'Pausieren',
    Resume: 'Fortsetzen',
    Delete: 'Loschen',
    Repayment: 'Ruckzahlung',
    'Investment transfer': 'Investitionstransfer',
    'Choose an investor to send a repayment.': 'Wahle einen Investor fur eine Ruckzahlung.',
    'Choose a recipient to send a direct transfer.': 'Wahle einen Empfanger fur eine direkte Uberweisung.',
    Select: 'Auswahlen',
    Selected: 'Ausgewahlt',
  },
  it: {
    Home: 'Home',
    Activity: 'Attivita',
    Payments: 'Pagamenti',
    Profile: 'Profilo',
    Send: 'Invia',
    Language: 'Lingua',
    'Choose the language for your account': 'Scegli la lingua del tuo account',
    'Currently selected': 'Attualmente selezionato',
    'Tap to use this language': 'Tocca per usare questa lingua',
    'My listings': 'Le mie pubblicazioni',
    'Active investments': 'Investimenti attivi',
    'Add new listing': 'Aggiungi pubblicazione',
    'Invest in a new venture': 'Investi in un nuovo progetto',
    Transactions: 'Transazioni',
    'View all': 'Vedi tutto',
    'Loading transactions...': 'Caricamento transazioni...',
    'Your activity will appear here.': 'La tua attivita apparira qui.',
    'Loading your latest listing...': 'Caricamento della tua ultima pubblicazione...',
    'Your listings will appear here once they are active.': 'Le tue pubblicazioni appariranno qui quando saranno attive.',
    'Loading your active investments...': 'Caricamento dei tuoi investimenti attivi...',
    'You do not have active investments yet.': 'Non hai ancora investimenti attivi.',
    'Loading projects...': 'Caricamento pubblicazioni...',
    'You have not published any projects yet.': 'Non hai ancora pubblicato alcun progetto.',
    'My published projects': 'I miei progetti pubblicati',
    'Publish project': 'Pubblica progetto',
    Published: 'Pubblicato',
    Paused: 'In pausa',
    Closed: 'Chiuso',
    'Financing in progress': 'Finanziamento in corso',
    Edit: 'Modifica',
    Pause: 'Pausa',
    Resume: 'Riprendi',
    Delete: 'Elimina',
    Repayment: 'Rimborso',
    'Investment transfer': 'Trasferimento di investimento',
    'Choose an investor to send a repayment.': 'Scegli un investitore per inviare un rimborso.',
    'Choose a recipient to send a direct transfer.': 'Scegli un destinatario per inviare un trasferimento diretto.',
    Select: 'Seleziona',
    Selected: 'Selezionato',
  },
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

const isLanguageLabel = (value: string | null): value is LanguageLabel =>
  LANGUAGE_OPTIONS.includes((value ?? '') as LanguageLabel);

const translateKeepingWhitespace = (value: string, translate: (input: string) => string) => {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const translated = translate(trimmed);
  if (translated === trimmed) return value;

  const startIndex = value.indexOf(trimmed);
  return `${value.slice(0, startIndex)}${translated}${value.slice(startIndex + trimmed.length)}`;
};

function LanguageRuntimeTranslator({ translate }: { translate: (value: string) => string }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const translateElement = (element: Element) => {
      let elementAttributeMap = attributeOriginals.get(element);
      if (!elementAttributeMap) {
        elementAttributeMap = new Map<string, string>();
        attributeOriginals.set(element, elementAttributeMap);
      }

      for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        if (!element.hasAttribute(attribute)) continue;
        if (!elementAttributeMap.has(attribute)) {
          elementAttributeMap.set(attribute, element.getAttribute(attribute) ?? '');
        }

        const originalValue = elementAttributeMap.get(attribute) ?? '';
        element.setAttribute(attribute, translateKeepingWhitespace(originalValue, translate));
      }
    };

    const translateTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript')) return;

      if (!textNodeOriginals.has(node)) {
        textNodeOriginals.set(node, node.textContent ?? '');
      }

      const originalValue = textNodeOriginals.get(node) ?? '';
      node.textContent = translateKeepingWhitespace(originalValue, translate);
    };

    const translateTree = (root: ParentNode) => {
      if (root instanceof Element) {
        translateElement(root);
        root.querySelectorAll('*').forEach(translateElement);
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        translateTextNode(current as Text);
        current = walker.nextNode();
      }
    };

    translateTree(document.body);
    document.title = translate(document.title);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) {
            translateTree(node as ParentNode);
          } else if (node instanceof Text) {
            translateTextNode(node);
          }
        });

        if (mutation.type === 'characterData' && mutation.target instanceof Text) {
          translateTextNode(mutation.target);
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElement(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [translate]);

  return null;
}

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [languageLabel, setLanguageLabelState] = useState<LanguageLabel>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncLanguage = () => {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguageLabel(storedValue)) {
        setLanguageLabelState(storedValue);
      } else {
        setLanguageLabelState(DEFAULT_LANGUAGE);
      }
    };

    syncLanguage();
    window.addEventListener('storage', syncLanguage);
    window.addEventListener('investup-language-updated', syncLanguage);
    return () => {
      window.removeEventListener('storage', syncLanguage);
      window.removeEventListener('investup-language-updated', syncLanguage);
    };
  }, []);

  const languageCode = LANGUAGE_LABEL_TO_CODE[languageLabel];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = languageCode;
  }, [languageCode]);

  const t = useCallback(
    (value: string) => {
      if (languageCode === 'en') return value;
      return DICTIONARY[languageCode][value] ?? value;
    },
    [languageCode]
  );

  const setLanguageLabel = useCallback((label: LanguageLabel) => {
    setLanguageLabelState(label);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, label);
    window.dispatchEvent(new Event('investup-language-updated'));
  }, []);

  const value = useMemo(
    () => ({
      languageLabel,
      languageCode,
      setLanguageLabel,
      t,
    }),
    [languageCode, languageLabel, setLanguageLabel, t]
  );

  return (
    <AppLanguageContext.Provider value={value}>
      <LanguageRuntimeTranslator translate={t} />
      {children}
    </AppLanguageContext.Provider>
  );
}

export const useAppLanguage = () => {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error('useAppLanguage must be used within AppLanguageProvider');
  }

  return context;
};
