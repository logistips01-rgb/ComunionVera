# 🤍 Primera Comunión de Vera

Web-regalo para la comunión de Vera: invitación, cuenta atrás, elección de menú,
confirmación de asistencia, lista de regalos y libro de mensajes.
Se publica gratis en **Firebase Hosting**, con una dirección del tipo
`https://comunion-vera.web.app` (sin comprar dominio).

## Qué incluye

| Página | Qué hace |
|---|---|
| `index.html` | Foto, cuenta atrás, ceremonia y celebración (con "Cómo llegar"), añadir al calendario, enviar invitación por WhatsApp, menús, formulario de confirmación (cada persona elige su menú + alergias), lista de regalos reservables y libro de mensajes. |
| `index.html?para=Tíos Juan y Marta` | Invitación personalizada: saluda al invitado por su nombre y rellena el formulario. Se genera desde la propia web ("Crear invitación personalizada"). |
| `admin.html` | Panel para los organizadores (entrar con Google): resumen de asistentes y menús, tabla de confirmaciones, quién ha reservado cada regalo, moderar mensajes y descargar todo en CSV para Excel. |

## Personalizar

Todo se cambia en **`public/js/config.js`**: fecha, lugares, enlaces de mapas,
menús, regalos, Bizum/IBAN opcional…

**Foto de Vera:** copia la foto como `public/img/vera.jpg` y en `config.js`
cambia `foto: "img/vera.svg"` por `foto: "img/vera.jpg"`.

Mientras Firebase no esté conectado, la web funciona en **modo demo**
(los datos se guardan solo en tu navegador) para poder probarla.

## Conectar con Firebase y publicar (≈15 minutos)

1. **Crear el proyecto** en <https://console.firebase.google.com> → *Añadir proyecto*.
   El ID del proyecto será tu dirección: si es `comunion-vera` → `comunion-vera.web.app`.
   (Google Analytics no hace falta.) El plan gratuito *Spark* es suficiente.
2. **Base de datos:** *Compilación → Firestore Database → Crear base de datos*
   → ubicación `eur3 (europe)` → modo producción.
3. **Inicio de sesión del panel:** *Compilación → Authentication → Comenzar*
   → habilita el proveedor **Google**.
4. **Registrar la web:** *Configuración del proyecto (⚙️) → Tus apps → icono `</>`*.
   Copia el objeto `firebaseConfig` y pégalo en `public/js/config.js`.
5. **Tu correo de administrador:** cámbialo en `public/js/config.js` (`admins`)
   **y** en `firestore.rules` (`tu-correo@gmail.com`).
6. Si el ID del proyecto no es `comunion-vera`, cámbialo en `.firebaserc`.
7. **Publicar** (necesitas [Node.js](https://nodejs.org) instalado):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy
   ```

   Al terminar te dará la URL `https://<tu-proyecto>.web.app` 🎉
   Para actualizar la web tras cualquier cambio, vuelve a ejecutar `firebase deploy`.

## Privacidad y seguridad

Las reglas de `firestore.rules` permiten a los invitados **enviar** confirmaciones,
mensajes y reservas, pero los datos personales (confirmaciones, teléfonos y quién
reservó cada regalo) solo los pueden **leer** los correos de administrador.
Un regalo reservado no puede volver a reservarse (solo un admin puede liberarlo).
