// ============================================================
//  CONFIGURACIÓN DE LA WEB DE LA COMUNIÓN DE VERA
//  Todo lo que hay que personalizar está en este archivo.
// ============================================================

// 1) Datos de Firebase.
//    Consola de Firebase → Configuración del proyecto → Tus apps → Web (</>).
//    Mientras esté "PEGA_AQUI", la web funciona en MODO DEMO
//    (guarda los datos solo en tu navegador, ideal para probar).
export const firebaseConfig = {
  apiKey: "AIzaSyBPDmaONMNyrFpQhEW9KwWoFOgRV92Azc8",
  authDomain: "comunion-vera.firebaseapp.com",
  projectId: "comunion-vera",
  storageBucket: "comunion-vera.firebasestorage.app",
  messagingSenderId: "25352002110",
  appId: "1:25352002110:web:256694dd3a2a62d5e8cf6f",
};

// 2) Correos que pueden entrar al panel de organización (admin.html).
//    ¡Pon los mismos en firestore.rules!
export const admins = ["veracomunion@gmail.com"];

// 3) Datos del evento.
export const evento = {
  nombre: "Vera",
  titulo: "Mi Primera Comunión",
  foto: "img/vera.svg", // sustituye por img/vera.jpg cuando tengas la foto
  // Fecha y hora de la ceremonia en formato ISO (con zona horaria de España)
  fecha: "2027-05-15T12:00:00+02:00",
  fechaTexto: "Sábado, 15 de mayo de 2027",
  frase: "“Dejad que los niños se acerquen a mí” — Mc 10, 14",
  mensaje:
    "Me haría muchísima ilusión que me acompañaras en este día tan especial para mí y para mi familia.",
  ceremonia: {
    hora: "12:00 h",
    lugar: "Parroquia de San Juan",
    direccion: "Calle Ejemplo, 1 · Tu ciudad",
    mapa: "https://maps.google.com/?q=Parroquia+de+San+Juan",
  },
  celebracion: {
    hora: "14:00 h",
    lugar: "Restaurante El Jardín",
    direccion: "Avenida Ejemplo, 10 · Tu ciudad",
    mapa: "https://maps.google.com/?q=Restaurante+El+Jardin",
  },
  fechaLimiteConfirmacion: "30 de abril de 2027",
};

// 4) Menús a elegir. Cada invitado escoge uno al confirmar.
export const menus = [
  {
    id: "carne",
    nombre: "Menú Carne",
    platos: ["Entrantes para compartir", "Solomillo ibérico con patatas", "Tarta de comunión"],
  },
  {
    id: "pescado",
    nombre: "Menú Pescado",
    platos: ["Entrantes para compartir", "Lubina a la espalda con verduras", "Tarta de comunión"],
  },
  {
    id: "vegetariano",
    nombre: "Menú Vegetariano",
    platos: ["Entrantes vegetales", "Risotto de setas", "Tarta de comunión"],
  },
  {
    id: "infantil",
    nombre: "Menú Infantil",
    platos: ["Croquetas y fingers de pollo", "Pizza o hamburguesa", "Helado y tarta"],
  },
];

// 5) Lista de regalos. Los invitados pueden "reservar" uno para que no se repita.
//    El "id" debe ser único y sin espacios.
export const regalos = [
  { id: "bicicleta", nombre: "Bicicleta", detalle: "Talla 24”, de color lila", enlace: "" },
  { id: "lego", nombre: "Set de LEGO Friends", detalle: "Casa en el árbol", enlace: "" },
  { id: "libros", nombre: "Colección de libros", detalle: "Saga favorita de Vera", enlace: "" },
  { id: "reloj", nombre: "Reloj", detalle: "Primer reloj con su nombre grabado", enlace: "" },
  { id: "patines", nombre: "Patines", detalle: "Talla 34", enlace: "" },
  { id: "camara", nombre: "Cámara instantánea", detalle: "Tipo Instax, con carretes", enlace: "" },
];

// Si preferís aportación económica, pon aquí el IBAN o Bizum (déjalo vacío "" para ocultarlo).
export const aportacion = {
  texto: "Si lo prefieres, también puedes colaborar con su hucha:",
  dato: "",
};

// 6) Álbum compartido de Google Fotos para subir fotos en calidad original.
//    Pega aquí el enlace para compartir del álbum (déjalo vacío "" para ocultar el botón).
// Oculto de momento. Para volver a mostrarlo, pon: "https://photos.app.goo.gl/J7meRz7K8g57YZ7NA"
export const albumGoogleFotos = "";
