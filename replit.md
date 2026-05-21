# The Duck Game

A multiplayer browser-based game where players control ducks to collect pancakes and feed a central carrot.

## Architecture

- **Frontend only**: Pure static HTML5 Canvas game, no backend server
- **`index.html`**: Entry point with canvas, room selector UI, and styles
- **`sketch.js`**: Entire game engine — canvas drawing helpers, game logic, multiplayer sync, powers, and save/load
- **`chest-sheet.jpg`**: Sprite sheet for the treasure chest (2×2 grid: closed, cracked, opening, fully open)
- **`quack.mp3`**: Sound effect for the Quaking Power
- **Multiplayer**: Connects to an external Socket.io server at `https://server-5jkd.onrender.com/`

## Running the Project

```
npm run dev
```

Served as static files on port 5000.

## Game Controls

- **WASD** — move duck
- **Spacebar** — dash (uses stamina)
- **E** — interact (enter treehouse, offer pancakes to carrot, open chest)
- **ESC** — exit treehouse scene
- **Click** — quack (seismic wave attack, requires Quaking Power)

## Features

### Quaking Power
- Found in the treasure chest inside the treehouse
- Costs 3 pancakes to enter the treehouse
- Opening the chest shows a BotW-style item popup
- Once unlocked, clicking emits a quack sound and 3 expanding seismic wave arcs + 3 lines from the duck's bill

### Save System
- Progress auto-saved to `localStorage` every ~5 seconds while in game
- Also saved on scene transitions (entering/leaving treehouse, opening chest)
- Saves: duck position, pancake count, stamina, carrot size, hasQuack power, chest opened state

## Dependencies

- `serve` ^14.2.4 — static file server
