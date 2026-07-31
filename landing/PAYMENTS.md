# Puesta en marcha del pago (Stripe)

Guía paso a paso para activar el checkout de 9,90 € con Stripe. El código ya
está preparado: **no hay que programar nada**, solo crear las piezas en Stripe
y rellenar variables de entorno.

> **Antes de empezar — quién liquida el IVA.** Con Stripe **tú eres el
> comerciante** (merchant of record): el IVA de cada venta es responsabilidad
> tuya. Para ventas digitales a consumidores de la UE rige el régimen OSS:
> mientras tus ventas transfronterizas B2C no superen ~10.000 €/año puedes
> aplicar el 21% español a todo; por encima, hay que registrarse en OSS ante la
> AEAT y aplicar el IVA del país del comprador (Stripe Tax lo calcula solo).
> La alternativa sin fricción fiscal es Lemon Squeezy (ellos son el merchant of
> record y liquidan el IVA) — el código soporta ambos con la misma
> configuración. Esta guía asume Stripe; consúltalo con tu gestor.

## 1 · Cuenta y producto (5 min)

1. Crea la cuenta en **stripe.com** y complétala con tus datos de autónomo
   (los pagos reales no se activan hasta verificar identidad y cuenta bancaria).
2. Activa el **modo Test** (interruptor arriba a la derecha) para todo lo que
   sigue; al final se repite en modo Live.
3. **Catálogo de productos → + Añadir producto**:
   - Nombre: `Astro Trader — Capa de IA (licencia de por vida)`
   - Precio: **9,90 EUR**, tipo **Pago único**.
   - Si activas **Stripe Tax** (Configuración → Tax): marca el precio como
     **impuestos incluidos** para que el comprador siempre vea 9,90 €.

## 2 · Payment Link (3 min)

1. **Enlaces de pago → + Nuevo** y elige el producto anterior.
2. En **Después del pago**: «Redirigir a tu sitio web» con esta URL exacta:

   ```
   https://TU-DOMINIO/gracias?session_id={CHECKOUT_SESSION_ID}
   ```

   El marcador `{CHECKOUT_SESSION_ID}` es literal — Stripe lo sustituye. Es lo
   que permite que /gracias muestre la clave al comprador sin esperar ningún
   email.
3. Crea el enlace y copia su URL (`https://buy.stripe.com/…`).

## 3 · Webhook (3 min)

1. **Desarrolladores → Webhooks → + Añadir destino**.
2. URL del endpoint:

   ```
   https://TU-DOMINIO/api/webhooks/stripe
   ```

3. Eventos: selecciona únicamente **`checkout.session.completed`**.
4. Copia el **secreto de firma** (`whsec_…`).

## 4 · Variables de entorno (Railway → servicio de la landing)

```
PAYMENT_PROVIDER=stripe
PAYMENT_CHECKOUT_URL=https://buy.stripe.com/…      ← paso 2
PAYMENT_WEBHOOK_SECRET=whsec_…                     ← paso 3
DATABASE_URL=postgresql://…                        ← Neon (tabla licenses)
LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…"
LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…"
NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
```

- **Par de claves de licencia**: genera uno NUEVO para producción (comando en
  `.env.example`), guarda la privada solo en Railway, y pega la pública en
  `src/lib/license.ts` de la app antes de publicar la siguiente release.
- **Tabla `licenses`**: créala una vez con `npx drizzle-kit push` desde
  `landing/` con la `DATABASE_URL` puesta (o ejecuta el SQL equivalente en la
  consola de Neon).

## 5 · Prueba en modo Test (5 min)

1. Con las variables de test (`whsec` y payment link de test) desplegadas,
   abre el enlace de pago y paga con la tarjeta de prueba
   `4242 4242 4242 4242` (cualquier fecha futura, cualquier CVC).
2. Stripe redirige a `/gracias?session_id=cs_test_…`: en unos segundos la
   página debe **mostrar la clave** `ATI1.…` con su botón de copiar.
3. Comprueba en Desarrolladores → Webhooks que el evento llegó con **200**.
4. Pega la clave en la app (Ajustes → Capa de IA) y verifica que activa.
5. Repite los pasos 2-4 en **modo Live** con un pago real tuyo (puedes
   reembolsártelo desde el dashboard).

## Qué hace el código por ti

- Verifica la **firma** del webhook (HMAC del secreto) y descarta todo lo que
  no sea un `checkout.session.completed` pagado.
- Emite la licencia **una sola vez por pago** (idempotente sobre el id de la
  sesión): los reintentos de Stripe no duplican claves.
- Guarda email + clave en Neon para poder **recuperarla** desde /licencia.
- `/gracias` sondea la clave por `session_id` y la muestra con botón de copiar.
- El botón de compra del pricing se **activa solo** al existir
  `PAYMENT_CHECKOUT_URL`; sin ella muestra «disponible muy pronto».

## Pendiente conocido

- **Email con la clave**: la compra ya no lo necesita (la clave se muestra en
  /gracias), pero el reenvío desde /licencia todavía no envía correo — la
  clave queda recuperable en la base de datos. Cablearlo con Resend/Postmark
  es una mejora de ~1 hora cuando haya dominio verificado.
