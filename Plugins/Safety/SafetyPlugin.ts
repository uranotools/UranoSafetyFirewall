import { PluginBase } from '@core/PluginBase';

export class SafetyPlugin extends PluginBase {
    private configStore: any;

    constructor(moduleConfig: any) {
        super(moduleConfig);
        this.configStore = moduleConfig;
    }

    async executeAction(action: string, payload: any) {
        // En Urano, el Core inyecta _sessionId y _callPlugin automáticamente
        const sessionId = payload._sessionId;

        if (!sessionId) {
            throw new Error("ID de sesión no disponible en la herramienta.");
        }

        if (action === 'getInfracctionsLogs') {
            try {
                // Obtener datos dinámicos de persistencia asíncrona de PostgreSQL/SQLite a través de callPlugin
                const infracctions = await this.config.store.getSession('safety_infracctions') || 0;
                const isBanned = await this.config.store.getSession('safety_banned') || false;

                return {
                    success: true,
                    sessionId: sessionId,
                    infracctionsCount: infracctions,
                    isBanned: isBanned,
                    status: isBanned ? 'SUSPENDIDO' : (infracctions > 0 ? 'ADVERTIDO' : 'LIMPIO')
                };
            } catch (e: any) {
                throw new Error(`Fallo al consultar logs de infracción: ${e.message}`);
            }
        }

        if (action === 'resetInfracctions') {
            try {
                // Restablecer valores de seguridad en la base de datos de la sesión
                await this.config.store.setSession('safety_infracctions', 0);
                await this.config.store.setSession('safety_banned', false);

                // Quitar o redefinir badges a través de callPlugin
                await this.config._callPlugin('Core', 'SessionManager', 'updateBadge', {
                    sessionId: sessionId,
                    badge: {
                        id: 'safety-firewall-badge',
                        label: '🛡️ Firewall Activo',
                        color: 'success',
                        icon: 'ShieldCheck'
                    }
                });

                return {
                    success: true,
                    message: "Contador de advertencias e infracciones restablecido. Sesión desbloqueada con éxito."
                };
            } catch (e: any) {
                throw new Error(`Fallo al resetear infracciones: ${e.message}`);
            }
        }

        throw new Error(`Acción "${action}" no soportada en el plugin de Safety.`);
    }
}
