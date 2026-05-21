// ─── Canvas Setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
canvas.width = 600;
canvas.height = 600;
const ctx = canvas.getContext("2d");
ctx.lineCap = "round";
ctx.lineJoin = "round";

// ─── Multiplayer ─────────────────────────────────────────────────────────────
// UPDATED: Now points to your specific server URL
const SERVER_URL = "https://server-5jkd.onrender.com/";
const socket = io(SERVER_URL);

let mySocketId = null;
let otherPlayers = {};
let currentRoom = null;

const netStatus = document.getElementById("net-status");
const roomInput = document.getElementById("roomInput");
const roomOverlay = document.getElementById("room-overlay");
const nameInput = document.getElementById("nameInput");
const nameOverlay = document.getElementById("name-overlay");
const restartBtn = document.getElementById("restartBtn");

socket.on("connect", () => {
  mySocketId = socket.id;
  if (netStatus) {
    netStatus.textContent = "online";
    netStatus.className = "connected";
  }
});
socket.on("disconnect", () => {
  if (netStatus) {
    netStatus.textContent = "offline";
    netStatus.className = "error";
  }
});

// UPDATED: Your server.js emits 'game:event' and 'admin-update', but for
// the game client, we listen for 'game:event' to update other players.
socket.on("game:event", (data) => {
  if (data.senderId !== socket.id) {
    if (data.type === "chat") {
      // Route to the chat UI if it's listening
      if (window._chatReceive) window._chatReceive(data.author, data.text);
    } else {
      otherPlayers[data.senderId] = data.payload;
    }
  }
});

// Send a chat message to everyone else in the current room
function sendChatToRoom(author, text) {
  if (!currentRoom) return;
  socket.emit("game:event", {
    roomId: currentRoom,
    type: "chat",
    author: author,
    text: text,
    payload: {}, // kept so old handlers don't throw
  });
}

socket.on("room:player_left", (data) => {
  delete otherPlayers[data.player.id];
});

function joinRoom(name) {
  currentRoom = name;
  // UPDATED: Matches the 'room:join' listener in your server.js
  socket.emit("room:join", {
    roomId: name,
    playerName: nameInput ? nameInput.value.trim() || "Duck" : "Duck",
  });
}

// Emit local player state to server (called each frame while in game)
let _emitTick = 0;
function emitMove() {
  if (!currentRoom) return;
  _emitTick++;
  if (_emitTick % 3 !== 0) return;

  // UPDATED: Wrapped in "payload" to match your server.js logic
  socket.emit("game:event", {
    roomId: currentRoom,
    payload: {
      x: ducks.x,
      y: ducks.y,
      d: ducks.d,
      r1: ducks.r1,
      r2: ducks.r2,
      r3: ducks.r3,
      r4: ducks.r4,
      r5: ducks.r5,
      r6: ducks.r6,
      walking: ducks.walking,
      name: nameInput ? nameInput.value.trim() || "Duck" : "Duck",
    },
  });
}

// ─── Math Helpers (p5 uses degrees by default) ───────────────────────────────
const DEG = Math.PI / 180;
function sin(d) {
  return Math.sin(d * DEG);
}
function cos(d) {
  return Math.cos(d * DEG);
}
function atan2(y, x) {
  return Math.atan2(y, x) / DEG;
}
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function random(a, b) {
  return b === undefined ? Math.random() * a : Math.random() * (b - a) + a;
}
function round(n) {
  return Math.round(n);
}

// ─── Drawing State ────────────────────────────────────────────────────────────
let _fill = [0, 0, 0];
let _stroke = [0, 0, 0];
let _lineWidth = 1;
let _doFill = true;
let _doStroke = true;
let _textSize = 12;
let _textFont = "sans-serif";
let _textAlignH = "center";
let _textAlignV = "middle";
let _stateStack = [];

function _colorStr(c) {
  if (c.length === 1) return `rgb(${c[0]},${c[0]},${c[0]})`;
  if (c.length === 2) return `rgba(${c[0]},${c[0]},${c[0]},${c[1] / 255})`;
  if (c.length === 3) return `rgb(${c[0]},${c[1]},${c[2]})`;
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
}

function fill(...args) {
  _fill = args;
  _doFill = true;
}
function noFill() {
  _doFill = false;
}
function stroke(...args) {
  _stroke = args;
  _doStroke = true;
}
function noStroke() {
  _doStroke = false;
}
function strokeWeight(w) {
  _lineWidth = w;
}

function _applyFill() {
  if (_doFill) {
    ctx.fillStyle = _colorStr(_fill);
    ctx.fill();
  }
}
function _applyStroke() {
  if (_doStroke) {
    ctx.strokeStyle = _colorStr(_stroke);
    ctx.lineWidth = _lineWidth;
    ctx.stroke();
  }
}

function push() {
  ctx.save();
  _stateStack.push({
    fill: [..._fill],
    stroke: [..._stroke],
    lineWidth: _lineWidth,
    doFill: _doFill,
    doStroke: _doStroke,
    textSize: _textSize,
    textFont: _textFont,
    textAlignH: _textAlignH,
    textAlignV: _textAlignV,
  });
}
function pop() {
  ctx.restore();
  const s = _stateStack.pop();
  _fill = s.fill;
  _stroke = s.stroke;
  _lineWidth = s.lineWidth;
  _doFill = s.doFill;
  _doStroke = s.doStroke;
  _textSize = s.textSize;
  _textFont = s.textFont;
  _textAlignH = s.textAlignH;
  _textAlignV = s.textAlignV;
}

function translate(x, y) {
  ctx.translate(x, y);
}
function rotate(d) {
  ctx.rotate(d * DEG);
}
function scale(x, y) {
  ctx.scale(x, y === undefined ? x : y);
}

function background(...args) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = _colorStr(args);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function ellipse(x, y, w, h) {
  if (h === undefined) h = w;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
  _applyFill();
  _applyStroke();
}

function rect(x, y, w, h, r) {
  const rx = x - w / 2,
    ry = y - h / 2;
  ctx.beginPath();
  if (r) {
    ctx.roundRect(rx, ry, w, h, r);
  } else {
    ctx.rect(rx, ry, w, h);
  }
  _applyFill();
  _applyStroke();
}

function line(x1, y1, x2, y2) {
  if (!_doStroke) return;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = _colorStr(_stroke);
  ctx.lineWidth = _lineWidth;
  ctx.stroke();
}

function triangle(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  _applyFill();
  _applyStroke();
}

function quad(x1, y1, x2, y2, x3, y3, x4, y4) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  _applyFill();
  _applyStroke();
}

function _updateFont() {
  ctx.font = `${_textSize}px "${_textFont}"`;
}
function textSize(s) {
  _textSize = s;
  _updateFont();
}
function textFont(f) {
  _textFont = f;
  _updateFont();
}
function textAlign(h, v) {
  const hmap = { center: "center", left: "left", right: "right" };
  const vmap = {
    center: "middle",
    top: "top",
    bottom: "bottom",
    baseline: "alphabetic",
  };
  _textAlignH = hmap[String(h).toLowerCase()] || "center";
  _textAlignV = v ? vmap[String(v).toLowerCase()] || "middle" : "middle";
}

function text(str, x, y) {
  ctx.font = `${_textSize}px "${_textFont}"`;
  ctx.textAlign = _textAlignH;
  ctx.textBaseline = _textAlignV;
  const lines = String(str).split("\n");
  const lineH = _textSize * 1.35;
  for (let i = 0; i < lines.length; i++) {
    const ly = y + i * lineH;
    if (_doFill) {
      ctx.fillStyle = _colorStr(_fill);
      ctx.fillText(lines[i], x, ly);
    }
    if (_doStroke) {
      ctx.strokeStyle = _colorStr(_stroke);
      ctx.lineWidth = _lineWidth;
      ctx.strokeText(lines[i], x, ly);
    }
  }
}

const CLOSE = "CLOSE";
let _firstVertex = true;
function beginShape() {
  ctx.beginPath();
  _firstVertex = true;
}
function vertex(x, y) {
  if (_firstVertex) {
    ctx.moveTo(x, y);
    _firstVertex = false;
  } else {
    ctx.lineTo(x, y);
  }
}
function bezierVertex(cp1x, cp1y, cp2x, cp2y, x, y) {
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
}
function endShape(mode) {
  if (mode === CLOSE) ctx.closePath();
  _applyFill();
  _applyStroke();
}

function arc(x, y, w, h, startDeg, stopDeg) {
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    Math.abs(w / 2),
    Math.abs(h / 2),
    0,
    startDeg * DEG,
    stopDeg * DEG,
  );
  _applyFill();
  _applyStroke();
}

// ─── Input Tracking ───────────────────────────────────────────────────────────
let mouseX = 0,
  mouseY = 0;
let clicked = false;
let keys = [];

canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * (canvas.width / r.width);
  mouseY = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener("click", () => {
  clicked = true;
});
window.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA") {
    keys[e.keyCode] = true;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.keyCode] = false;
});

// ─── Frame Counter ────────────────────────────────────────────────────────────
let frameCount = 0;

// ─── Game State ───────────────────────────────────────────────────────────────
var scene = "menu";
var cam = { x: 0, y: 0 };
var dirts = [];
var ducks = {
  x: 0,
  y: 150,
  d: -49,
  speed: 2,
  r1: 0,
  r2: 0,
  r3: 0,
  r4: 0,
  r5: 0,
  r6: 0,
  r7: 0,
  walking: false,
  pancakes: 0,
  stamina: 100,
  U: false,
  D: false,
  R: false,
  L: false,
  hasQuack: false,
};

function dirt() {
  noStroke();
  for (var i = 0; i < dirts.length; i++) {
    fill(181, 145, 103, dirts[i].opacity);
    ellipse(
      dirts[i].x,
      dirts[i].y,
      dirts[i].opacity / 50,
      dirts[i].opacity / 50,
    );
    dirts[i].opacity -= 2;
    if (dirts[i].opacity < 0) {
      dirts.splice(i, 1);
    }
  }
}

// Draw the local duck (uses global ducks.rX state)
function duck(x, y) {
  push();
  translate(x, y);
  noStroke();
  fill(0, 50);
  ellipse(0, 17, 30, 20);
  stroke(247, 180, 37);
  strokeWeight(13);
  line(
    ducks.r3 * 5,
    ducks.r4 * 2,
    ducks.r3 * 5 + ducks.r1 * (-ducks.r6 * 3),
    13 + ducks.r4 * 2 + ducks.r2 * (-ducks.r6 * 3),
  );
  line(
    ducks.r3 * -5,
    ducks.r4 * -2,
    ducks.r3 * -5 + ducks.r1 * (ducks.r6 * 3),
    13 + ducks.r4 * -2 + ducks.r2 * (ducks.r6 * 3),
  );
  stroke(255);
  strokeWeight(22);
  line(ducks.r1 * 10, ducks.r2 * 5, ducks.r1 * 10, -20 + ducks.r2 * 5);
  line(ducks.r1 * -10, -ducks.r2 * 5, ducks.r1 * 10, ducks.r2 * 5);
  stroke(247, 180, 37);
  strokeWeight(13);
  line(ducks.r1 * 24, -16 + ducks.r2 * 9, ducks.r1 * 25, -16 + ducks.r2 * 10);
  if (ducks.d % 360) {
    weight = 11 + ducks.r5 * 11;
    if (weight > 2) {
      stroke(255);
      strokeWeight(weight);
    } else {
      noStroke();
    }
    line(ducks.r1 * 10, ducks.r2 * 5, ducks.r1 * 10, -20 + ducks.r2 * 5);
  }
  pop();
}

// Draw another player's duck using their synced state
function drawOtherDuck(x, y, p, label) {
  push();
  translate(x, y);
  noStroke();
  fill(0, 40);
  ellipse(0, 17, 30, 20);
  stroke(200, 120, 37);
  strokeWeight(13);
  line(
    p.r3 * 5,
    p.r4 * 2,
    p.r3 * 5 + p.r1 * (-p.r6 * 3),
    13 + p.r4 * 2 + p.r2 * (-p.r6 * 3),
  );
  line(
    p.r3 * -5,
    p.r4 * -2,
    p.r3 * -5 + p.r1 * (p.r6 * 3),
    13 + p.r4 * -2 + p.r2 * (p.r6 * 3),
  );
  stroke(200, 230, 255);
  strokeWeight(22);
  line(p.r1 * 10, p.r2 * 5, p.r1 * 10, -20 + p.r2 * 5);
  line(p.r1 * -10, -p.r2 * 5, p.r1 * 10, p.r2 * 5);
  stroke(200, 120, 37);
  strokeWeight(13);
  line(p.r1 * 24, -16 + p.r2 * 9, p.r1 * 25, -16 + p.r2 * 10);
  noStroke();
  // name tag
  push();
  translate(0, -38);
  fill(0, 140);
  rect(0, 0, label.length * 7 + 12, 16, 4);
  fill(255);
  noStroke();
  textSize(10);
  textFont("Courier");
  text(label, 0, 0);
  pop();
  pop();
}

function blocked(x, y) {
  // 🧱 indoor (rectangles)
  if (scene === "treeScene") {
    for (let o of indoorObstacles) {
      let DuckR = 10;
      if (
        x > o.x - o.w / 2 - DuckR &&
        x < o.x + o.w / 2 + DuckR &&
        y > o.y - o.h / 2 - DuckR &&
        y < o.y + o.h / 2 + DuckR
      ) {
        return true;
      }
    }
  }

  // 🌳 outdoor (circles)
  else {
    for (let o of obstacles) {
      if (dist(x, y, o.x, o.y) < o.r) {
        return true;
      }
    }
  }

  return false;
}

function honk() {
  ducks.r1 = sin(ducks.d);
  ducks.r2 = cos(ducks.d);
  ducks.r3 = sin(ducks.d + 90);
  ducks.r4 = cos(ducks.d + 90);
  ducks.r5 = sin(ducks.d + 270);
  if (ducks.walking) {
    ducks.r6 = cos(90 + frameCount * 10);
    dirts.push({
      x: ducks.x + random(-10, 10),
      y: ducks.y + random(10, 20),
      opacity: 255,
    });
    ducks.r7 = sin(ducks.d + 90);
  } else {
    ducks.r6 = lerp(ducks.r6, 0, 0.1);
  }
  ducks.walking = keys[87] || keys[83] || keys[65] || keys[68] ? true : false;
  if (keys[87]) {
    var ny = ducks.y - ducks.speed;
    if (!blocked(ducks.x, ny)) ducks.y = ny;
    ducks.U = true;
  } else {
    ducks.U = false;
  }
  if (keys[83]) {
    var ny = ducks.y + ducks.speed;
    if (!blocked(ducks.x, ny)) ducks.y = ny;
    ducks.D = true;
  } else {
    ducks.D = false;
  }
  if (keys[65]) {
    var nx = ducks.x - ducks.speed;
    if (!blocked(nx, ducks.y)) ducks.x = nx;
    ducks.L = true;
  } else {
    ducks.L = false;
  }
  if (keys[68]) {
    var nx = ducks.x + ducks.speed;
    if (!blocked(nx, ducks.y)) ducks.x = nx;
    ducks.R = true;
  } else {
    ducks.R = false;
  }
  if (ducks.U) {
    if (ducks.L) {
      ducks.d = lerp(ducks.d, -180, 0.1);
    } else {
      ducks.d = lerp(ducks.d, 180, 0.1);
    }
  }
  if (ducks.D) {
    ducks.d = lerp(ducks.d, 0, 0.1);
  }
  if (ducks.L) {
    ducks.d = lerp(ducks.d, -90, 0.1);
  }
  if (ducks.R) {
    ducks.d = lerp(ducks.d, 90, 0.1);
  }
  if (keys[32]) {
    if (ducks.stamina > 1) {
      ducks.speed = 4;
    } else {
      ducks.speed = 2;
    }
    if (ducks.stamina > 0) {
      ducks.stamina -= 0.2;
    }
  } else {
    ducks.speed = 2;
    if (ducks.stamina < 100) {
      ducks.stamina += 0.3;
    }
  }
}

function ducklol(x, y, r, sz) {
  push();
  translate(x, y);
  rotate(r);
  scale(sz / 400);
  stroke(0, 0, 0);
  strokeWeight(10);
  fill(0, 0, 0);
  ellipse(0, 57, 186, 100);
  strokeWeight(176);
  line(0, 0, 0, 267);
  stroke(255);
  strokeWeight(166);
  line(0, 0, 0, 265);
  noStroke();
  fill(255, 217, 0);
  ellipse(0, 57, 186, 100);
  fill(0, 0, 0);
  ellipse(-63, 3, 20, 20);
  ellipse(63, 3, 20, 20);
  noFill();
  stroke(0, 0, 0);
  strokeWeight(10);
  arc(0, 38, 182, 67, 33, 146);
  pop();
}

var carrott = { ang: 0, sz: 1 };

// ─── Chest & Quack Power ──────────────────────────────────────────────────────
var chestState = { opened: false, showPopup: false, openFrame: 0, openTick: 0 };
var seismicWaves = [];
var quackTimer = 0;

const chestImg = new Image();
chestImg.src = "chest-sheet.png";

const quackAudio = new Audio("quack.mp3");
quackAudio.preload = "auto";

const bgMusic = new Audio("bgmusic.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.6;
bgMusic.preload = "auto";

function bgPlay() {
  if (bgMusic.paused) bgMusic.play().catch(function () {});
}
function bgPause() {
  if (!bgMusic.paused) bgMusic.pause();
}

// ─── Save / Load ──────────────────────────────────────────────────────────────
function saveGame() {
  try {
    localStorage.setItem(
      "duckgame_save",
      JSON.stringify({
        x: ducks.x,
        y: ducks.y,
        d: ducks.d,
        pancakes: ducks.pancakes,
        stamina: ducks.stamina,
        hasQuack: ducks.hasQuack,
        carrotSz: carrott.sz,
        chestOpened: chestState.opened,
        playerName: nameInput ? nameInput.value : "Duck",
      }),
    );
  } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem("duckgame_save");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.x !== undefined) ducks.x = s.x;
    if (s.y !== undefined) ducks.y = s.y;
    if (s.d !== undefined) ducks.d = s.d;
    if (s.pancakes !== undefined) ducks.pancakes = s.pancakes;
    if (s.stamina !== undefined) ducks.stamina = s.stamina;
    if (s.hasQuack !== undefined) ducks.hasQuack = s.hasQuack;
    if (s.carrotSz !== undefined) carrott.sz = s.carrotSz;
    if (s.chestOpened !== undefined) {
      chestState.opened = s.chestOpened;
      if (s.chestOpened) chestState.openFrame = 3;
    }
    if (s.playerName !== undefined && nameInput) nameInput.value = s.playerName;
  } catch (e) {}
}

function restartGame() {
  localStorage.removeItem("duckgame_save");
  ducks.x = 0;
  ducks.y = 150;
  ducks.d = -49;
  ducks.pancakes = 0;
  ducks.stamina = 100;
  ducks.hasQuack = false;
  carrott.sz = 1;
  chestState.opened = false;
  chestState.showPopup = false;
  chestState.openFrame = 0;
  chestState.openTick = 0;
}

if (restartBtn) {
  restartBtn.addEventListener("click", restartGame);
}

var obstacles = [
  { x: 300, y: 340, r: 120 },
  { x: 616, y: 510, r: 120 },
];
var indoorObstacles = [
  { x: 300, y: 0, w: 600, h: 20 }, // top
  { x: 300, y: 600, w: 600, h: 20 }, // bottom
  { x: 0, y: 300, w: 20, h: 600 }, // left
  { x: 600, y: 300, w: 20, h: 600 }, // right
  { x: 300, y: 210, w: 80, h: 65 }, // chest
];

function carrot() {
  carrott.ang = atan2(ducks.x, ducks.y - 30);
  push();
  scale(carrott.sz);
  stroke(0);
  strokeWeight(3);
  beginShape();
  vertex(50, 31);
  endShape(CLOSE);
  beginShape();
  vertex(-9, -67);
  endShape();
  beginShape();
  vertex(4, -72);
  endShape();
  beginShape();
  vertex(15, -72);
  endShape();
  noStroke();
  fill(255, 164, 61);
  beginShape();
  vertex(50, 31);
  bezierVertex(30, 51, -30, 51, -50, 31);
  bezierVertex(-50, 31, -89, -46, -50, -70);
  bezierVertex(-50, -70, -12, -95, 50, -70);
  bezierVertex(89, -46, 50, 31, 50, 31);
  endShape(CLOSE);
  fill(232, 156, 75);
  beginShape();
  vertex(50, -41);
  bezierVertex(51, -20, -30, -18, -41, -32);
  bezierVertex(-30, -21, 51, -25, 50, -41);
  endShape(CLOSE);
  beginShape();
  vertex(42, -6);
  bezierVertex(2, -3, -49, -12, -61, -32);
  bezierVertex(-50, 2, 18, -3, 42, -6);
  endShape(CLOSE);
  fill(118, 194, 113);
  beginShape();
  vertex(-9, -67);
  bezierVertex(30, -195, -112, -235, -23, -75);
  endShape();
  fill(132, 204, 126);
  beginShape();
  vertex(4, -72);
  bezierVertex(95, -195, -38, -262, -15, -71);
  endShape();
  fill(104, 179, 97);
  beginShape();
  vertex(15, -72);
  bezierVertex(120, -195, 20, -222, 3, -68);
  endShape();
  fill(179, 157, 117);
  ellipse(-28, 39, 30, 20);
  ellipse(-5, 48, 27, 20);
  ellipse(33, 43, 27, 20);
  ellipse(55, 46, 30, 20);
  fill(207, 195, 157);
  ellipse(-45, 39, 30, 20);
  ellipse(-24, 48, 27, 20);
  ellipse(16, 47, 27, 20);
  ellipse(48, 39, 30, 20);
  pop();
  if (dist(ducks.x, ducks.y, 0, 30) < 65 + carrott.sz * 30) {
    ducks.x += sin(carrott.ang) * ducks.speed * 1.1;
    ducks.y += cos(carrott.ang) * ducks.speed * 1.1;
  }
}

var yy = 0;
var tree = function () {
  push();
  translate(100, yy);
  fill(145, 107, 61);
  noStroke();
  beginShape();
  vertex(127, yy + 193);
  vertex(148, yy + 201);
  vertex(160, yy + 209);
  vertex(161, yy + 213);
  vertex(161, yy + 203);
  vertex(162, yy + 233);
  vertex(166, yy + 296);
  vertex(167, yy + 314);
  vertex(154, yy + 336);
  vertex(141, yy + 346);
  vertex(124, yy + 351);
  vertex(103, yy + 355);
  vertex(167, yy + 355);
  vertex(184, yy + 352);
  vertex(186, yy + 364);
  vertex(179, yy + 375);
  vertex(210, yy + 364);
  vertex(213, yy + 363);
  vertex(217, yy + 359);
  vertex(223, yy + 355);
  vertex(229, yy + 357);
  vertex(290, yy + 357);
  vertex(264, yy + 344);
  vertex(251, yy + 325);
  vertex(244, yy + 311);
  vertex(234, yy + 212);
  vertex(236, yy + 201);
  endShape(CLOSE);
  strokeWeight(2);
  stroke(71, 43, 26, 100);
  line(178, yy + 275, 180, yy + 314);
  line(206, yy + 246, 207, yy + 342);
  line(183, yy + 210, 187, yy + 281);
  for (var i = -87; i < 28; i += 39) {
    fill(196, 159, 78);
    rect(181, yy + i + 304, 47, 11);
  }
  noStroke();
  fill(71, 43, 26, 100);
  beginShape();
  vertex(238, yy + 195);
  vertex(236, yy + 200);
  endShape(CLOSE);
  beginShape();
  vertex(246, yy + 315);
  vertex(270, yy + 356);
  vertex(224, yy + 355);
  vertex(235, yy + 305);
  vertex(226, yy + 246);
  vertex(238, yy + 257);
  endShape(CLOSE);
  beginShape();
  vertex(146, yy + 355);
  vertex(181, yy + 318);
  vertex(185, yy + 351);
  endShape(CLOSE);
};

var treehouse = function () {
  fill(196, 163, 92);
  stroke(181, 143, 62);
  quad(74, yy + 186, 75, yy + 191, 232, yy + 202, 232, yy + 196);
  quad(232, yy + 202, 232, yy + 196, 298, yy + 171, 298, yy + 171);
  quad(106, yy + 179, 77, yy + 186, 232, yy + 197, 216, yy + 180);
  quad(298, yy + 170, 284, yy + 167, 223, yy + 184, 232, yy + 196);
  fill(194, 155, 70);
  quad(110, yy + 80, 109, yy + 177, 224, yy + 185, 224, yy + 81);
  quad(224, yy + 185, 225, yy + 81, 284, yy + 66, 284, yy + 165);
  noStroke();
  triangle(221, yy + 87, 104, yy + 80, 163, yy + 41);
  for (var xx = -5; xx < 99; xx += 21) {
    strokeWeight(2.0);
    stroke(166, 134, 53);
    line(110, yy + xx + 81, 222, yy + xx + 88);
    line(284, yy + xx + 72, 225, yy + xx + 89);
  }
  line(225, yy + 64, 140, yy + 58);
  stroke(161, 112, 48);
  strokeWeight(4);
  fill(209, 164, 96);
  quad(147, yy + 177, 148, yy + 99, 189, yy + 102, 189, yy + 181);
  ellipse(178, yy + 148, 1, 5);
  fill(157, 198, 199);
  quad(245, yy + 153, 271, yy + 146, 271, yy + 104, 245, yy + 112);
  strokeWeight(2.5);
  line(258, yy + 110, 259, yy + 149);
  line(246, yy + 133, 271, yy + 126);
  fill(0, 0, 0, 25);
  noStroke();
  quad(284, yy + 80, 284, yy + 168, 225, yy + 184, 225, yy + 95);
  quad(172, yy + 44, 186, yy + 49, 120, yy + 88, 79, yy + 100);
  fill(150, 102, 35);
  stroke(150, 102, 35);
  triangle(82, yy + 95, 109, yy + 93, 113, yy + 74);
  strokeWeight(9);
  line(113, yy + 78, 158, yy + 47);
  fill(161, 112, 52);
  stroke(161, 112, 52);
  strokeWeight(3);
  quad(155, yy + 45, 237, yy + 103, 297, yy + 72, 207, yy + 19);
  line(156, yy + 45, 81, yy + 95);
  pop();
};

var treeleaves = [];
for (var i = 0; i < 155; i++) {
  treeleaves.push({
    xx: random(39, 127),
    zz: random(50, 121),
    ww: random(10, 50),
    jj: random(10, 50),
  });
}

var house = function (x, y) {
  noStroke();
  push();
  fill(0);
  rect(51, 302, 290, 110);
  for (var i = 0; i < 10; i++) {
    fill(110, 55, 0);
    rect(50, i * 12 + 250, 300, 11, 20);
    fill(0, 40);
    rect(50, i * 12 + 250, 300, 11 / 2, 20, 20, 0, 0);
  }
  fill(150);
  rect(50, 250, 300, 15);
  fill(0, 30);
  rect(-25, 250, 150, 15);
  fill(50);
  rect(-76, 251, 15, 5, 2);
  fill(100);
  rect(-76, 242, 7, 15, 2);
  fill(0);
  ellipse(-55, 370, 35, 35);
  ellipse(310 - 140, 370, 35, 35);
  fill(150);
  ellipse(-55, 370, 25, 25);
  ellipse(310 - 140, 370, 25, 25);
  fill(0, 30);
  arc(-55, 370, 25, 25, 90, 270);
  arc(310 - 140, 370, 25, 25, 90, 270);
  pop();
};

var door = function (x, y) {
  noStroke();
  push();
  translate(x - 200, y - 320);
  fill(133, 53, 0);
  rect(175, 285, 50, 80, 5);
  fill(0, 200, 255);
  rect(176, 266, 30, 26, 5);
  fill(0, 30);
  rect(162, 285, 25, 80, 5);
  fill(0);
  rect(181, 327, 10, 5, 5);
  pop();
};

var windoww = function (x, y) {
  noStroke();
  push();
  translate(x, y);
  fill(133, 53, 0);
  rect(0, 0, 50, 40, 5);
  fill(0, 200, 255);
  rect(-1, 0, 40, 30, 5);
  fill(0, 40);
  rect(-13, 0, 25, 40, 5);
  pop();
};

var pankakes = [];
function pancakes(x, y) {
  push();
  translate(x, y);
  strokeWeight(3);
  noStroke();
  fill(207, 207, 207);
  ellipse(0, 0, 50, 15);
  ellipse(0, 3, 40, 15);
  fill(255, 253, 209);
  ellipse(0, -3, 41, 15);
  fill(219, 175, 134);
  ellipse(0, -5, 41, 15);
  fill(255, 253, 209);
  ellipse(0, -8, 41, 15);
  fill(219, 175, 134);
  ellipse(0, -10, 41, 15);
  fill(255, 253, 209);
  ellipse(0, -13, 41, 15);
  fill(219, 175, 134);
  ellipse(0, -15, 41, 15);
  fill(255, 253, 209);
  ellipse(0, -18, 41, 15);
  fill(219, 175, 134);
  ellipse(0, -21, 41, 15);
  fill(255, 253, 209);
  quad(-10, -22, 0, -18, 9, -22, 0, -26);
  pop();
}

function pancakecola(x, y) {
  push();
  translate(x, y);
  strokeWeight(3);
  stroke(0);
  ellipse(0, -1, 50, 10);
  ellipse(-8, 0, 35, 18);
  ellipse(8, 0, 35, 18);
  ellipse(0, -3, 41, 15);
  noStroke();
  fill(207, 207, 207);
  ellipse(0, 0, 50, 15);
  ellipse(0, 3, 40, 15);
  for (var i = 0; i < ducks.pancakes; i++) {
    push();
    translate(0, -4 * i);
    fill(255, 253, 209);
    ellipse(0, -3, 41, 15);
    fill(219, 175, 134);
    ellipse(0, -5, 41, 15);
    fill(255, 253, 209);
    quad(-10, -7, 0, -3, 9, -7, 0, -11);
    pop();
  }
  pop();
}

function serve_pancakes(strv, beef) {
  if (pankakes.length < strv) {
    pankakes.push({ x: random(-1000, 1000), y: random(-1000, 1000) });
  }
  for (var i = 0; i < pankakes.length; i++) {
    switch (beef) {
      case "back":
        if (pankakes[i].y < ducks.y + 13) {
          pancakes(pankakes[i].x, pankakes[i].y);
          if (dist(ducks.x, ducks.y, pankakes[i].x, pankakes[i].y) < 40) {
            ducks.pancakes++;
            pankakes.splice(i, 1);
          }
        }
        break;
      case "front":
        if (pankakes[i].y > ducks.y + 13) {
          pancakes(pankakes[i].x, pankakes[i].y);
          if (dist(ducks.x, ducks.y, pankakes[i].x, pankakes[i].y) < 40) {
            ducks.pancakes++;
            pankakes.splice(i, 1);
          }
        }
        break;
    }
  }
}

var shake = 0,
  shake_time = 0;

// ─── Grass Image (flood-fill background removal at runtime) ──────────────────
var jurassic_grassusses = [];
var _grassReady = false;
var _grassCanvas = document.createElement("canvas");
var _grassCtx2d = _grassCanvas.getContext("2d");
var _grassRawImg = new Image();

_grassRawImg.onload = function () {
  var W = _grassRawImg.naturalWidth,
    H = _grassRawImg.naturalHeight;
  _grassCanvas.width = W;
  _grassCanvas.height = H;
  _grassCtx2d.drawImage(_grassRawImg, 0, 0);
  var id = _grassCtx2d.getImageData(0, 0, W, H);
  var px = id.data;
  // Sample top-left corner as the background colour
  var bgR = px[0],
    bgG = px[1],
    bgB = px[2],
    thr = 55;
  var visited = new Uint8Array(W * H);
  var stack = [];
  for (var bx = 0; bx < W; bx++) {
    stack.push(bx, 0);
    stack.push(bx, H - 1);
  }
  for (var by = 1; by < H - 1; by++) {
    stack.push(0, by);
    stack.push(W - 1, by);
  }
  while (stack.length) {
    var cy = stack.pop(),
      cx = stack.pop();
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    var si = cy * W + cx;
    if (visited[si]) continue;
    visited[si] = 1;
    var pi = si * 4;
    if (
      Math.abs(px[pi] - bgR) +
        Math.abs(px[pi + 1] - bgG) +
        Math.abs(px[pi + 2] - bgB) >
      thr
    )
      continue;
    px[pi + 3] = 0;
    stack.push(cx + 1, cy);
    stack.push(cx - 1, cy);
    stack.push(cx, cy + 1);
    stack.push(cx, cy - 1);
  }
  _grassCtx2d.putImageData(id, 0, 0);
  _grassReady = true;
};
_grassRawImg.src = "grass-raw.png";

function grass(x, y) {
  if (!_grassReady) return;
  var gw = 68,
    gh = 50;
  ctx.drawImage(_grassCanvas, x - gw / 2, y - gh, gw, gh);
}

for (var i = 0; i < 100; i++) {
  jurassic_grassusses.push({ x: random(-1000, 1000), y: random(-1000, 1000) });
}
for (var i = 0; i < jurassic_grassusses.length; i++) {
  if (dist(jurassic_grassusses[i].x, jurassic_grassusses[i].y, 0, 0) < 300) {
    jurassic_grassusses.splice(i, 1);
  }
}

// ─── Tree Image (client-side shadow strip) ────────────────────────────────────
var _treeReady = false;
var _treeCanvas = document.createElement("canvas");
var _treeCtx = _treeCanvas.getContext("2d");
var _treeRawImg = new Image();
_treeRawImg.onload = function () {
  var W = _treeRawImg.naturalWidth,
    H = _treeRawImg.naturalHeight;
  _treeCanvas.width = W;
  _treeCanvas.height = H;
  _treeCtx.drawImage(_treeRawImg, 0, 0);
  var id = _treeCtx.getImageData(0, 0, W, H),
    px = id.data;
  // Remove any pixel where R≈G≈B (shadow / gray) and brightness ≤ 145.
  // Real tree pixels have strong green or brown hue so their channel
  // deviation is well above the threshold.
  for (var i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    var r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    var dev = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (dev < 30 && r < 150) px[i + 3] = 0;
  }
  _treeCtx.putImageData(id, 0, 0);
  _treeReady = true;
};
_treeRawImg.src = "tree.png";

// ─── Random Tree Positions ─────────────────────────────────────────────────
// Kept off-limits zones: treehouse, house, carrot, spawn area.
// Each tree also added as a circular obstacle so the duck can't pass through.
var trees = [];
(function () {
  var avoid = [
    { x: 270, y: 340, r: 200 }, // treehouse + big tree
    { x: 616, y: 222, r: 190 }, // house
    { x: 0, y: 30, r: 220 }, // carrot
    { x: 0, y: 150, r: 180 }, // spawn
  ];
  var attempts = 0;
  while (trees.length < 32 && attempts < 2000) {
    attempts++;
    var tx = random(-950, 950),
      ty = random(-950, 950);
    var ok = true;
    for (var j = 0; j < avoid.length; j++) {
      if (dist(tx, ty, avoid[j].x, avoid[j].y) < avoid[j].r) {
        ok = false;
        break;
      }
    }
    if (ok) {
      for (var k = 0; k < trees.length; k++) {
        if (dist(tx, ty, trees[k].x, trees[k].y) < 160) {
          ok = false;
          break;
        }
      }
    }
    if (ok) trees.push({ x: tx, y: ty });
  }
  // Register each tree as a collidable obstacle
  for (var i = 0; i < trees.length; i++) {
    obstacles.push({ x: trees[i].x, y: trees[i].y, r: 52 });
  }
})();

// ─── Traveller NPC ─────────────────────────────────────────────────────────────
// Sprite sheet: 12 directional frames (1 per 30°), each 64 × 96 px, 1-row layout.
// Angle convention matches the game: 0° = East, 90° = South (toward camera),
// 180° = West, 270° = North (away from camera).
var TRAV_FW = 64, TRAV_FH = 96;
var _travReady = false;
var _travSheet = document.createElement('canvas');
_travSheet.width  = TRAV_FW * 12;
_travSheet.height = TRAV_FH;

var _travSrc = new Image();
_travSrc.onload = function() {
  // -- strip the black background --
  var tmp = document.createElement('canvas');
  tmp.width = _travSrc.naturalWidth; tmp.height = _travSrc.naturalHeight;
  var tc = tmp.getContext('2d');
  tc.drawImage(_travSrc, 0, 0);
  var id = tc.getImageData(0, 0, tmp.width, tmp.height), px = id.data;
  for (var i = 0; i < px.length; i += 4) {
    if (px[i] < 35 && px[i+1] < 35 && px[i+2] < 35) px[i+3] = 0;
  }
  tc.putImageData(id, 0, 0);

  // -- build 12 directional frames --
  var sc = _travSheet.getContext('2d');
  var sw = tmp.width, sh = tmp.height;
  for (var f = 0; f < 12; f++) {
    var rad = f * 30 * Math.PI / 180;
    var cosA = Math.cos(rad); // +1=E, -1=W
    var sinA = Math.sin(rad); // +1=S(toward camera), -1=N(away)
    var cx = f * TRAV_FW + TRAV_FW / 2;

    // Width: full when S/N, compressed when E/W
    var wScale = Math.max(0.22, Math.abs(sinA));
    // Height: tallest when facing S (sinA=+1), shortest facing N (sinA=-1)
    var hScale = 0.66 + 0.34 * (sinA + 1) / 2;
    // Flip: mirror image for East-hemisphere so character faces the right way
    var flipX = (cosA > 0) ? -1 : 1;
    // Brightness: darker when facing away
    var bri = 0.52 + 0.48 * (sinA + 1) / 2;

    sc.save();
    sc.translate(cx, TRAV_FH);
    sc.filter = 'brightness(' + bri.toFixed(2) + ')';
    sc.scale(flipX * (wScale * TRAV_FW / sw), hScale * TRAV_FH / sh);
    sc.drawImage(tmp, -sw / 2, -sh);
    sc.restore();
  }
  sc.filter = 'none';
  _travReady = true;
};
_travSrc.src = 'traveller.jpg';

// NPC state – top-right corner of the world square (x≈+820, y≈−820)
var traveller = {
  x: 820, y: -820,
  homeX: 820, homeY: -820,
  targetX: 820, targetY: -820,
  d: 90,            // initial direction (facing south)
  speed: 1.3,
  patrolR: 150,     // patrol radius (world units)
  waitTimer: 0,
  frame: 3,         // sprite frame index (3 = 90° = South)
  animTick: 0
};

// Reserve one dynamic-obstacle slot for the traveller's body
// (position updated every frame in updateTraveller)
obstacles.push({ x: traveller.x, y: traveller.y, r: 22, _trav: true });

function updateTraveller() {
  if (traveller.waitTimer > 0) { traveller.waitTimer--; return; }

  var dx = traveller.targetX - traveller.x;
  var dy = traveller.targetY - traveller.y;
  if (dx * dx + dy * dy < 25) {
    // Reached target – rest, then pick a new spot
    traveller.waitTimer = Math.round(random(80, 200));
    var ang = random(0, 360) * Math.PI / 180;
    var r   = random(30, traveller.patrolR);
    traveller.targetX = traveller.homeX + Math.cos(ang) * r;
    traveller.targetY = traveller.homeY + Math.sin(ang) * r;
  } else {
    var len = Math.sqrt(dx * dx + dy * dy);
    traveller.x += (dx / len) * traveller.speed;
    traveller.y += (dy / len) * traveller.speed;
    traveller.d = atan2(dy, dx);           // degrees, 0=E convention
    traveller.animTick++;
    // Map direction to sprite frame (every 8 ticks recalculate)
    traveller.frame = Math.round(((traveller.d % 360) + 360) % 360 / 30) % 12;
  }

  // Keep dynamic obstacle in sync
  for (var oi = 0; oi < obstacles.length; oi++) {
    if (obstacles[oi]._trav) { obstacles[oi].x = traveller.x; obstacles[oi].y = traveller.y - 16; break; }
  }
}

function drawTraveller() {
  if (!_travReady) return;
  var bob = (traveller.waitTimer === 0)
    ? Math.abs(Math.sin(traveller.animTick * 0.18)) * 3 : 0;

  ctx.drawImage(
    _travSheet,
    traveller.frame * TRAV_FW, 0, TRAV_FW, TRAV_FH,
    traveller.x - TRAV_FW / 2,
    traveller.y - TRAV_FH - bob,
    TRAV_FW, TRAV_FH
  );

  // Name tag above the sprite
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px Courier';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(traveller.x - 30, traveller.y - TRAV_FH - bob - 17, 60, 14);
  if (dist(traveller.x, traveller.y, ducks.x, ducks.y)<100) {
  ctx.fillStyle = '#f5e6c0';
  ctx.fillText('Traveller', traveller.x, traveller.y - TRAV_FH - bob - 6);
  }
  ctx.restore();
}

var intro_timer = 1000;
var scene2b = "menu";
// ─── Draw chest sprite: 4-frame sheet (row-major, 2 cols × 2 rows)
//   frame 0 = top-left (closed)   frame 1 = top-right (cracking)
//   frame 2 = bottom-left (opening)   frame 3 = bottom-right (fully open)
function drawChestSprite(x, y) {
  if (!chestImg.complete || chestImg.naturalWidth === 0) return;
  const sw = chestImg.naturalWidth / 2;
  const sh = chestImg.naturalHeight / 2;
  const col = chestState.openFrame % 2;
  const row = Math.floor(chestState.openFrame / 2);
  const dw = 110,
    dh = 110;
  ctx.drawImage(
    chestImg,
    col * sw,
    row * sh,
    sw,
    sh,
    x - dw / 2,
    y - dh / 2,
    dw,
    dh,
  );
}

// ─── BotW-style item popup ────────────────────────────────────────────────────
function drawBotWPopup() {
  // Dim overlay
  fill(0, 160);
  noStroke();
  rect(300, 300, 600, 600);

  // Outer gold border
  stroke(210, 175, 55);
  strokeWeight(3);
  fill(15, 15, 35, 245);
  rect(300, 285, 340, 150, 10);

  // Divider line
  stroke(210, 175, 55, 120);
  strokeWeight(1);
  noFill();
  rect(300, 285, 326, 136, 8);

  // Header label
  textFont("Courier");
  noStroke();
  textSize(12);
  fill(210, 175, 55);
  text("- You received -", 300, 230);

  // Item name
  textSize(26);
  fill(255);
  text("Quaking Power", 300, 268);

  // Description
  textSize(13);
  fill(190, 210, 255);
  text("When used, it can stun\n nearby enemies and damage them.", 300, 298);
  textSize(8);
  fill(210, 175, 55);
  text("Can be used by clicking anywhere", 300, 251);

  // Dismiss hint
  textSize(11);
  fill(140, 140, 160);
  text("Click anywhere to continue", 300, 340);

  if (clicked) {
    chestState.showPopup = false;
    clicked = false;
  }
}

// ─── Treehouse scene ──────────────────────────────────────────────────────────
function treeScene() {
  background(0, 0, 0);
  fill(120, 85, 60);
  rect(300, 300, 600, 600);

  // Chest (centre of room, slightly above duck spawn)
  const chestX = 300,
    chestY = 210;
  drawChestSprite(chestX, chestY);

  // Advance opening animation (one frame every 10 ticks ≈ smooth ~6-step open)
  if (chestState.opened && chestState.openFrame < 3) {
    chestState.openTick++;
    if (chestState.openTick % 10 === 0) {
      chestState.openFrame++;
      if (chestState.openFrame >= 3) {
        chestState.showPopup = true;
      }
    }
  }

  // Update duck movement and draw directly
  honk();
  duck(ducks.x, ducks.y);

  textSize(40);
  fill(255);
  noStroke();
  text("Inside the Treehouse", 300, 60);

  // "E to open" prompt — same style as treehouse entry in game()
  if (!chestState.opened && dist(ducks.x, ducks.y, chestX, chestY) < 70) {
    fill(0, 50);
    noStroke();
    rect(300, 480, 265, 40, 5);
    textSize(24);
    fill(0);
    textFont("Courier");
    text('"E" to open', 300, 480);
    if (keys[69] && frameCount % 20 < 1) {
      chestState.opened = true;
      chestState.openFrame = 0;
      chestState.openTick = 0;
      ducks.hasQuack = true;
      saveGame();
    }
  }

  // ESC prompt
  fill(0);
  noStroke();
  rect(300, 550, 265, 40, 5);
  textSize(20);
  fill(255);
  text("Press ESC to leave", 300, 550);

  // exit back to main game
  if (keys[27]) {
    saveGame();
    scene = "game";
    bgPlay();
    ducks.x = 0;
    ducks.y = 150;
  }

  // BotW popup (drawn last so it's on top)
  if (chestState.showPopup) drawBotWPopup();
}
function game() {
  background(149, 191, 161);
  shake_time--;
  push();
  translate(cam.x + 300 + shake, cam.y + 400 + shake);
  noStroke();
  fill(169, 214, 182);
  rect(0, 0, 2000, 2000);
  for (var i = 0; i < jurassic_grassusses.length; i++) {
    grass(jurassic_grassusses[i].x, jurassic_grassusses[i].y);
  }

  function drawLeaves(tx, ty, sc) {
    for (var j = 0; j < treeleaves.length; j++) {
      noStroke();
      push();
      translate(tx, ty);
      if (sc) scale(sc);
      fill(69, 138, 35);
      ellipse(
        treeleaves[j].xx,
        treeleaves[j].zz - 50,
        treeleaves[j].ww,
        treeleaves[j].jj,
      );
      fill(61, 128, 26);
      ellipse(
        treeleaves[j].xx,
        treeleaves[j].zz,
        treeleaves[j].ww,
        treeleaves[j].jj,
      );
      pop();
    }
  }
  drawLeaves(99, 44, null);
  drawLeaves(141, -17, 1.3);
  drawLeaves(248, 56, 1.2);
  drawLeaves(251, 14, null);
  textSize(30);
  textFont("Courier");
  fill(153, 153, 153);
  noStroke();
  text("Welcome to The Duck Game!", -173, 240);
  serve_pancakes(20, "back");
  dirt();

  // Collect all ducks (local + remote) and sort by Y for depth
  var allDucks = [{ isLocal: true, x: ducks.x, y: ducks.y }];
  for (const [id, p] of Object.entries(otherPlayers)) {
    if (id !== mySocketId)
      allDucks.push({ isLocal: false, id, p, x: p.x, y: p.y });
  }
  allDucks.sort((a, b) => a.y - b.y);

  // Render carrot then each duck in Y order
  for (var i = 0; i < allDucks.length; i++) {
    var d = allDucks[i];
    if (d.isLocal) {
      duck(ducks.x, ducks.y);
    } else {
      drawOtherDuck(d.p.x, d.p.y, d.p, d.p.name || d.id.slice(0, 6));
    }
  }

  // Draw random trees in Y-order AFTER ducks so trees appear in front
  if (_treeReady) {
    var _st = trees.slice().sort(function (a, b) {
      return a.y - b.y;
    });
    for (var _ti = 0; _ti < _st.length; _ti++) {
      var _tw = 220,
        _th = 220;
      ctx.drawImage(
        _treeCanvas,
        _st[_ti].x - _tw / 2,
        _st[_ti].y - _th * 0.85,
        _tw,
        _th,
      );
    }
  }

  // ── Quack: 3 lines from bill ──────────────────────────────────────────────
  if (quackTimer > 0) {
    quackTimer--;
    const billX = ducks.x + ducks.r1 * 25;
    const billY = ducks.y + (-16 + ducks.r2 * 10);
    const alpha = quackTimer * 8;
    strokeWeight(2.5);
    noFill();
    stroke(255, 220, 50, alpha);
    line(billX, billY, billX + ducks.r1 * 28, billY + ducks.r2 * 28);
    stroke(255, 200, 30, alpha);
    line(
      billX,
      billY,
      billX + ducks.r1 * 22 + ducks.r3 * 12,
      billY + ducks.r2 * 22 + ducks.r4 * 12,
    );
    line(
      billX,
      billY,
      billX + ducks.r1 * 22 - ducks.r3 * 12,
      billY + ducks.r2 * 22 - ducks.r4 * 12,
    );
  }

  // ── Seismic waves ─────────────────────────────────────────────────────────
  for (var wi = seismicWaves.length - 1; wi >= 0; wi--) {
    var wv = seismicWaves[wi];
    if (wv.delay > 0) {
      wv.delay--;
      continue;
    }
    noFill();
    stroke(180, 80, 220, wv.opacity);
    strokeWeight(3);
    arc(wv.x, wv.y, wv.r * 2, wv.r * 0.6, 0, 360);
    wv.r += 5;
    wv.opacity -= 6;
    if (wv.opacity <= 0) seismicWaves.splice(wi, 1);
  }

  carrot();
  drawLeaves(99, 44, null);
  drawLeaves(141, -17, 1.3);
  drawLeaves(248, 56, 1.2);
  drawLeaves(251, 14, null);
  tree();
  treehouse();
  push();
  translate(616, 222);
  house(0, -18);
  door(87, 358);
  windoww(-16, 302);
  pop();
  serve_pancakes(20, "front");

  // Player count badge
  var totalPlayers = Object.keys(otherPlayers).length;
  if (totalPlayers > 1) {
    noStroke();
    fill(0, 160);
    rect(-270, 350, 120, 22, 5);
    textSize(12);
    fill(255);
    textFont("Courier");
    text("Players: " + totalPlayers, -270, 350);
  }
  pop();
  if (dist(ducks.x, ducks.y, 270, yy + 100) < 120) {
    fill(0, 50);
    noStroke();
    rect(300, 550, 265, 40, 5);
    textSize(24);
    fill(0);
    textFont("Courier");
    text('"E" to enter', 300, 550);
    if (keys[69]) {
      if (frameCount % 20 < 1 && ducks.pancakes > 2) {
        ducks.pancakes -= 3;
        shake_time = 30;
        // when entering
        ducks.x = 300;
        ducks.y = 300;
        cam.x = -ducks.x;
        cam.y = -ducks.y;
        scene = "treeScene";
        bgPause();
      }
    }
  }
  // Offer pancake prompt
  if (dist(ducks.x, ducks.y, 0, 30) < 80 + carrott.sz * 30) {
    fill(0, 50);
    noStroke();
    rect(300, 550, 265, 40, 5);
    textSize(24);
    fill(0);
    textFont("Courier");
    text('"E" offer pancakes', 300, 550);
    if (keys[69]) {
      if (frameCount % 20 < 1 && ducks.pancakes > 0) {
        ducks.pancakes--;
        carrott.sz += 0.02;
        shake_time = 30;
      }
    }
  }
  honk();
  emitMove();

  noStroke();
  fill(255, 153, 0);
  push();
  translate(300, 400);
  rotate(-carrott.ang + 180);
  ellipse(0, 84, 10, 10);
  ellipse(2, 80, 10, 10);
  ellipse(-2, 80, 10, 10);
  ellipse(0, 89, 5, 5);
  ellipse(-6, 77, 5, 5);
  ellipse(6, 77, 5, 5);
  pop();
  stroke(0);
  fill(185, 231, 235);
  quad(20, 580, 20, 570, 20 + ducks.stamina, 570, 25 + ducks.stamina, 580);
  textFont("Courier");
  textSize(30);
  fill(0, 0, 0);
  noStroke();
  text(ducks.pancakes, 50, 548);
  pancakecola(50, 522);
  textSize(16);
  fill(0, 0, 0);
  text("STAMINA", 62 + ducks.stamina, 575);

  // ── Quack power: trigger on click ─────────────────────────────────────────
  if (clicked && ducks.hasQuack) {
    quackAudio.currentTime = 0;
    quackAudio.play().catch(function () {});
    quackTimer = 30;
    seismicWaves.push({ x: ducks.x, y: ducks.y, r: 8, opacity: 220, delay: 0 });
    seismicWaves.push({ x: ducks.x, y: ducks.y, r: 8, opacity: 220, delay: 8 });
    seismicWaves.push({
      x: ducks.x,
      y: ducks.y,
      r: 8,
      opacity: 220,
      delay: 16,
    });
  }
  cam.x = lerp(cam.x, -ducks.x, 0.1);
  cam.y = lerp(cam.y, -ducks.y, 0.1);
  if (
    !(ducks.x > -1000 && ducks.x < 1000 && ducks.y > -1000 && ducks.y < 1000)
  ) {
    fill(0, 50);
    noStroke();
    rect(300, 300, 601, 601);
  }
  if (shake_time > 0) {
    shake = random(-2, 2);
  }
}

function menu() {
  background(123, 86, 245);
  textSize(50);
  fill(0);
  text("The", 150, 46);
  fill(255);
  text("The", 150, 48);
  textSize(103);
  fill(0);
  text("Duck", 150, 98);
  fill(255);
  text("Duck", 150, 100);
  fill(0);
  text("Game", 150, 168);
  fill(255);
  text("Game", 150, 170);
  textSize(190);
  text("🦆", 350, 120);
  textSize(20);
  fill(0);
  text("click duck to start", 147, 224);
  fill(255);
  text("click duck to start", 147, 226);
  textSize(25);
  fill(0);
  text("HTML/CSS by Pear256", 175, 540);
  text("by ƬӨΣKПΣΣ", 150, 563);
  fill(255);
  text("HTML/CSS by Pear256", 175, 542);
  text("by ƬӨΣKПΣΣ", 150, 565);
  push();
  translate(310, 301);
  rotate(-34);
  if (dist(mouseX, mouseY, 310, 301) < 35) {
    scale(1.2);
    if (clicked && scene === scene2b) {
      intro_timer = 110;
      scene2b = "how";
    }
  }
  textSize(113);
  fill(0);
  text("?", 0, -2);
  fill(255);
  text("?", 0, 0);
  pop();
  if (dist(mouseX, mouseY, 381, 407) < 75) {
    if (clicked && scene === scene2b) {
      intro_timer = 110;
      scene2b = "game";
    }
    push();
    translate(385, 414);
    rotate(-30);
    _drawBigDuck();
    pop();
  } else {
    push();
    translate(399, 438);
    rotate(-30);
    _drawBigDuck();
    pop();
  }
}

function _drawBigDuck() {
  stroke(0, 0, 0);
  strokeWeight(10);
  fill(0, 0, 0);
  ellipse(0, 57, 186, 100);
  strokeWeight(176);
  line(0, 0, 0, 267);
  stroke(255);
  strokeWeight(166);
  line(0, 0, 0, 265);
  noStroke();
  fill(255, 217, 0);
  ellipse(0, 57, 186, 100);
  fill(0, 0, 0);
  ellipse(-63, 3, 20, 20);
  ellipse(63, 3, 20, 20);
  noFill();
  stroke(0, 0, 0);
  strokeWeight(10);
  arc(0, 38, 182, 67, 33, 146);
}

function how() {
  background(103, 81, 245);
  push();
  translate(77, 551);
  if (dist(mouseX, mouseY, 77, 551) < 40) {
    scale(1.2);
    if (clicked && scene === scene2b) {
      intro_timer = 110;
      scene2b = "menu";
    }
  }
  textSize(35);
  fill(0);
  text("Menu", 0, -2);
  fill(255);
  text("Menu", 0, 0);
  textSize(125);
  fill(255);
  text("⇦", -5, 6);
  pop();
  textSize(50);
  fill(255);
  text("how?", 300, 44);
  textSize(27);
  fill(0);
  text(
    "1. Be duck\n\n2. Collect pancakes,\n3. Feed said pancakes to carrot,\n4. Watch carrot\ngrow\n5. Repeat\n\n[W]\n[A][S][D]\nto move\n\n[space] to sprint",
    300,
    190,
  );
  fill(255);
  text(
    "1. Be duck\n\n2. Collect pancakes,\n3. Feed said pancakes to carrot,\n4. Watch carrot\ngrow\n5. Repeat\n\n[W]\n[A][S][D]\nto move\n\n[space] to sprint",
    300,
    189,
  );
  fill(0);
  textSize(15);
  text("the following steps are optional:", 308, 245);
  fill(255);
  textSize(15);
  text("the following steps are optional:", 308, 247);
}

function draw() {
  intro_timer += 2;
  textAlign("center", "center");

  switch (scene) {
    case "game":
      game();

      // ── Minimap ────────────────────────────────────────────────────────────
      // Drawn in screen-space (no camera transform).
      // World spans roughly ±1000 units; minimap is 110×110 at top-left corner.
      var _mm  = { x: 8, y: 8, w: 110, h: 110 };
      var _mmCx = _mm.x + _mm.w / 2;   // = 63  (world origin lands here)
      var _mmCy = _mm.y + _mm.h / 2;   // = 63
      var _mmS  = _mm.w / 2000;         // pixels per world unit  (110/2000)

      // Dark background
      noStroke(); fill(10, 45, 15, 215);
      rect(_mmCx, _mmCy, _mm.w, _mm.h, 5);

      // Subtle border
      stroke(255, 255, 255, 60); strokeWeight(1); noFill();
      rect(_mmCx, _mmCy, _mm.w, _mm.h, 5);

      // Clip so no dot can bleed outside the minimap border
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(_mm.x, _mm.y, _mm.w, _mm.h, 5);
      ctx.clip();

      // Random trees — green dots
      noStroke(); fill(55, 155, 55, 200);
      for (var _mt = 0; _mt < trees.length; _mt++) {
        ellipse(_mmCx + trees[_mt].x * _mmS, _mmCy + trees[_mt].y * _mmS, 5, 5);
      }

      // Treehouse — purple dot
      fill(155, 80, 255, 220);
      ellipse(_mmCx + 270 * _mmS, _mmCy + 340 * _mmS, 8, 8);

      // House — light-gray dot
      fill(200, 200, 200, 220);
      ellipse(_mmCx + 616 * _mmS, _mmCy + 222 * _mmS, 8, 8);

      // Carrot — orange dot
      fill(255, 140, 0, 255);
      ellipse(_mmCx + 0  * _mmS, _mmCy + 30  * _mmS, 8, 8);

      // Other players — cyan dots
      fill(80, 215, 255, 235);
      for (var _mKey in otherPlayers) {
        if (_mKey === mySocketId) continue;
        var _mP = otherPlayers[_mKey];
        ellipse(_mmCx + _mP.x * _mmS, _mmCy + _mP.y * _mmS, 7, 7);
      }

      // Local duck — bright yellow dot (drawn last so always on top)
      fill(255, 235, 50, 255);
      ellipse(_mmCx + ducks.x * _mmS, _mmCy + ducks.y * _mmS, 9, 9);

      ctx.restore();

      // ── Stats panel below the minimap ─────────────────────────────────────
      var dc = dist(ducks.x, ducks.y, -5, 48);
      noStroke(); fill(0, 0, 0, 160);
      rect(_mmCx, _mm.y + _mm.h + 17, _mm.w, 30, 4);
      fill(255, 255, 255, 210); textFont("Courier"); textSize(11);
      textAlign("left", "center");
      text("Carrot: " + round(dc / 50) + "m",  _mm.x + 6, _mm.y + _mm.h + 10);
      text("Size:   " + round(carrott.sz),       _mm.x + 6, _mm.y + _mm.h + 24);
      textAlign("center", "center");

      // ── Menu button ────────────────────────────────────────────────────────
      // Drawn in screen-space (no camera transform) at top-right of the canvas.
      // 1. Check if the mouse is hovering inside the button rectangle.
      // 2. Draw a rounded-rect background, darker when idle, lighter on hover.
      // 3. Draw the label on top.
      // 4. If hovered AND clicked this frame → save, pause music, start the
      //    intro-spin animation that transitions back to the menu scene.
      var _mbx = 557,
        _mby = 40,
        _mbw = 76,
        _mbh = 22;
      var _mbHover =
        mouseX > _mbx - _mbw / 2 &&
        mouseX < _mbx + _mbw / 2 &&
        mouseY > _mby - _mbh / 2 &&
        mouseY < _mby + _mbh / 2;
      noStroke();
      fill(
        _mbHover ? 120 : 60,
        _mbHover ? 70 : 30,
        _mbHover ? 220 : 160,
        _mbHover ? 230 : 180,
      );
      rect(_mbx, _mby, _mbw, _mbh, 7);
      fill(255);
      textFont("Courier");
      textSize(12);
      text("Menu", _mbx, _mby);
      if (_mbHover && clicked) {
        saveGame();
        bgPause();
        if (roomOverlay) roomOverlay.style.display = "flex";
        if (nameOverlay) nameOverlay.style.display = "flex";
        if (restartBtn) restartBtn.style.display = "block";
        intro_timer = 110;
        scene2b = "menu";
      }
      break;
    case "treeScene":
      treeScene();
      break;
    case "menu":
      menu();
      break;
    case "how":
      how();
      break;
  }

  // Auto-save every ~5 seconds (300 frames)
  if (frameCount % 300 === 0 && scene === "game") saveGame();

  if (intro_timer < 420) {
    push();
    translate(300, 300);
    for (var i = 0; i < 14; i++) {
      rotate(28);
      ducklol(0, 350 + sin(intro_timer) * 300, 0, 500);
    }
    ducklol(0, 350 + sin(intro_timer) * 300, 0, 1000);
    pop();
    if (intro_timer >= 268 && intro_timer < 272) {
      scene = scene2b;
      // When entering the game, join the room
      if (scene === "game") {
        const roomName = roomInput.value.trim() || "duck-game";
        if (roomOverlay) roomOverlay.style.display = "none";
        if (nameOverlay) nameOverlay.style.display = "none";
        if (restartBtn) restartBtn.style.display = "none";
        joinRoom(roomName);
        saveGame();
        bgPlay();
      }
      // Show overlays again if going back to menu
      if (scene === "menu") {
        if (roomOverlay) roomOverlay.style.display = "flex";
        if (nameOverlay) nameOverlay.style.display = "flex";
        if (restartBtn) restartBtn.style.display = "block";
        bgPause();
      }
      if (scene === "how") {
        if (roomOverlay) roomOverlay.style.display = "none";
        if (nameOverlay) nameOverlay.style.display = "none";
        if (restartBtn) restartBtn.style.display = "none";
        bgPause();
      }
    }
  }

  clicked = false;
  frameCount++;
  requestAnimationFrame(draw);
}

// ─── Kick off ─────────────────────────────────────────────────────────────────
textAlign("center", "center");
textFont("Courier");
loadGame();
requestAnimationFrame(draw);
