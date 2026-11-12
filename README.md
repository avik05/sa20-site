# SA·20

A scroll documentary in two voices, with a walkable 3D model of the room.

## Run it

```bash
npm install
npm run dev      # development, with live reload
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Host the contents of `dist/` on any static host. It must be served over http(s); opening `dist/index.html` straight from disk will not work.

## Where things live

- `index.html` — all the written content, chapter by chapter
- `src/data.js` — the term-one reel cards, chapter previews, photo-wall captions
- `src/main.js` — scroll engine, chapter cards, chapter select
- `src/gl/photos.js` — WebGL photo layer (reveal, scroll bend, hover ripple, hero montage)
- `src/scenes/mountain.js` — the 9 PM particle mountain
- `src/scenes/globe.js` — the route globe
- `src/room/room.js` — the SA 20 model: dimensions, furniture, markers and their captions
- `src/ui/` — cursor, photo wall, sound
- `public/photos/` — story photos (`17`–`21` are still empty reel slots)
- `public/room/` — poster and desk textures cropped from the room photos

The page is marked `noindex` but has no password. Put it behind one if you host it.
