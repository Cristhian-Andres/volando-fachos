# 🚀 A Volar Facho

Juego arcade retro construido con **Next.js 15**, **React 19** y **TypeScript**. El personaje despega como cohete hacia el cielo y debe esquivar los frailejones que caen como naves en picada. Entre más alto llegues, más frailejones llueven. Si chocas… pierdes, y te espera el póster de **"VOTA POR LA VIDA"**.

> By [Cristhian Luna](https://www.instagram.com/cristhian_lunaa) - Team Cauca

## 🎮 Cómo se juega

| Acción | Celular | Computadora |
|---|---|---|
| Despegar | Tocar la pantalla | `Espacio`, `↑` o `Enter` |
| Moverse | Arrastrar el dedo | `←` / `→`, `A` / `D` o seguir el mouse |

- El puntaje es la **altura en metros** alcanzada.
- El récord (MÁXIMO) se guarda en el navegador (`localStorage`).
- La dificultad escala con la altura: los frailejones caen más rápido, más seguido y de a varios.
- Al subir lo suficiente, el cielo se oscurece y aparecen estrellas: vas llegando al espacio.

## 🕹️ Flujo del juego

1. **Menú**: splash retro con el título *A VOLAR FACHO* y el lema *FIRMES A LA CÁRCEL*.
2. **Intro**: video de inicio (se puede saltar con el botón SALTAR).
3. **Despegue**: toca la pantalla y el cohete arranca con su estela de propulsión.
4. **Juego**: esquiva la lluvia de frailejones que crece con la altura.
5. **Derrota**: explosión, temblor de pantalla y el póster centrado con el botón ↺ REINTENTAR, mientras los frailejones siguen cayendo de fondo.

## 🛠️ Stack técnico

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Canvas 2D para el render del juego (360×640, `image-rendering: pixelated`)
- CSS Modules con estética retro: fuente *Press Start 2P*, scanlines CRT, botones arcade
- Sprites de frailejones generados **proceduralmente** en canvas (roseta de hojas plateadas, flores amarillas y tronco con necromasa, con 4 variantes aleatorias)
- Parallax de nubes en 2 capas, suelo al despegue, estrellas y oscurecimiento progresivo del cielo
- Audio HTML5: música de fondo en loop, sonidos de despegue y explosión
- Responsive real: pantalla completa en móvil (con `safe-area-insets`) y gabinete arcade 9:16 en escritorio

## 📁 Estructura del proyecto

```
flappy-facho/
├── app/
│   ├── layout.tsx        # Layout raíz, fuente retro y metadata
│   ├── page.tsx          # Página principal
│   └── globals.css       # Estilos globales
├── components/
│   ├── Game.tsx          # Toda la lógica del juego (componente cliente)
│   └── Game.module.css   # Estilos del juego (HUD, overlays, póster)
├── public/
│   ├── poster.jpg        # Póster "VOTA POR LA VIDA" (pantalla de derrota)
│   └── sprites/          # Imágenes, audio y videos del juego
├── legacy/               # Versión original (HTML + JS vanilla)
└── package.json
```

## 🚀 Desarrollo local

Requisitos: Node.js 18.18+ (probado con Node 24).

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev
# → http://localhost:3000

# Build de producción
npm run build
npm start
```

## 📝 Notas

- La música de fondo es `.ogg`, formato que **no reproduce Safari/iOS**; el resto del juego funciona normal allí. Para soporte completo en iPhone, convertir a `.m4a`/`.mp3`.
- La carpeta `legacy/` conserva la versión original del juego (Flappy Bird clásico en HTML + JS minificado) como referencia histórica.
