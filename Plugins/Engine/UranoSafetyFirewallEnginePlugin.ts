import { EnginePluginBase, EnginePreProcessResult } from '@core/EnginePluginBase';
import type { SessionContext } from '@core/runtime/SessionContext';

export class UranoSafetyFirewallEnginePlugin extends EnginePluginBase {

    // Lista estática de expresiones regulares para firmas comunes de Jailbreak / Prompt Injection
    private static readonly SENSITIVE_PATTERNS = [
        /ignore\s+(?:all\s+)?previous\s+instructions/i,
        /ignora\s+(?:todas\s+las\s+)?instrucciones\s+anteriores/i,
        /act\s+as\s+a\s+simulated/i,
        /actua\s+como\s+un\s+simulador/i,
        /new\s+system\s+directive/i,
        /nueva\s+directiva\s+del\s+sistema/i,
        /bypass\s+(?:the\s+)?safety/i,
        /desactivar\s+(?:el\s+)?filtro/i,
        /jailbreak/i,
        /unrestricted\s+mode/i,
        /modo\s+sin\s+restricciones/i,
        /system\s*[\:\-]\s*override/i
    ];

    private static readonly EXTENDED_PATTERNS = [
        /ignore\s+rules/i,
        /ignorar\s+reglas/i,
        /dime\s+la\s+contrase/i,
        /revelar\s+secreto/i,
        /reveal\s+secret/i,
        /system\s+prompt/i,
        /instrucciones\s+de\s+sistema/i
    ];

    async preMessageProcess(ctx: SessionContext, message: any): Promise<EnginePreProcessResult> {
        const sensitivity = ctx.getSecret('SAFETY_SENSITIVITY') || 'medium';
        const maxInfracctionsRaw = ctx.getSecret('MAX_INFRACCTIONS_BEFORE_BAN') || '3';
        const customBlockedWords = ctx.getSecret('CUSTOM_BLOCKED_WORDS') || '';
        const safeRejection = ctx.getSecret('SAFE_REJECTION_MESSAGE') || 'Disculpa, no puedo responder a ese tipo de consulta. ¿En qué más te puedo ayudar?';
        const customBanMessage = ctx.getSecret('CUSTOM_BAN_MESSAGE') || 'Has excedido el límite de consultas inusuales. Esta conversación ha sido suspendida para asistencia humana.';

        const maxInfracctions = parseInt(maxInfracctionsRaw, 10);

        // 1. Extraer el texto crudo del mensaje del usuario
        let userText = '';
        if (message && typeof message.content === 'string') {
            userText = message.content;
        } else if (message && Array.isArray(message.content)) {
            userText = message.content
                .filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join(' ');
        }

        if (userText.trim().length === 0) {
            return { status: 'continue' };
        }

        // 2. Verificar si el usuario ya está suspendido (Banned)
        const isBanned = await ctx.store.getSession<boolean>('safety_banned');
        if (isBanned) {
            ctx.addBadge({
                id: 'safety-firewall-badge',
                label: '🔒 Chat Suspendido',
                color: 'danger',
                icon: 'ShieldOff'
            });

            return {
                status: 'intercepted',
                overrideResponse: customBanMessage
            };
        }

        let threatDetected = false;
        let threatReason = '';

        // 3. Analizar palabras prohibidas configuradas en el Vault
        if (customBlockedWords.trim().length > 0) {
            const blockedWords = customBlockedWords.split(',').map(w => w.trim().toLowerCase());
            const textLower = userText.toLowerCase();

            for (const word of blockedWords) {
                if (word.length > 0 && textLower.includes(word)) {
                    threatDetected = true;
                    threatReason = `Palabra Prohibida detectada: "${word}"`;
                    break;
                }
            }
        }

        // 4. Analizar firmas heurísticas de Jailbreak según sensibilidad
        if (!threatDetected) {
            // Sensibilidad Baja o Superior: Patrones de Jailbreak Críticos
            for (const pattern of UranoSafetyFirewallEnginePlugin.SENSITIVE_PATTERNS) {
                if (pattern.test(userText)) {
                    threatDetected = true;
                    threatReason = 'Firma de Jailbreak (Sensibilidad Baja/Media) detectada.';
                    break;
                }
            }
        }

        if (!threatDetected && (sensitivity === 'medium' || sensitivity === 'high')) {
            // Sensibilidad Media o Superior: Patrones Extendidos
            for (const pattern of UranoSafetyFirewallEnginePlugin.EXTENDED_PATTERNS) {
                if (pattern.test(userText)) {
                    threatDetected = true;
                    threatReason = 'Firma de Jailbreak (Sensibilidad Media/Alta) detectada.';
                    break;
                }
            }
        }

        if (!threatDetected && sensitivity === 'high') {
            // Sensibilidad Alta: Filtro estricto heurístico adicional
            // Por ejemplo, prohibir que el usuario use la palabra "system" y "ignore" juntas
            if (userText.toLowerCase().includes('system') && userText.toLowerCase().includes('ignore')) {
                threatDetected = true;
                threatReason = 'Filtro estricto de sensibilidad Alta activado.';
            }
        }

        // 5. Gestión del Estado de Infracciones
        if (threatDetected) {
            let infracctionsCount = await ctx.store.getSession<number>('safety_infracctions') || 0;
            infracctionsCount++;

            console.warn(`[UranoSafetyFirewall] Amenaza interceptada en sesión ${ctx.sessionId}. Motivo: ${threatReason}. Infracciones: ${infracctionsCount}/${maxInfracctions}`);

            await ctx.store.setSession('safety_infracctions', infracctionsCount);

            // Inyectar alerta silenciosa en el historial para auditoría del sistema
            ctx.injectSystemMessage(`[ALERTA DE SEGURIDAD: Entrada del usuario interceptada. Motivo: ${threatReason}. Intento ${infracctionsCount}/${maxInfracctions}]`);

            if (infracctionsCount >= maxInfracctions) {
                // Registrar suspensión permanente del chat en PostgreSQL/SQLite
                await ctx.store.setSession('safety_banned', true);

                ctx.addBadge({
                    id: 'safety-firewall-badge',
                    label: '🔒 Chat Suspendido',
                    color: 'danger',
                    icon: 'ShieldOff'
                });

                return {
                    status: 'intercepted',
                    overrideResponse: customBanMessage
                };
            } else {
                // Registrar advertencia temporal
                ctx.addBadge({
                    id: 'safety-firewall-badge',
                    label: `🛡️ Adv: Infracción ${infracctionsCount}/${maxInfracctions}`,
                    color: 'warning',
                    icon: 'ShieldAlert'
                });

                return {
                    status: 'intercepted',
                    overrideResponse: safeRejection
                };
            }
        }

        return { status: 'continue' };
    }
}
