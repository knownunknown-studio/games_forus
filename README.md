# Games For Us

Free two-player web games that only work when both partners cooperate.

## Two Halves

A bomb-defusal game for two. Each player sees half of the device and holds the manual for the other half, so you describe, read and pass tools back and forth until every module is disarmed.

- **Modules:** wires, glyph keypad, pulse lights, word lock
- **Tools:** screwdriver, wire cutters, UV torch, multimeter, split between two toolboxes
- **Utilities:** shared notes, one pause and one hint per round

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 in two browser windows (or two phones on the same network), create a room in one and join with the code in the other.

## Production

```bash
npm run build
```

```bash
npm start
```

The server serves the built client and the game socket on `PORT` (default 3001).

## Project layout

```
games/two-halves/   game rules, manual data, tests
server/             rooms and WebSocket server
shared/             message types shared by client and server
client/             React app (Vite)
```

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

Design file: [Two Halves in Figma](https://www.figma.com/design/qHfUaejCKJepPHW7cYzUgN)
