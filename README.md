# 🛡️ UranoSafetyFirewall Híbrido MCP & Engine Plugin

Bienvenido al plugin **UranoSafetyFirewall**, un módulo de seguridad cognitiva de arquitectura híbrida diseñado para integrarse nativamente con **Urano Desktop** y **Urano Cloud (SaaS Multi-tenant)**.

Este plugin actúa como un **Firewall Cognitivo y Escudo de Inyección de Prompts** en tiempo real. Monitorea y analiza heurísticamente los mensajes entrantes de los clientes en tus canales de atención (WhatsApp, Telegram, Webchat) para bloquear intentos de evasión de reglas (*Jailbreaks*) o el uso de términos prohibidos antes de que alcancen el LLM, reduciendo costes y protegiendo tus directrices de negocio.

---

### 🚀 Una Nueva Era para la Seguridad de tus Agentes
*   **Filtro Heurístico en Caliente**: Escanea los mensajes entrantes en el hook `preMessageProcess` buscando firmas y patrones típicos de Jailbreak. Se ejecuta de forma local en **< 5ms** sin añadir latencia perceptible.
*   **Contador de Advertencias Persistente**: Utiliza la persistencia asíncrona de `PluginStore` para recordar los intentos de infracción del usuario en PostgreSQL/SQLite. Si excede el límite asignado (ej: 3 intentos), suspende la conversación de forma automática.
*   **Settings dinámicos del Vault**: Configura sensibilidad, límites, palabras de lista negra y mensajes personalizados para el rechazo o handoff humano directamente en la UI.

---

## 🏗️ Estructura del Proyecto

El plugin sigue la arquitectura híbrida avanzada de Urano:

```text
UranoSafetyFirewall/
├── 📄 config.ts                 # Manifiesto, settings del Vault y schemas de herramientas MCP
├── 📄 SKILL.md                  # Manual de instrucciones cognitivo para el Agente (System Prompt)
├── 📄 package.json              # Metadatos del módulo y scripts de bundling esbuild
├── 📄 tsconfig.json             # Configuraciones para soporte TypeScript en el IDE
├── 📄 urano.d.ts                # Soporte de tipos globales del Core de Urano
├── 📁 Plugins/
│   ├── 📁 Engine/
│   │   └── 📄 UranoSafetyFirewallEnginePlugin.ts # Middleware heurístico y de infracciones (preMessageProcess)
│   └── 📁 Safety/
│       └── 📄 SafetyPlugin.ts                    # Resolvedor de herramientas MCP de auditoría y reset
└── 📁 dist/                     # Código compilado unificado listo para producción
```

---

## 🧠 Lógica de Funcionamiento

1.  **Middleware de Seguridad (Engine)**:
    *   Al recibir un mensaje, el Engine analiza su contenido.
    *   Si detecta patrones de evasión o términos prohibidos (según la sensibilidad configurada), **intercepta el turno** (`status: 'intercepted'`), inyecta un Badge `🛡️ Advertencia: Infracción` y retorna la respuesta configurada (`SAFE_REJECTION_MESSAGE`).
    *   Si el usuario insiste y supera las infracciones máximas permitidas, suspende el chat por completo, inyecta el Badge `🔒 Chat Suspendido` en rojo y responde con el `CUSTOM_BAN_MESSAGE`.
2.  **Herramientas de Control (MCP)**:
    *   **`getInfracctionsLogs`**: Permite al agente auditar el estado del usuario y ver el contador de advertencias.
    *   **`resetInfracctions`**: Permite restablecer las advertencias y desbloquear el chat para que el cliente continúe la interacción.

---

## 🛠️ Comandos de Desarrollo

*   **`npm install`**: Instala las dependencias locales.
*   **`npm run deploy`**: Compila todo el código TypeScript en archivos CommonJS unificados en la carpeta `dist/`.
*   **`npm run urano-launch`**: Comprime el contenido de `dist/*` en **`urano-safety-firewall.zip`** listo para producción.

---

Desarrollado con ❤️ para la seguridad omnicanal de [UranoTools](https://uranoai.com).
