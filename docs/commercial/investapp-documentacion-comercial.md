# InvestApp - Documentacion comercial, demos y negocio

Ultima revision: 2026-06-06

## 1. Resumen Ejecutivo

### Que hace la app

InvestApp es una plataforma fintech y Web3 que conecta inversionistas con emprendedores que buscan capital para crecer. La app permite que un emprendedor publique su negocio, explique su oportunidad de inversion, cargue imagenes y datos financieros, y reciba capital en USD/USDC. Para el inversionista, la app ofrece un marketplace de oportunidades, simulacion de retorno, transferencia de fondos, seguimiento de portafolio, historial, contratos, cronogramas de pago y notificaciones.

La aplicacion combina tres capas de valor:

- Marketplace: descubrimiento de emprendimientos, detalles comerciales, favoritos y publicaciones destacadas.
- Finanzas: inversiones, transferencias, repayments, retiros, saldos y contratos.
- Confianza: autenticacion, perfiles, KYC, documentos, trazabilidad de transacciones, ledger interno y seguridad por roles.

### Problema que resuelve

Invertir en pequenos negocios o emprendimientos normalmente es un proceso fragmentado: se descubre la oportunidad por redes sociales, se conversa por mensajes, se envia dinero por otro canal, se calcula manualmente el retorno y luego se pierde visibilidad sobre pagos, documentos e historial. Para el emprendedor tambien es dificil crear una publicacion clara, profesional y orientada a inversionistas.

InvestApp resuelve esa fragmentacion con una experiencia integrada: descubrimiento, publicacion, evaluacion, inversion, contrato, seguimiento y pago en un mismo lugar.

### Clientes ideales

- Inversionistas minoristas que quieren descubrir oportunidades privadas de alto potencial con ticket accesible.
- Emprendedores y pequenos negocios que necesitan capital de crecimiento sin depender exclusivamente de bancos.
- Comunidades de inversion, aceleradoras, camaras de comercio o ecosistemas locales que quieren digitalizar financiamiento.
- Operadores fintech que necesitan una capa marketplace + wallet + ledger para productos de credito/inversion.
- Plataformas de impacto que conectan capital con negocios reales en mercados emergentes.

### Propuesta de valor

InvestApp permite publicar, financiar y administrar oportunidades de inversion en negocios reales desde una experiencia simple, visual y trazable. Para el emprendedor, convierte datos del negocio en una publicacion comercial lista para inversionistas. Para el inversionista, centraliza busqueda, analisis, transferencia, contrato, retorno proyectado y seguimiento.

### Por que es diferente

- Usa perfiles separados para inversionista y emprendedor, con dashboards y flujos especificos para cada rol.
- Tiene un wizard de publicacion asistido por IA que convierte informacion cruda del negocio en una historia optimizada para inversionistas.
- Incluye pagos USDC sobre Polygon con wallets embebidas, smart wallets y transferencias patrocinadas.
- Mantiene un ledger interno que traduce actividad financiera en contratos, balances, entradas contables y cronogramas.
- Integra KYC y retiro fiat, no solo una experiencia cripto.
- Tiene una experiencia mobile-first y una experiencia desktop tipo fintech SaaS.
- Usa datos reales de Supabase y no solamente contenido estatico de demo.

### Beneficios principales

- Reduce friccion para invertir en negocios privados.
- Mejora la calidad de las publicaciones de emprendedores.
- Permite simular retornos antes de mover capital.
- Crea trazabilidad entre wallet, transaccion, inversion, contrato y repayment.
- Da visibilidad al emprendedor sobre capital levantado e inversionistas activos.
- Da visibilidad al inversionista sobre portafolio, rendimiento esperado y estado de pagos.
- Facilita demos comerciales con flujos completos: publicar, invertir, pagar, retirar y revisar documentos.

### Casos de uso reales

- Un cafe local publica una ronda de crecimiento para comprar maquinaria y ofrece una tasa anual.
- Un inversionista explora oportunidades, guarda favoritas, simula retorno e invierte desde su wallet.
- Un emprendedor ve quien invirtio, cuanto debe pagar y cuando corresponde el siguiente repayment.
- Un usuario solicita retiro fiat con validacion KYC y datos bancarios por pais.
- Un equipo comercial muestra en demo como la app genera automaticamente una publicacion profesional desde un formulario.
- Una comunidad de inversion usa InvestApp como portal privado para proyectos curados.

## 2. Mapa Completo De Funcionalidades

### 2.1 Autenticacion y entrada segura

- Nombre: Login seguro con Privy.
- Descripcion simple: el usuario accede usando autenticacion de Privy.
- Objetivo: simplificar entrada y asociar identidad con wallet embebida.
- Usuario: inversionistas y emprendedores.
- Beneficios: onboarding mas facil, menor barrera cripto, identidad centralizada.
- Como funciona internamente: Privy entrega usuario, access token y wallet; las APIs verifican el bearer token en servidor antes de acceder a Supabase.
- Pantallas relacionadas: `/login`, `/register`, layout protegido.

### 2.2 Seleccion de rol

- Nombre: Onboarding por perfil.
- Descripcion simple: el usuario escoge si quiere invertir o publicar su negocio.
- Objetivo: personalizar navegacion, CTAs y dashboards.
- Usuario: usuarios nuevos.
- Beneficios: experiencia enfocada, menos ruido, flujos comerciales claros.
- Como funciona internamente: se guarda el rol como `investor` o `entrepreneur` en perfil; el cliente lo mapea a `inversor` o `emprendedor`.
- Pantallas relacionadas: `/onboarding`, `/home`, `/portfolio`, `/feed`, `/publish`.

### 2.3 Bloqueo inteligente de cambio de rol

- Nombre: Elegibilidad de cambio de perfil.
- Descripcion simple: evita cambiar de rol si ya hay inversiones o proyectos activos.
- Objetivo: proteger consistencia financiera y permisos.
- Usuario: ambos roles.
- Beneficios: evita errores operativos y mezcla de obligaciones.
- Como funciona internamente: una API revisa conteo de inversiones y proyectos antes de permitir cambios.
- Pantallas relacionadas: `/profile/personal-data`, `/api/me/role-change-eligibility`.

### 2.4 Marketplace de emprendimientos

- Nombre: Feed de oportunidades.
- Descripcion simple: lista publicaciones de negocios disponibles para inversion.
- Objetivo: ayudar al inversionista a descubrir proyectos.
- Usuario: inversionista principalmente; emprendedor tambien puede ver contexto de mercado.
- Beneficios: descubrimiento, comparacion y navegacion rapida.
- Como funciona internamente: consulta `/api/projects`, normaliza sectores, filtra por estado publico y muestra tarjetas premium/normales.
- Pantallas relacionadas: `/feed`.

### 2.5 Publicaciones premium

- Nombre: Carrusel de publicaciones destacadas.
- Descripcion simple: muestra oportunidades destacadas en formato visual tipo reels.
- Objetivo: dar protagonismo a proyectos de mayor interes.
- Usuario: inversionistas.
- Beneficios: mejor conversion visual, mayor atencion en demos y marketing.
- Como funciona internamente: toma los primeros proyectos del feed y los presenta en carrusel horizontal.
- Pantallas relacionadas: `/feed`.

### 2.6 Busqueda, filtros y ordenamiento

- Nombre: Exploracion inteligente de oportunidades.
- Descripcion simple: permite buscar por negocio, descripcion, sector, ciudad o pais.
- Objetivo: encontrar oportunidades relevantes rapidamente.
- Usuario: inversionistas.
- Beneficios: discovery mas eficiente.
- Como funciona internamente: filtra en cliente la lista cargada y permite ordenar por tasa, progreso, monto objetivo o fecha.
- Pantallas relacionadas: `/feed`.

### 2.7 Favoritos

- Nombre: Wishlist de ventures.
- Descripcion simple: el inversionista guarda oportunidades para revisarlas despues.
- Objetivo: aumentar continuidad del proceso de evaluacion.
- Usuario: inversionista.
- Beneficios: seguimiento comercial, remarketing futuro, mejores demos de retencion.
- Como funciona internamente: guarda IDs por usuario en localStorage y los carga en pagina de favoritos.
- Pantallas relacionadas: `/feed`, `/profile/favorites`.

### 2.8 Detalle de publicacion

- Nombre: Vista de oportunidad.
- Descripcion simple: muestra fotos, datos basicos, descripcion, tabs, KPIs y accion de inversion/edicion.
- Objetivo: convertir interes en decision.
- Usuario: inversionista y emprendedor.
- Beneficios: narrativa clara, informacion estructurada, mejor evaluacion.
- Como funciona internamente: arma badges, metricas y secciones desde campos del proyecto y metadata generada por IA.
- Pantallas relacionadas: `/feed/[id]`, `/feed/[id]/invest`.

### 2.9 Simulador de inversion

- Nombre: Calculadora de monto a invertir.
- Descripcion simple: el inversionista ingresa monto y ve retorno proyectado.
- Objetivo: mostrar impacto economico antes de transferir.
- Usuario: inversionista.
- Beneficios: confianza, claridad financiera, mejor toma de decision.
- Como funciona internamente: calcula tasa efectiva segun tasa anual y plazo en meses.
- Pantallas relacionadas: `/feed/[id]/invest`.

### 2.10 Handoff de inversion pendiente

- Nombre: Transferencia prellenada.
- Descripcion simple: al continuar desde la calculadora, la app prellena destino, monto y metadata.
- Objetivo: reducir errores en el envio de fondos.
- Usuario: inversionista.
- Beneficios: menos friccion, menos fallos manuales, experiencia fluida.
- Como funciona internamente: guarda `PendingInvestment` en localStorage y `/invest/wallet` lo consume.
- Pantallas relacionadas: `/feed/[id]/invest`, `/invest`, `/invest/wallet`.

### 2.11 Wizard de publicacion para emprendedores

- Nombre: Publicacion guiada de negocio.
- Descripcion simple: formulario paso a paso para crear una oportunidad de inversion.
- Objetivo: convertir informacion del negocio en publicacion lista para marketplace.
- Usuario: emprendedor.
- Beneficios: reduce complejidad, mejora calidad de datos, estandariza publicaciones.
- Como funciona internamente: usa multiples pasos, validaciones, drafts, media upload y metadatos estructurados.
- Pantallas relacionadas: `/publish`.

### 2.12 Generacion de publicacion con IA

- Nombre: Historia optimizada para inversionistas.
- Descripcion simple: genera titulo, resumen, descripcion, highlights y secciones desde respuestas del emprendedor.
- Objetivo: mejorar conversion y presentacion profesional.
- Usuario: emprendedor.
- Beneficios: publicaciones mas persuasivas, menos dependencia de copywriting externo.
- Como funciona internamente: API usa OpenAI Responses y fallback local; guarda prompt, provider, status y resultado en Supabase.
- Pantallas relacionadas: `/publish`, `/api/me/publication-prompts`.

### 2.13 Drafts de publicacion

- Nombre: Continuar publicacion.
- Descripcion simple: el usuario puede guardar y retomar un borrador.
- Objetivo: evitar perdida de trabajo.
- Usuario: emprendedor.
- Beneficios: mejora finalizacion de onboarding y reduce abandono.
- Como funciona internamente: guarda prompt JSON, texto y metadata en `project_publication_prompts`.
- Pantallas relacionadas: `/publish`.

### 2.14 Upload de fotos y videos

- Nombre: Media de proyecto.
- Descripcion simple: permite cargar imagenes y URL de video para una publicacion.
- Objetivo: aumentar confianza y atractivo visual.
- Usuario: emprendedor.
- Beneficios: publicaciones mas creibles y vendibles.
- Como funciona internamente: sube archivos a Supabase Storage en bucket de media de proyectos y devuelve URLs publicas.
- Pantallas relacionadas: `/publish`, `/api/me/projects/media`.

### 2.15 Edicion de publicacion existente

- Nombre: Editar venture publicado.
- Descripcion simple: el emprendedor puede editar su publicacion si no tiene actividad financiera bloqueante.
- Objetivo: mantener la informacion actualizada sin comprometer inversiones activas.
- Usuario: emprendedor.
- Beneficios: control operativo y seguridad financiera.
- Como funciona internamente: carga metadata de `publication_form_fields`, preserva datos generados y usa PATCH.
- Pantallas relacionadas: `/publish?edit=<projectId>`, `/portfolio`.

### 2.16 Regla de un proyecto por emprendedor

- Nombre: Una publicacion activa.
- Descripcion simple: limita a un proyecto publicado por emprendedor.
- Objetivo: enfocar fundraising y evitar dispersion.
- Usuario: emprendedor.
- Beneficios: claridad para inversionistas y control de riesgo.
- Como funciona internamente: API verifica proyectos existentes antes de publicar.
- Pantallas relacionadas: `/publish`, `/portfolio`, `/api/me/projects`.

### 2.17 Pausar o eliminar proyectos

- Nombre: Control de estado de venture.
- Descripcion simple: permite pausar o eliminar cuando no hay financiamiento en curso.
- Objetivo: proteger inversionistas y trazabilidad.
- Usuario: emprendedor.
- Beneficios: control sin romper obligaciones.
- Como funciona internamente: API valida monto recibido y estado antes de cambios destructivos.
- Pantallas relacionadas: `/portfolio`, `/api/me/projects`.

### 2.18 Home por rol

- Nombre: Inicio personalizado.
- Descripcion simple: muestra inversiones activas para inversionistas o proyecto actual para emprendedores.
- Objetivo: orientar la accion principal del usuario.
- Usuario: ambos roles.
- Beneficios: menos confusion, mayor conversion al siguiente paso.
- Como funciona internamente: carga inversiones, ledger, proyecto activo y busqueda global.
- Pantallas relacionadas: `/home`.

### 2.19 Busqueda global

- Nombre: Search transversal.
- Descripcion simple: busca ventures, usuarios, emails, wallets, IDs y hashes.
- Objetivo: acelerar navegacion operativa.
- Usuario: ambos roles.
- Beneficios: herramienta poderosa para demos y soporte.
- Como funciona internamente: combina proyectos, directorio de usuarios y transacciones visibles.
- Pantallas relacionadas: `/home`.

### 2.20 Dashboard de portafolio inversionista

- Nombre: Investor portfolio.
- Descripcion simple: resume capital invertido, tasa promedio, ganancias proyectadas y salud de pagos.
- Objetivo: dar seguimiento financiero.
- Usuario: inversionista.
- Beneficios: claridad de performance, confianza post-inversion.
- Como funciona internamente: consulta inversiones, calcula retorno proyectado y clasifica estado de pagos.
- Pantallas relacionadas: `/portfolio`.

### 2.21 Dashboard emprendedor

- Nombre: Entrepreneur funding dashboard.
- Descripcion simple: muestra progreso de recaudo, meta, capital recibido, tasa, estado e inversionistas.
- Objetivo: ayudar al emprendedor a gestionar su ronda.
- Usuario: emprendedor.
- Beneficios: seguimiento de fundraising y obligaciones.
- Como funciona internamente: carga proyecto propio, inversiones recibidas y payment schedule.
- Pantallas relacionadas: `/portfolio`, `components/EntrepreneurFeedDashboard.tsx`.

### 2.22 Repayments

- Nombre: Pago a inversionistas.
- Descripcion simple: permite al emprendedor pagar cuotas a inversionistas con datos prellenados.
- Objetivo: operacionalizar retornos.
- Usuario: emprendedor.
- Beneficios: menos errores, pagos mas rapidos, trazabilidad.
- Como funciona internamente: genera enlaces a `/invest/wallet?mode=repayment` con investor, projectId y monto de cuota.
- Pantallas relacionadas: `/invest/repayments`, `/portfolio`, `/invest/wallet`.

### 2.23 Transferencias USDC

- Nombre: Envio de fondos.
- Descripcion simple: permite enviar USD/USDC a otro usuario o wallet.
- Objetivo: mover capital dentro del ecosistema.
- Usuario: ambos roles.
- Beneficios: transacciones directas, trazables y simples.
- Como funciona internamente: usa smart wallet, viem, USDC en Polygon, paymaster/Pimlico y registra transaccion en Supabase.
- Pantallas relacionadas: `/invest`, `/invest/wallet`.

### 2.24 Directorio de destinatarios

- Nombre: Contactos InvestApp.
- Descripcion simple: encuentra usuarios por rol, email o wallet.
- Objetivo: facilitar transferencias e inversiones.
- Usuario: ambos roles.
- Beneficios: reduce copiar wallets manualmente.
- Como funciona internamente: API consulta usuarios permitidos segun rol y filtros.
- Pantallas relacionadas: `/invest`, `/invest/wallet`, `/api/me/recipient-directory`.

### 2.25 Top up con Coinbase Onramp

- Nombre: Compra de USDC.
- Descripcion simple: abre una sesion de onramp para fondear wallet.
- Objetivo: facilitar entrada de capital a la app.
- Usuario: ambos roles.
- Beneficios: reduce barrera cripto.
- Como funciona internamente: API crea sesion Coinbase CDP Onramp para USDC en Polygon.
- Pantallas relacionadas: `/home`, `/invest`, `/api/coinbase/onramp`.

### 2.26 Retiro fiat

- Nombre: Withdraw.
- Descripcion simple: solicita retiro desde balance USD hacia banco o Breve.
- Objetivo: cerrar el ciclo de liquidez.
- Usuario: ambos roles.
- Beneficios: conecta on-chain con salida fiat.
- Como funciona internamente: valida KYC, pais, monto minimo, metodo de pago, crea solicitud y registra transferencia.
- Pantallas relacionadas: `/withdraw`, `/api/withdrawals`.

### 2.27 Configuracion bancaria

- Nombre: Datos de payout guardados.
- Descripcion simple: guarda banco, cuenta, documento, telefono o llave Breve.
- Objetivo: reutilizar destino en retiros.
- Usuario: ambos roles.
- Beneficios: menos friccion en retiros recurrentes.
- Como funciona internamente: guarda `bank_details`/`Bank_details` en perfil.
- Pantallas relacionadas: `/profile/bank-account`.

### 2.28 KYC y documentos

- Nombre: Cumplimiento por niveles.
- Descripcion simple: valida perfil y documentos segun monto de retiro.
- Objetivo: controlar riesgo y cumplimiento.
- Usuario: ambos roles.
- Beneficios: mayor confianza comercial, readiness para escalamiento.
- Como funciona internamente: calcula nivel aprobado con campos de perfil, documentos y movimiento acumulado; sube documentos a bucket privado.
- Pantallas relacionadas: `/profile/personal-data`, `/withdraw`, `/api/me/kyc`.

### 2.29 Contratos

- Nombre: Contrato de inversion.
- Descripcion simple: genera una vista contractual desde el schedule y ledger.
- Objetivo: documentar relacion inversionista-emprendedor.
- Usuario: ambos roles.
- Beneficios: formalidad, trazabilidad, soporte para auditorias.
- Como funciona internamente: construye snapshot con credit ID, partes, monto, cuotas, saldo y plan de pago.
- Pantallas relacionadas: `/contracts?credit=<id>`.

### 2.30 Cronograma de pagos

- Nombre: Payment schedule.
- Descripcion simple: lista cuotas, vencimientos, monto fijo y estado.
- Objetivo: hacer visible la obligacion de repayment.
- Usuario: ambos roles.
- Beneficios: reduce incertidumbre y facilita seguimiento.
- Como funciona internamente: trigger SQL recalcula schedule cuando cambian inversiones, repayments o proyecto.
- Pantallas relacionadas: `/contracts`, `/portfolio`, `/invest/repayments`.

### 2.31 Ledger interno

- Nombre: Contabilidad operacional.
- Descripcion simple: crea entradas internas para inversiones, repayments y retiros.
- Objetivo: traducir transacciones on-chain a balances de producto.
- Usuario: interno/ambos roles via dashboards.
- Beneficios: reporting, conciliacion, trazabilidad.
- Como funciona internamente: sincroniza contratos, ledger entries y balances por usuario desde Supabase.
- Pantallas relacionadas: `/contracts`, `/history`, `/home`, `/api/me/internal-ledger`.

### 2.32 Historial de transacciones

- Nombre: Activity/history.
- Descripcion simple: tabla de movimientos con filtros, busqueda, copia de hash y estados.
- Objetivo: auditar actividad financiera.
- Usuario: ambos roles.
- Beneficios: soporte, confianza y transparencia.
- Como funciona internamente: consulta `/api/me/transactions`, filtra por wallet, tipo, direccion y hash.
- Pantallas relacionadas: `/history`.

### 2.33 Recibos de transaccion

- Nombre: Receipt.
- Descripcion simple: muestra comprobante al completar transaccion.
- Objetivo: dar cierre visual y comprobable.
- Usuario: ambos roles.
- Beneficios: confianza inmediata y material compartible.
- Como funciona internamente: el contexto crea `lastReceipt` cuando obtiene hash on-chain.
- Pantallas relacionadas: overlay global, `TransactionReceipt`.

### 2.34 Notificaciones

- Nombre: Centro de notificaciones.
- Descripcion simple: muestra alertas de wallet, inversiones, repayments, perfil y retiros.
- Objetivo: mantener al usuario informado.
- Usuario: ambos roles.
- Beneficios: engagement y seguimiento operativo.
- Como funciona internamente: contexto sincroniza transacciones a notificaciones locales con dedupe.
- Pantallas relacionadas: `/notifications`, overlay de toasts.

### 2.35 Toasts transaccionales

- Nombre: Feedback instantaneo.
- Descripcion simple: muestra aprobacion, cancelacion o error de transaccion.
- Objetivo: mejorar UX durante pagos.
- Usuario: ambos roles.
- Beneficios: menos ansiedad en flujos financieros.
- Como funciona internamente: `transactionToast` en contexto se renderiza desde `TransactionOverlay`.
- Pantallas relacionadas: global.

### 2.36 Perfil personal

- Nombre: Datos personales y confianza.
- Descripcion simple: guarda nombre, apellido, genero, pais, telefono, avatar y rol.
- Objetivo: completar identidad de usuario.
- Usuario: ambos roles.
- Beneficios: KYC, discovery, seguridad y personalizacion.
- Como funciona internamente: PATCH a perfil en Supabase con compatibilidad de columnas y metadata.
- Pantallas relacionadas: `/profile/personal-data`.

### 2.37 Redes sociales

- Nombre: Trust signals publicos.
- Descripcion simple: permite conectar Instagram, LinkedIn, website, YouTube, TikTok y otros canales.
- Objetivo: aumentar credibilidad.
- Usuario: ambos roles; especialmente emprendedores.
- Beneficios: muy vendible para due diligence ligera.
- Como funciona internamente: guarda campos sociales cuando existen o los embebe en metadata/profile_data.
- Pantallas relacionadas: `/profile/social-media`.

### 2.38 Referral

- Nombre: Codigo de invitacion.
- Descripcion simple: muestra un codigo para invitar usuarios.
- Objetivo: crecimiento organico.
- Usuario: ambos roles.
- Beneficios: canal de adquisicion y programa futuro de recompensas.
- Como funciona internamente: lee codigo asociado al perfil y permite copiarlo.
- Pantallas relacionadas: `/profile/referral-code`.

### 2.39 Idiomas

- Nombre: Experiencia localizada.
- Descripcion simple: permite seleccionar idioma y usa `next-intl`.
- Objetivo: preparar expansion internacional.
- Usuario: ambos roles.
- Beneficios: mercados globales, demos multilingues.
- Como funciona internamente: namespaces de mensajes y cookie de locale.
- Pantallas relacionadas: `/profile/preferences/language`, mensajes `en`, `es` y otros locales basicos.

### 2.40 Soporte y contenido legal

- Nombre: Help center, FAQ, privacidad, terminos y about.
- Descripcion simple: paginas informativas dentro del perfil.
- Objetivo: responder objeciones comerciales y legales.
- Usuario: ambos roles.
- Beneficios: confianza pre-inversion.
- Como funciona internamente: paginas estaticas/localizadas dentro de perfil.
- Pantallas relacionadas: `/profile/help-center`, `/profile/faq`, `/profile/privacy-policy`, `/profile/terms-conditions`, `/profile/about`.

### 2.41 Geocoding para negocios

- Nombre: Direccion inteligente.
- Descripcion simple: busca o resuelve ubicacion del negocio.
- Objetivo: mejorar precision de la publicacion.
- Usuario: emprendedor.
- Beneficios: publicaciones mas completas y localizables.
- Como funciona internamente: API usa Nominatim/OpenStreetMap con cache corta y reverse geocoding.
- Pantallas relacionadas: `/publish`, `/api/geocoding`.

### 2.42 Android/Capacitor

- Nombre: Empaque mobile.
- Descripcion simple: el proyecto puede correr como app Android con Capacitor.
- Objetivo: llevar InvestApp a experiencia mobile nativa/hibrida.
- Usuario: producto/desarrollo.
- Beneficios: canal mobile, demo instalable, potencial app store.
- Como funciona internamente: configuracion Capacitor apunta a servidor remoto o dev server.
- Pantallas relacionadas: app completa.

## 3. Flujos De Usuario

### 3.1 Registro y login

1. El usuario entra a la app.
2. La pantalla de login abre el modal seguro de Privy.
3. Privy autentica al usuario y entrega identidad, access token y wallet.
4. La app revisa si el usuario ya tiene rol y perfil.
5. Si no tiene onboarding completo, lo envia a seleccion de rol.
6. Si ya esta completo, entra al dashboard correspondiente.

Resultado comercial: un usuario sin experiencia cripto puede entrar con una experiencia familiar y terminar con wallet lista para operar.

### 3.2 Onboarding

1. El usuario elige entre inversionista y emprendedor.
2. Acepta terminos.
3. La app guarda el rol en Supabase y local storage compatible.
4. La experiencia se adapta: inversionista ve feed/invertir/portafolio; emprendedor ve publicar/proyecto/dashboard.

Automatizacion: si hay actividad financiera, el cambio de rol queda bloqueado para proteger consistencia.

### 3.3 Flujo principal del inversionista

1. Entra al feed.
2. Explora publicaciones premium y normales.
3. Busca, filtra o guarda favoritos.
4. Abre detalle de una oportunidad.
5. Revisa fotos, datos del negocio, descripcion, KPIs y tabs.
6. Pulsa `Invest`.
7. Ingresa monto en la calculadora.
8. La app calcula retorno esperado y total proyectado.
9. Pulsa `Continue`.
10. La app prepara una inversion pendiente.
11. Entra al flujo de envio con monto y destinatario precargados.
12. Pulsa `Send money`.
13. La smart wallet envia USDC en Polygon.
14. Se registra transaccion, inversion, recibo, notificacion y actualizacion de saldos.
15. El inversionista puede ver la inversion en portafolio, historial y contratos.

Resultado generado: inversion registrada, hash on-chain, recibo, entrada en ledger, actualizacion de project funding y contrato/schedule derivado.

### 3.4 Flujo principal del emprendedor

1. Entra a publicar.
2. Completa informacion del negocio: nombre, ubicacion, categoria, tiempo operando.
3. Agrega propuesta de valor, problema, diferenciacion y traccion.
4. Ingresa ventas, clientes, ticket promedio y crecimiento.
5. Define capital requerido, uso de fondos, minimo de inversion, tasa y cierre de ronda.
6. Agrega equipo, founder profile, logros, fotos y video.
7. La app guarda draft durante el proceso.
8. La IA genera publicacion optimizada.
9. El emprendedor revisa titulo, descripcion, secciones y preview.
10. Publica el venture.
11. El proyecto aparece en marketplace.
12. Desde portfolio monitorea fondos recibidos, progreso y resumen de inversionistas.
13. Cuando corresponde, paga repayments a inversionistas.

Resultado generado: publicacion lista para inversionistas, metadata estructurada, media en Supabase Storage, proyecto publicado y dashboard de fundraising.

### 3.5 Flujo de repayment

1. El emprendedor entra a portfolio o repayments.
2. Ve inversionistas, proxima fecha de pago, monto de cuota y estado de salud.
3. Abre contrato si necesita revisar detalles.
4. Pulsa pagar.
5. La app abre transferencia prellenada con investor, wallet, monto, projectId e investorUserId.
6. Envia USDC.
7. Se registra repayment y se actualiza schedule/ledger.

Resultado generado: repayment trazable y contrato actualizado.

### 3.6 Flujo de retiro

1. El usuario entra a Withdraw.
2. La app calcula saldo disponible y pais.
3. El usuario elige metodo: banco o Breve cuando aplica.
4. Completa datos de payout.
5. La app valida monto minimo, saldo, campos por pais y KYC requerido.
6. Crea solicitud de retiro.
7. Ejecuta transferencia on-chain a wallet de retiro/manual payout.
8. Actualiza solicitud con hash y estado.
9. Muestra confirmacion y queda lista para procesamiento fiat.

Resultado generado: solicitud de payout, metadata KYC, transaccion on-chain y registro operativo.

### 3.7 Flujo de KYC

1. El usuario completa perfil personal.
2. Sube documento de identidad y prueba de residencia cuando aplica.
3. La app calcula nivel aprobado.
4. Para retiros mayores, exige nivel superior.
5. Si falta informacion, bloquea retiro y explica requisitos.

Resultado generado: perfil mas confiable, documentos asociados y limites de cumplimiento.

### 3.8 Flujo de contratos

1. Una inversion crea o alimenta un payment schedule.
2. El backend sincroniza contratos internos.
3. El usuario abre `/contracts?credit=<id>`.
4. La app muestra partes, monto, tasa, cuotas, pagos realizados, saldo y fuente JSON.
5. El contrato se actualiza con repayments.

Resultado generado: documento comercial/auditable basado en datos vivos.

### 3.9 Flujo de administracion operativa implicita

Aunque no existe un panel admin completo, la app ya tiene piezas operativas:

1. APIs server-side con service role.
2. Tablas protegidas por RLS y revocacion de acceso directo.
3. Withdrawals con estado.
4. KYC documents con estado.
5. Ledger interno y balances.
6. Cron OK route para health.

Feature futura: un backoffice para revisar KYC, aprobar retiros, curar publicaciones premium, gestionar disputas y ver conciliacion.

## 4. Documento Para Videos Demo

### Video 1: "InvestApp en 90 segundos"

- Objetivo: explicar que es la plataforma y mostrar el ciclo completo.
- Duracion sugerida: 90 segundos.
- Escenas:
- Pantalla: login y dashboard.
- Pantalla: feed con oportunidades.
- Pantalla: detalle de emprendimiento.
- Pantalla: calculadora de inversion.
- Pantalla: envio de dinero y recibo.
- Pantalla: portafolio con rendimiento.
- Narrativa sugerida: "InvestApp conecta capital con negocios reales. El inversionista descubre oportunidades, simula retorno y envia fondos desde una wallet segura. El emprendedor publica su negocio, recibe capital y gestiona repayments desde un dashboard."
- CTA final: "Agenda una demo y ve como InvestApp puede digitalizar tu ecosistema de inversion."

### Video 2: "Como un emprendedor publica su negocio"

- Objetivo: vender el wizard asistido por IA.
- Duracion sugerida: 2 a 3 minutos.
- Escenas:
- Mostrar seleccion de perfil emprendedor.
- Abrir `/publish`.
- Completar nombre, industria, ubicacion y datos de negocio.
- Cargar fotos.
- Mostrar generacion IA.
- Revisar preview.
- Publicar.
- Cerrar en portfolio emprendedor.
- Narrativa sugerida: "La mayoria de emprendedores no sabe escribir para inversionistas. InvestApp los guia paso a paso y transforma sus respuestas en una publicacion clara, visual y accionable."
- CTA final: "Convierte negocios reales en oportunidades listas para recibir capital."

### Video 3: "Como invierte un usuario"

- Objetivo: demostrar conversion inversionista.
- Duracion sugerida: 2 minutos.
- Escenas:
- Entrar al feed.
- Guardar favorito.
- Abrir una oportunidad premium.
- Revisar fotos, tabla, KPIs, descripcion y rating.
- Pulsa Invest.
- Ingresar monto.
- Ver retorno esperado.
- Continuar a transferencia prellenada.
- Confirmar `Send money`.
- Mostrar toast/recibo.
- Narrativa sugerida: "Invertir no tiene que sentirse tecnico. InvestApp convierte un proceso financiero complejo en una experiencia guiada y trazable."
- CTA final: "Explora oportunidades, compara retornos y empieza a invertir en minutos."

### Video 4: "Dashboard del inversionista"

- Objetivo: vender seguimiento post-inversion.
- Duracion sugerida: 90 segundos.
- Escenas:
- Portfolio value.
- Tasa promedio.
- Ganancias proyectadas.
- Lista de inversiones activas.
- Estado de pagos.
- Historial.
- Contrato.
- Narrativa sugerida: "Despues de invertir, el usuario necesita claridad. InvestApp muestra cuanto ha invertido, cuanto espera ganar y que obligaciones estan al dia."
- CTA final: "Dale a tus inversionistas una experiencia de seguimiento profesional."

### Video 5: "Dashboard del emprendedor"

- Objetivo: demostrar gestion de ronda.
- Duracion sugerida: 90 segundos.
- Escenas:
- Funding gauge.
- Meta y fondos levantados.
- Estado de publicacion.
- Lista de inversionistas.
- Proxima fecha de pago.
- Boton para contrato y repayment.
- Narrativa sugerida: "El emprendedor no solo recibe capital; tambien administra relaciones, pagos y obligaciones desde un solo panel."
- CTA final: "Financia tu negocio y gestiona tu ronda con transparencia."

### Video 6: "Confianza, KYC y retiros"

- Objetivo: mostrar readiness fintech.
- Duracion sugerida: 2 minutos.
- Escenas:
- Perfil personal.
- Upload de documentos.
- Retiro.
- Campos por pais.
- Validacion de saldo/KYC.
- Historial de retiro.
- Narrativa sugerida: "InvestApp esta pensada para operar mas alla de la demo: perfiles, documentos, limites, payout y trazabilidad."
- CTA final: "Construye confianza desde el primer movimiento de dinero."

### Video 7: "Arquitectura que escala"

- Objetivo: vender a inversionistas/partners tecnicos.
- Duracion sugerida: 2 minutos.
- Escenas:
- Diagrama simple: Next.js, Privy, Supabase, Polygon, Coinbase, OpenAI.
- APIs protegidas.
- Ledger interno.
- Payment schedule.
- Storage.
- Narrativa sugerida: "Detras de una experiencia simple hay una arquitectura preparada para identidad, datos, pagos, compliance y automatizacion."
- CTA final: "InvestApp es una base lista para marketplace fintech, no solo una interfaz."

## 5. Guion Para NotebookLM

### Capitulo 1: Que es InvestApp

InvestApp es una plataforma que conecta inversionistas con emprendedores que buscan capital para crecer. Su objetivo es hacer que invertir en negocios reales sea mas claro, mas accesible y mas trazable. En lugar de separar descubrimiento, conversacion, envio de dinero, contratos y seguimiento en herramientas distintas, InvestApp concentra todo el proceso en una sola experiencia.

Para el inversionista, la plataforma funciona como un marketplace de oportunidades. Puede explorar negocios, revisar fotos, datos financieros, descripcion, tasa ofrecida y monto minimo. Antes de invertir, puede simular el retorno esperado segun el monto, la tasa anual y el plazo del proyecto. Luego, la app prepara la transferencia con los datos del emprendimiento para reducir errores.

Para el emprendedor, InvestApp funciona como un asistente de publicacion y un dashboard de financiamiento. La app guia al fundador con preguntas sobre su negocio, traccion, equipo, uso de fondos y oferta para inversionistas. Despues transforma esa informacion en una publicacion profesional que puede mostrarse en el marketplace.

### Capitulo 2: El problema que resuelve

El financiamiento de pequenos negocios suele ser informal y desordenado. Un emprendedor puede tener una buena oportunidad, pero no sabe presentarla con lenguaje financiero. Un inversionista puede estar interesado, pero no tiene una forma clara de comparar, enviar fondos, recibir confirmacion y seguir el estado de su inversion.

InvestApp reduce esa friccion. La plataforma organiza la informacion, estandariza la publicacion, facilita el pago, registra la transaccion y mantiene un historial consultable. Esto hace que el proceso sea mas confiable tanto para quien busca capital como para quien invierte.

### Capitulo 3: Beneficios para inversionistas

El principal beneficio para el inversionista es la claridad. InvestApp le permite descubrir oportunidades, guardar favoritas, revisar detalles, simular retornos y hacer seguimiento desde el mismo lugar. La app muestra portafolio, tasa promedio, ganancias proyectadas, estado de pagos y contratos.

Otro beneficio clave es la trazabilidad. Cada movimiento queda asociado a una transaccion, un hash, un proyecto, una inversion y, cuando aplica, un contrato o cronograma de pagos. Esto mejora la confianza y facilita soporte, auditoria y toma de decisiones.

### Capitulo 4: Beneficios para emprendedores

Para el emprendedor, InvestApp reduce la dificultad de levantar capital. El wizard de publicacion le ayuda a ordenar su historia: que vende, que problema resuelve, cuanto vende, cuantos clientes tiene, cuanto capital necesita y como usara los fondos.

La IA convierte esas respuestas en una publicacion orientada a inversionistas. Esto permite que negocios reales, incluso sin equipo de marketing o finanzas, puedan presentarse de forma profesional. Despues de publicar, el emprendedor ve su progreso de recaudo, inversionistas activos, proximas cuotas y enlaces para realizar repayments.

### Capitulo 5: Como funciona el flujo de inversion

El flujo inicia en el marketplace. El inversionista revisa oportunidades y abre una publicacion. Alli encuentra imagenes, informacion basica, descripcion del negocio, datos de traccion y condiciones de inversion. Luego pulsa el boton de invertir.

La app abre una calculadora donde el usuario ingresa cuanto desea invertir. InvestApp calcula el retorno esperado y el total proyectado usando la tasa efectiva anual y el plazo del proyecto. Si el usuario continua, la transferencia se prepara automaticamente con wallet del emprendedor, monto, proyecto y metadata.

Cuando el usuario envia el dinero, la app ejecuta una transferencia USDC en Polygon, registra la transaccion, crea la inversion, actualiza el capital recibido del proyecto y muestra confirmacion.

### Capitulo 6: Confianza y cumplimiento

InvestApp incluye varias capas de confianza. La autenticacion se maneja con Privy. Las rutas privadas validan tokens antes de acceder a datos. Supabase almacena perfiles, proyectos, inversiones, documentos, transacciones y ledger. Las tablas sensibles tienen politicas de seguridad y acceso server-side.

La app tambien incluye KYC por niveles. Para retiros, revisa datos de perfil, documentos y monto solicitado. Si el usuario no cumple el nivel requerido, el retiro se bloquea y se explica que falta.

### Capitulo 7: Modelo operativo

InvestApp no se limita a mover dinero. Tambien convierte esos movimientos en informacion operacional. Cuando existe una inversion, se genera un schedule de pagos. Cuando hay repayments, se actualiza el estado de la obligacion. El ledger interno crea entradas para inversiones, repayments y retiros, permitiendo balances y contratos derivados.

Esto es importante porque una plataforma financiera necesita mas que UI: necesita trazabilidad, conciliacion y una forma de explicar el estado economico de cada usuario.

### Capitulo 8: Por que es comercialmente atractiva

InvestApp puede venderse como una plataforma para ecosistemas de inversion, comunidades de emprendedores, fondos, aceleradoras o fintechs que quieren conectar capital con negocios reales. Su diferencial esta en combinar marketplace, wallet, publicacion asistida por IA, contratos, repayments, KYC y dashboard.

La ventaja es que la experiencia se siente simple para el usuario, pero tiene una base tecnica preparada para operar flujos financieros mas serios. Eso permite empezar con demos comerciales y evolucionar hacia un producto SaaS o marketplace transaccional.

## 6. Modelo De Negocio

### Formas de monetizacion

- Comision por inversion: porcentaje sobre capital invertido exitosamente.
- Fee de originacion para emprendedores: cobro al publicar o al activar una ronda.
- Suscripcion SaaS para comunidades, aceleradoras o fondos que quieran su propio marketplace.
- Plan premium para emprendedores con mejor posicionamiento, analitica y ayuda de IA avanzada.
- Plan premium para inversionistas con filtros avanzados, oportunidades destacadas, alertas y reporting.
- Fee por retiro o payout fiat.
- Fee por servicios de compliance/KYC y verificacion.
- Revenue share con proveedores de onramp/offramp.
- Servicios administrados: curacion de proyectos, onboarding de emprendedores, soporte y reportes.

### Planes posibles

#### Plan Starter

- Precio sugerido: USD 49 a USD 99/mes por organizacion pequena o comunidad piloto.
- Incluye: marketplace basico, publicaciones limitadas, dashboards, favoritos, historial y soporte estandar.
- Cliente ideal: comunidades pequenas, programas de emprendimiento, demos cerradas.

#### Plan Growth

- Precio sugerido: USD 249 a USD 499/mes.
- Incluye: publicaciones ilimitadas, IA de publicacion, analytics, branding, KYC basico, contratos y reporting.
- Cliente ideal: aceleradoras, fondos pequenos, operadores regionales.

#### Plan Scale

- Precio sugerido: USD 999+/mes mas fee transaccional.
- Incluye: integraciones, backoffice, compliance avanzado, soporte prioritario, custom onboarding, roles operativos.
- Cliente ideal: fintechs, marketplaces financieros, redes de inversion.

#### Fee transaccional

- Sugerencia: 0.5% a 2.5% del capital invertido segun segmento, volumen y regulacion.
- Alternativa: fee fijo por contrato generado o por inversion confirmada.

### Upsells

- KYC avanzado y revision documental.
- Publicaciones premium o destacadas.
- Analitica para emprendedores.
- Investor CRM.
- Data room para documentos.
- Scoring de proyectos.
- Automatizacion de reminders de repayment.
- Backoffice administrativo.
- White label para comunidades.
- App movil publicada en stores.

### Segmentos de clientes

- B2C: inversionistas e individuos buscando oportunidades privadas.
- B2B2C: comunidades que traen emprendedores e inversionistas.
- B2B SaaS: aceleradoras, fondos, asociaciones, fintechs.
- Enterprise/white label: instituciones que quieren operar su propio portal.

### Ventajas competitivas

- Integracion end-to-end desde publicacion hasta repayment.
- Experiencia no-custodial con wallet embebida.
- IA aplicada directamente a calidad de oferta comercial.
- Ledger interno y contratos como base de confianza.
- KYC y retiro fiat ya contemplados.
- Mobile y desktop separados, utiles para consumidor y equipo operativo.
- Arquitectura modular con APIs propias y helpers cliente/servidor.

### Barreras de entrada

- Integracion de identidad, wallet, pagos, base de datos y UI financiera.
- Modelo de datos para inversiones, repayments, schedules y ledger.
- Experiencia de publicacion asistida y normalizacion de outputs IA.
- Reglas de permisos por rol y actividad financiera.
- Compliance/KYC y salida fiat.
- Conocimiento de UX para usuarios no cripto.

## 7. Resumen Tecnico

### Stack tecnologico

- Next.js 16 App Router.
- React 19.
- TypeScript.
- Tailwind CSS v4.
- Supabase para datos, storage y seguridad.
- Privy para autenticacion, access tokens y wallets embebidas.
- Smart wallets con provider de Privy.
- USDC en Polygon con `viem`.
- Pimlico/permissionless para paymaster y gas patrocinado en token.
- Coinbase CDP Onramp para fondeo.
- OpenAI Responses API para generacion de publicaciones.
- next-intl para internacionalizacion.
- Capacitor para Android.
- Framer Motion, GSAP, Three.js y Lottie para experiencia visual.

### Arquitectura general

La app esta organizada en:

- `app/(protected)`: pantallas autenticadas.
- `app/api`: endpoints server-side.
- `components`: UI compartida y dashboards.
- `lib`: contexto central, matematicas, ledger, estado local y helpers de dominio.
- `utils/client`: wrappers para consumir APIs autenticadas.
- `utils/server`: helpers de Privy, Supabase admin, KYC y ledger.
- `supabase/migrations`: modelo de datos, triggers, RLS y compatibilidad.

### Integraciones

- Privy: login, usuario, token y wallet.
- Supabase: proyectos, usuarios, inversiones, transacciones, repayments, KYC, schedules, media y ledger.
- OpenAI: copywriting y estructuracion de publicaciones.
- Coinbase: onramp de USDC.
- Polygon/USDC: transferencias e inversiones.
- Pimlico: quotes de paymaster y gas patrocinado.
- Nominatim/OpenStreetMap: geocoding para direcciones de negocio.
- Capacitor: shell Android.

### Seguridad

- APIs protegidas por bearer token Privy.
- Supabase admin solo en servidor.
- RLS y revocacion de acceso directo en tablas sensibles.
- Headers de seguridad: `X-Frame-Options`, HSTS, `nosniff`, referrer policy y permissions policy.
- Validacion de wallets, montos, fechas, estados y ownership.
- KYC por niveles para retiros.
- Prevencion de borrar/pausar proyectos con financiamiento activo.
- Deduplicacion por transaction hash para evitar registros duplicados.

### Escalabilidad

La arquitectura es escalable porque separa:

- UI por rol y dispositivo.
- APIs server-side por dominio.
- Helpers cliente por recurso.
- Ledger interno desacoplado de la transaccion on-chain.
- Payment schedule automatizado por triggers.
- Storage de media/documentos separado de registros transaccionales.
- Integraciones externas encapsuladas en rutas o helpers.

### Por que es una arquitectura solida

El sistema no depende de una sola pantalla para explicar el negocio. Tiene modelo de datos, reglas de permisos, eventos financieros, historial, contratos, KYC y storage. Ademas, maneja compatibilidad con esquemas legacy, lo que indica que ha evolucionado sin romper datos previos. Para una demo comercial, esto permite mostrar madurez tecnica; para un roadmap, permite agregar backoffice, analytics o white label sin reconstruir desde cero.

## 8. FAQ Comercial

### InvestApp custodia el dinero?

El posicionamiento actual es no-custodial. Los fondos se mueven mediante wallets y transacciones USDC en Polygon. La app registra y organiza la actividad, pero el flujo esta disenado alrededor de wallets y smart wallet infrastructure.

### Un usuario necesita saber de cripto?

No necesariamente. Privy permite crear wallet con una experiencia parecida a login tradicional, y el onramp permite comprar USDC. La interfaz habla en USD para reducir friccion.

### Que gana el emprendedor?

Puede publicar una oportunidad profesional, recibir capital, ver progreso de fundraising, conocer inversionistas y gestionar repayments desde un dashboard.

### Que gana el inversionista?

Puede descubrir negocios, comparar oportunidades, simular retornos, invertir, revisar contratos, seguir estado de pagos y consultar historial.

### La IA decide si un proyecto es bueno?

No. La IA ayuda a redactar y estructurar la publicacion. No reemplaza due diligence, scoring ni asesoria financiera.

### Hay contratos?

Si. La app genera una vista contractual basada en payment schedule, partes, montos, tasa y ledger interno. Puede evolucionar a contratos legales mas formales o firmas digitales.

### Se puede usar como white label?

La arquitectura lo permite como oportunidad futura. Ya existen roles, marketplace, dashboards, APIs y shell desktop que podrian adaptarse a marca/cliente.

### Que tan lista esta para produccion?

Tiene muchas piezas de producto real: auth, storage, APIs, ledger, KYC, payments, dashboards y seguridad basica. Aun asi, para produccion financiera se recomienda completar backoffice, auditoria legal, controles regulatorios, pruebas end-to-end y monitoreo operativo.

### La app soporta retiros?

Si. Tiene flujo de retiro con KYC, metodos por pais, banco/Breve y registro de solicitud. El procesamiento fiat aparece como flujo manual/operativo.

### Puede integrarse con bancos?

La base ya captura datos de payout y pais. La integracion bancaria automatica seria un siguiente paso, conectando proveedores de payout o APIs bancarias.

### Como se monetiza?

Por comision transaccional, SaaS para comunidades/fondos, planes premium, KYC/compliance, publicaciones destacadas y servicios administrados.

### Que features estan listas para una demo comercial?

Login, onboarding, feed, detalle, publicacion con IA, inversion simulada, transferencia, recibo, portafolio, dashboard emprendedor, historial, contratos, retiros, KYC, perfil, favoritos e idiomas.

### Que faltaria para vender a instituciones?

Backoffice, aprobacion manual de KYC, gestion de riesgos, roles administrativos, terminos legales ajustados, reporting exportable, auditoria completa y configuracion white label.

## 9. Pitch Corto

### Version 30 segundos

InvestApp es una plataforma fintech que conecta inversionistas con emprendedores que buscan capital. El emprendedor crea una publicacion profesional asistida por IA, el inversionista explora oportunidades, simula su retorno y envia fondos en una experiencia segura con wallet embebida. Despues, ambos pueden seguir inversiones, pagos, contratos e historial desde dashboards claros. Es el puente entre negocios reales, capital privado y trazabilidad digital.

### Version 2 minutos

Invertir en pequenos negocios suele ser informal: la oportunidad se descubre por redes, la informacion llega incompleta, el dinero se envia por otro canal y despues no hay claridad sobre pagos, retorno o documentos. InvestApp resuelve ese problema con una plataforma integral para emprendedores e inversionistas.

El emprendedor entra, responde un wizard guiado, carga fotos, explica su negocio, define cuanto capital necesita, como usara los fondos y que tasa ofrece. La IA convierte esa informacion en una publicacion profesional orientada a inversionistas. Una vez publicada, el proyecto aparece en el marketplace.

El inversionista explora oportunidades, guarda favoritas, revisa detalles, simula cuanto podria ganar y continua a una transferencia prellenada. La app usa wallet embebida, USDC en Polygon y registro en Supabase para crear una trazabilidad completa. Luego el inversionista ve su portafolio, ganancias proyectadas, contratos y estado de pagos.

Para el emprendedor, InvestApp tambien es un dashboard de fundraising y repayments. Puede ver cuanto ha levantado, quienes invirtieron, cuando debe pagar y ejecutar repayments con datos prellenados.

InvestApp combina marketplace, pagos, IA, KYC, contratos, ledger interno y dashboards en una sola experiencia. No es solo una app de inversiones: es infraestructura para digitalizar el financiamiento de negocios reales.

### Version para inversores

InvestApp ataca una oportunidad clara: el financiamiento privado de pequenos negocios y emprendimientos sigue siendo fragmentado, informal y poco trazable. Los emprendedores necesitan capital, pero no tienen herramientas para presentar oportunidades de forma profesional. Los inversionistas quieren acceso a negocios reales, pero necesitan informacion, confianza, pagos y seguimiento.

La plataforma crea un marketplace fintech de punta a punta. Incluye publicacion asistida por IA, marketplace de oportunidades, simulador de retorno, transferencias USDC con wallet embebida, registro de inversiones, dashboards por rol, contratos, payment schedules, repayments, KYC y retiros.

El modelo de negocio puede combinar SaaS para comunidades o instituciones, comision por inversion, planes premium y servicios de compliance/operacion. La arquitectura ya contempla identidad, datos, pagos, storage, ledger y seguridad server-side, lo que reduce el tiempo para llegar a pilotos comerciales.

La tesis es simple: hay millones de negocios que necesitan capital y una nueva generacion de inversionistas que quiere acceso directo, transparente y digital. InvestApp puede ser la infraestructura que conecta ambos lados.

## 10. Inventario De Features

| Feature | Estado estimado | Impacto | Prioridad | Complejidad | Potencial comercial |
|---|---:|---:|---:|---:|---:|
| Login con Privy | Implementado | Alto | Alta | Media | Alto |
| Wallet embebida | Implementado | Alto | Alta | Alta | Alto |
| Smart wallet/paymaster | Implementado parcial | Alto | Alta | Alta | Alto |
| Onboarding por rol | Implementado | Alto | Alta | Baja | Alto |
| Bloqueo de cambio de rol | Implementado | Medio | Media | Media | Medio |
| Home personalizado | Implementado | Alto | Alta | Media | Alto |
| Feed marketplace | Implementado | Alto | Alta | Media | Alto |
| Publicaciones premium/reels | Implementado | Medio | Media | Baja | Alto |
| Busqueda y filtros de feed | Implementado | Medio | Media | Baja | Medio |
| Favoritos | Implementado local | Medio | Media | Baja | Medio |
| Detalle de oportunidad | Implementado | Alto | Alta | Media | Alto |
| Detalle inversionista con calculadora | Implementado | Alto | Alta | Media | Alto |
| Simulacion de retorno | Implementado | Alto | Alta | Baja | Alto |
| Handoff a inversion pendiente | Implementado | Alto | Alta | Media | Alto |
| Transferencia prellenada | Implementado | Alto | Alta | Media | Alto |
| Envio USDC | Implementado | Alto | Alta | Alta | Alto |
| Registro de transacciones | Implementado | Alto | Alta | Media | Alto |
| Recibo de transaccion | Implementado | Medio | Media | Baja | Medio |
| Toasts transaccionales | Implementado | Medio | Media | Baja | Medio |
| Historial con filtros | Implementado | Alto | Alta | Media | Alto |
| Directorio de destinatarios | Implementado | Alto | Alta | Media | Alto |
| Top up Coinbase Onramp | Implementado segun configuracion | Alto | Media | Alta | Alto |
| Retiro fiat/manual payout | Implementado parcial | Alto | Alta | Alta | Alto |
| Configuracion bancaria | Implementado | Medio | Media | Media | Medio |
| Breve para Colombia | Implementado parcial | Medio | Media | Media | Medio |
| KYC summary | Implementado | Alto | Alta | Alta | Alto |
| Upload KYC documents | Implementado | Alto | Alta | Media | Alto |
| Niveles KYC por monto | Implementado | Alto | Alta | Alta | Alto |
| Wizard publicacion | Implementado | Alto | Alta | Alta | Alto |
| Draft de publicacion | Implementado | Alto | Alta | Media | Alto |
| Generacion IA de publicacion | Implementado | Alto | Alta | Alta | Muy alto |
| Fallback local de IA | Implementado | Medio | Media | Media | Medio |
| Upload media proyectos | Implementado | Alto | Alta | Media | Alto |
| Preview de publicacion | Implementado | Alto | Alta | Media | Alto |
| Edicion de publicacion | Implementado | Alto | Alta | Alta | Alto |
| Regla de un proyecto por emprendedor | Implementado | Medio | Media | Baja | Medio |
| Pausar proyecto | Implementado parcial | Medio | Media | Media | Medio |
| Eliminar proyecto con guardrails | Implementado | Medio | Media | Media | Medio |
| Dashboard emprendedor | Implementado | Alto | Alta | Media | Alto |
| Funding gauge | Implementado | Medio | Media | Media | Medio |
| Resumen de inversionistas | Implementado | Alto | Alta | Media | Alto |
| Repayments prellenados | Implementado | Alto | Alta | Alta | Alto |
| Payment schedule | Implementado | Alto | Alta | Alta | Alto |
| Contratos por credit ID | Implementado | Alto | Alta | Alta | Alto |
| Ledger interno | Implementado | Alto | Alta | Alta | Muy alto |
| Balances internos | Implementado | Alto | Alta | Alta | Alto |
| Portfolio inversionista | Implementado | Alto | Alta | Media | Alto |
| Salud de pagos | Implementado | Alto | Media | Media | Alto |
| Sparkline/performance chart | Implementado | Medio | Baja | Media | Medio |
| Busqueda global | Implementado | Medio | Media | Media | Medio |
| Notificaciones | Implementado local | Medio | Media | Media | Medio |
| Perfil personal | Implementado | Alto | Alta | Media | Alto |
| Avatar y foto de perfil | Implementado | Medio | Media | Media | Medio |
| Redes sociales | Implementado | Medio | Media | Media | Alto |
| Referral code | Implementado parcial | Medio | Media | Baja | Alto futuro |
| Idiomas/localizacion | Implementado parcial | Medio | Media | Media | Alto |
| Help center/FAQ/legal | Implementado | Medio | Media | Baja | Medio |
| Geocoding de direccion | Implementado | Medio | Media | Media | Medio |
| Android Capacitor | Configurado | Alto | Media | Media | Alto |
| Seguridad headers | Implementado | Medio | Media | Baja | Medio |
| RLS/revocacion tablas sensibles | Implementado en migraciones | Alto | Alta | Alta | Alto |
| Backoffice admin | No implementado | Alto | Alta futura | Alta | Muy alto |
| Curacion manual de premium | No implementado | Medio | Media futura | Media | Alto |
| Revision KYC operativa | Parcial/sin admin | Alto | Alta futura | Alta | Alto |
| Exportes/reporting | No detectado | Medio | Media futura | Media | Alto |
| White label | No implementado | Alto | Media futura | Alta | Muy alto |
| Scoring de riesgo | No implementado | Alto | Alta futura | Alta | Muy alto |
| Mensajeria real emprendedor-inversionista | UI parcial/incompleta | Alto | Alta futura | Media | Alto |
| Ratings/reviews reales | Placeholder/parcial | Medio | Media futura | Media | Medio |
| Automatizacion de reminders | No detectado | Medio | Media futura | Media | Alto |
| Firma digital de contratos | No detectado | Alto | Alta futura | Alta | Muy alto |

## Funciones Ocultas O Valiosas Para Marketing

- La app ya tiene lenguaje de no-custodia y wallet embebida: se puede vender como "Web3 sin complejidad cripto".
- El wizard con IA es un diferenciador muy demostrable: antes/despues de una publicacion.
- El ledger interno permite contar una historia de seriedad financiera, no solo UI bonita.
- La app soporta KYC, documentos y retiros: esto abre conversaciones fintech mas maduras.
- El perfil social del emprendedor puede venderse como "senales publicas de confianza".
- El payment schedule y contratos permiten una narrativa de responsabilidad post-inversion.
- La version desktop premium permite demos B2B; la version movil permite demos de usuario final.
- La arquitectura con APIs server-side protegidas permite hablar de seguridad y escalabilidad.
- La internacionalizacion permite posicionar la app como global-ready.

## Features Futuras Recomendadas

1. Backoffice administrativo para revisar KYC, withdrawals, proyectos destacados y disputas.
2. Mensajeria real entre inversionista y emprendedor.
3. Ratings y reviews conectados a datos reales.
4. Scoring de riesgo de proyectos basado en traccion, KYC, actividad y repayment history.
5. Data room por proyecto con documentos financieros.
6. Exportes PDF/CSV de contratos, ledger e historial.
7. Recordatorios automaticos de repayment.
8. Curacion premium con reglas comerciales.
9. White label por comunidad o institucion.
10. Firma digital y aceptacion formal de terminos por inversion.

## Lectura Comercial Final

InvestApp ya se puede presentar como un prototipo avanzado o MVP funcional de marketplace fintech. Su mayor fortaleza es que no se limita a una unica pantalla atractiva: contiene flujos completos de adquisicion, publicacion, inversion, pago, seguimiento, cumplimiento y documentacion. La oportunidad comercial mas fuerte esta en venderla como infraestructura para ecosistemas de inversion privada, con IA como acelerador de oferta y ledger/contratos como base de confianza.
