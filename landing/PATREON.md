# Nivel PRO por Patreon — puesta en marcha

Guía para dejar funcionando el acceso PRO: el suscriptor descarga el programa,
conecta su cuenta de Patreon y usa la capa de IA **sin configurar ninguna
clave** — porque las llamadas pasan por tu servidor y gastan tu clave.

Tiempo estimado: unos 40 minutos, casi todo esperando a que Railway despliegue.

---

## Antes de empezar: por qué hay un servidor por medio

La tentación evidente es meter tu clave de IA dentro del ZIP para que los
suscriptores no tengan que tocar nada. **No se puede.** Cualquiera descomprime
el ZIP y la lee; y como el código es MIT y está publicado en GitHub, ni siquiera
hace falta el ZIP.

Por eso la clave vive **solo** en Railway, y el programa del suscriptor le pide
a tu servidor que haga la llamada por él. Ese servidor es también donde se
cuenta la cuota: el programa es de código abierto, así que cualquier límite
puesto dentro de él se puede borrar editando dos líneas.

---

## 1. Crea el cliente de Patreon (10 min)

1. Entra en <https://www.patreon.com/portal/registration/register-clients>
   con la cuenta que gestiona tu campaña.
2. **Create Client**. Rellena nombre, descripción e icono — lo verán tus
   suscriptores en la pantalla de permisos.
3. En **Redirect URIs** pon exactamente:

   ```
   https://astrotrader.club/api/patreon/callback
   ```

   Para probar en local, añade también `http://localhost:3000/api/patreon/callback`.
4. Guarda y copia **Client ID** y **Client Secret**.
5. En la ficha del cliente verás también el **Token de acceso del creador**.
   Cópialo: con él el servidor averigua por su cuenta cuál es tu campaña, para
   que solo cuente quien te apoya a *ti* y no a cualquier creador de Patreon.

---

## 2. Consigue la clave de DeepSeek (5 min)

1. <https://platform.deepseek.com> → API keys → crear.
2. Cárgale saldo. Con la cuota de 100 análisis/mes por suscriptor, DeepSeek sale
   bastante más barato que Claude o GPT para este uso.
3. Copia la clave. **No la pegues en ningún sitio del repositorio.**

---

## 3. Configura Railway (10 min)

En el servicio de la landing, **Variables**:

| Variable | Valor | Para qué |
|---|---|---|
| `PATREON_CLIENT_ID` | del paso 1 | Identifica tu app ante Patreon |
| `PATREON_CLIENT_SECRET` | del paso 1 | **Secreto.** Nunca en el repo |
| `PATREON_CREATOR_ACCESS_TOKEN` | de la ficha del cliente | Con esto el servidor averigua tu campaña solo |
| `PATREON_REDIRECT_URI` | `https://astrotrader.club/api/patreon/callback` | Debe coincidir **carácter a carácter** con lo que pusiste en Patreon |
| `PATREON_MONTHLY_QUOTA` | `100` | Análisis incluidos al mes |
| `PATREON_MIN_PLEDGE_CENTS` | `0`, o el mínimo de tu tramo en céntimos | Si solo quieres dar PRO a partir de cierto tramo |
| `PRO_LLM_API_KEY` | la de DeepSeek | **Secreto.** La que se gasta |
| `PRO_LLM_MODEL` | `deepseek-chat` | Modelo a usar |
| `PRO_LLM_BASE_URL` | `https://api.deepseek.com` | Cambiando esto y el modelo puedes migrar a otro proveedor sin tocar código |
| `SITE_URL` | `https://astrotrader.club` | Para las redirecciones |
| `LICENSE_PRIVATE_KEY` | tu clave privada Ed25519 | Firma los accesos PRO |
| `LICENSE_PUBLIC_KEY` | la pública correspondiente | Los verifica |
| `DATABASE_URL` | tu cadena de Neon | Guarda suscriptores y consumo |

> ⚠️ **Si aún usas el par de claves de desarrollo, genera uno nuevo antes de
> abrir esto al público** y sustituye la pública también en
> `src/lib/license.ts` de la app. Quien tenga la privada puede emitir accesos.

### Rotar el par de claves

`npm run rotate-keys` (desde `landing/`) genera un par nuevo y lo deja
conectado de una sola vez, que es donde se rompen estas cosas:

- `landing/.env.local` → privada + pública, para firmar en local
- `src/lib/license.ts` → la pública **que la app acepta** (commitea el cambio)
- `landing/.env.railway-paste` → los dos valores listos para Railway, **en una
  sola línea cada uno** (los saltos van como `\n` literales, que
  `lib/license.ts` restaura). Pegar un PEM de varias líneas en Railway es
  justamente lo que hace que llegue truncado en `-----BEGIN PRIVATE KEY-----`
  y que el servidor no pueda firmar nada. Borra ese archivo al terminar.

Antes de rotar, mira si hay licencias vivas: `select count(*) from licenses`.
Rotar invalida todas las emitidas con el par anterior.

### Emitir una licencia a mano

`npm run issue-license -- correo@ejemplo.com` firma una licencia vitalicia
(la tuya de administrador, un caso de soporte, una cortesía). Verifica el
resultado contra la clave pública embebida en la app antes de imprimirlo, así
que si tu privada local no es la de producción te lo dice ahí mismo en vez de
darte una clave que la app rechaza en silencio.

### Las tablas ya están creadas

`patrons`, `ai_usage` y `licenses` existen ya en Neon.

⚠️ **No ejecutes `drizzle-kit push` contra esta base de datos.** La app de
escritorio y esta web comparten un mismo proyecto de Neon, pero el esquema de
aquí solo declara sus tres tablas — un push intentaría **borrar las de la app**
(`companies`, `crypto_assets`, `scan_log`) por no encontrarlas en él.
Si algún día hay que cambiar el esquema, hazlo con SQL explícito.

---

## 4. Prueba el circuito completo (10 min)

1. Entra en `https://astrotrader.club/pro` y pulsa **Conectar con Patreon**.
2. Autoriza. Deberías volver con un acceso largo que empieza por `ATI1.`
3. Ábrelo en el programa: **Ajustes → Capa de IA**, pégalo y guarda.
4. Abre cualquier acción y genera un análisis con IA. Si sale, el circuito
   entero funciona: app → tu servidor → DeepSeek → vuelta.

**Prueba también el caso negativo**, que es el que de verdad protege tu dinero:
entra con una cuenta de Patreon que **no** te apoye. Debe rechazarte con el
mensaje de "suscripción no activa" y no gastar ni una llamada.

---

## 5. Publica en Patreon

Genera los archivos:

```bash
npm run desktop:build
```

En `desktop/dist/` tendrás dos:

- `AstroTrader-Setup-X.Y.Z.exe` — el instalador normal. **Este es el que sube a
  GitHub Releases**, y es contra el que el programa comprueba si hay
  actualizaciones.
- `AstroTrader-X.Y.Z-x64.zip` — el portátil. **Este es el que subes a Patreon.**

En el post de Patreon, explica los tres pasos: descargar el ZIP, descomprimir y
ejecutar, y entrar en `astrotrader.club/pro` para conectar la cuenta.

### Por qué las actualizaciones siguen viniendo de GitHub

Patreon sirve los archivos tras su propio login, así que el programa no puede
descargarlos solo. GitHub Releases sí es público — y como el código ya lo es,
no ocultas nada manteniéndolo ahí. El ZIP de Patreon es la comodidad de la
primera instalación; las actualizaciones van por el canal que ya funciona.

---

## Lo que te va a costar

Con 100 análisis al mes por suscriptor, el gasto es **proporcional al uso real**,
no al número de suscriptores: la mayoría no agota su cuota.

El techo sí es predecible: `nº de suscriptores × 100 × coste por análisis`. Ese
techo es la razón de que la cuota exista. Revisa el gasto real en el panel de
DeepSeek durante el primer mes y ajusta `PATREON_MONTHLY_QUOTA` si hace falta —
es una variable de entorno, no requiere volver a desplegar código.

---

## Preguntas que te van a hacer

**"He cancelado y sigo teniendo acceso."** Es normal durante unos días: el
acceso se renueva cada 10 días y en esa renovación es cuando se comprueba con
Patreon. Como mucho, esos días.

**"Me da 'suscripción no activa' y sí estoy suscrito."** Patreon tarda unos
minutos en reflejar una suscripción nueva. Si persiste, comprueba que
`PATREON_CAMPAIGN_ID` es el correcto — con el ID equivocado, nadie aparece
como suscriptor.

**"Me dice que no puede consultar a Patreon."** Es un fallo temporal, no una
denegación. El sistema está hecho para no revocar el acceso a nadie cuando la
duda es nuestra: si Patreon no responde, el acceso vigente se conserva.

**"¿Puedo usar mi propia clave?"** Sí — la licencia de pago único (9,90 €)
permite conectar el proveedor propio, sin límite mensual. Son dos caminos
distintos y ambos siguen funcionando.
