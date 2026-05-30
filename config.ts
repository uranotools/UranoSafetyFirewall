export const UranoSafetyFirewallConfig = {
    name: "UranoSafetyFirewall",
    description: "Middleware híbrido de seguridad que intercepta inyecciones de prompts (jailbreaks) e inputs en la lista negra en caliente.",
    icon: "ShieldAlert",
    category: "Seguridad",

    // ── CONFIGURACIÓN DEL ENGINE MIDDLEWARE ──
    enginePlugin: true,
    engineHooks: [
        'preMessageProcess'
    ],

    // Habilitado en Desktop y Cloud
    inCloud: true,
    inDesktop: true,

    // ── VARIABLES DE ENTORNO EN CRIPTOGRAFÍA DE VAULT POR TENANT / USUARIO ──
    settings: [
        {
            name: 'SAFETY_SENSITIVITY',
            type: 'select',
            title: 'Sensibilidad del Firewall',
            options: [
                { label: 'Baja (Heurística simple y Palabras prohibidas)', value: 'low' },
                { label: 'Media (Heurística extendida contra inyecciones de prompt)', value: 'medium' },
                { label: 'Alta (Filtro estricto heurístico y bloqueo proactivo)', value: 'high' }
            ],
            required: true
        },
        {
            name: 'MAX_INFRACCTIONS_BEFORE_BAN',
            type: 'number',
            title: 'Límite de Infracciones permitidas',
            description: 'Cantidad de consultas hostiles consecutivas toleradas antes de suspender al cliente. Default: 3',
            required: true
        },
        {
            name: 'CUSTOM_BLOCKED_WORDS',
            type: 'text',
            title: 'Palabras y Temas Prohibidos',
            description: 'Lista separada por comas de términos que causarán rechazo inmediato (ej: hacker, contrasena, gratis, bypass)'
        },
        {
            name: 'SAFE_REJECTION_MESSAGE',
            type: 'text',
            title: 'Mensaje de Rechazo',
            description: 'Mensaje que el bot retornará al interceptar un input inseguro.',
            required: true
        },
        {
            name: 'CUSTOM_BAN_MESSAGE',
            type: 'text',
            title: 'Mensaje de Bloqueo / Handoff',
            description: 'Mensaje a mostrar si el usuario excede las infracciones y el chat queda suspendido.',
            required: true
        }
    ],

    // ── ESQUEMAS DE HERRAMIENTAS MCP EXPUESTAS AL AGENTE ──
    pluginSchemas: {
        Auditing: {
            actions: {
                getInfracctionsLogs: {
                    label: 'Consultar Infracciones del Chat',
                    description: 'Obtiene el historial de infracciones y el estado de advertencia acumulado en la sesión de chat activa.',
                    fields: []
                },
                resetInfracctions: {
                    label: 'Restablecer Advertencias',
                    description: 'Limpia el contador de advertencias del cliente para habilitar nuevamente la sesión.',
                    fields: []
                }
            }
        }
    }
};
