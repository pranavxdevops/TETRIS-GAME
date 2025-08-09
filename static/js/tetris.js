// Tetris implementation (concise, readable, and functional)
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const COLS = 10; const ROWS = 20; const BLOCK = canvas.width / COLS; // square blocks

  // Scale for crisp rendering on HiDPI screens
  const DPR = window.devicePixelRatio || 1;
  canvas.width = 320 * DPR; canvas.height = 640 * DPR; canvas.style.width = '320px'; canvas.style.height = '640px';
  ctx.scale(DPR, DPR);

  // HUD
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');

  // Game state
  let arena = createMatrix(COLS, ROWS);
  let score = 0; let level = 1; let dropCounter = 0; let dropInterval = 800;
  let lastTime = 0; let gameOver = false; let paused = false;

  // Pieces and colors
  const PIECES = {
    'I': [[1,1,1,1]],
    'J': [[1,0,0],[1,1,1]],
    'L': [[0,0,1],[1,1,1]],
    'O': [[1,1],[1,1]],
    'S': [[0,1,1],[1,1,0]],
    'T': [[0,1,0],[1,1,1]],
    'Z': [[1,1,0],[0,1,1]]
  };
  const COLORS = {
    'I':'#67e8f9','J':'#60a5fa','L':'#fb923c','O':'#facc15','S':'#34d399','T':'#a78bfa','Z':'#f87171'
  };

  function createMatrix(w,h){
    const m = [];
    for(let y=0;y<h;y++) m.push(new Array(w).fill(0));
    return m;
  }

  function collide(arena, player){
    const [m, o] = [player.matrix, player.pos];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0) return true;
      }
    }
    return false;
  }

  function merge(arena, player){
    player.matrix.forEach((row,y)=>{
      row.forEach((value,x)=>{
        if(value) arena[y+player.pos.y][x+player.pos.x] = player.type;
      });
    });
  }

  function rotate(matrix, dir){
    for(let y=0;y<matrix.length;y++){
      for(let x=0;x<y;x++){
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    if(dir>0) matrix.forEach(row => row.reverse()); else matrix.reverse();
  }

  function playerReset(){
    const types = Object.keys(PIECES);
    const type = types[Math.floor(Math.random()*types.length)];
    player.type = type;
    player.matrix = PIECES[type].map(r => r.slice());
    player.pos.y = 0; player.pos.x = Math.floor(COLS/2) - Math.ceil(player.matrix[0].length/2);
    if(collide(arena, player)){
      arena = createMatrix(COLS, ROWS);
      score = 0; level = 1; dropInterval = 800; gameOver = true;
    }
  }

  function sweep(){
    let rowCount = 0;
    outer: for(let y=arena.length-1;y>=0;y--){
      for(let x=0;x<arena[y].length;x++){
        if(!arena[y][x]) continue outer;
      }
      const row = arena.splice(y,1)[0].fill(0);
      arena.unshift(row);
      rowCount++;
      y++;
    }
    if(rowCount>0){
      const points = [0,40,100,300,1200];
      score += points[rowCount] * level;
      level = Math.min(20, 1 + Math.floor(score / 500));
      dropInterval = Math.max(80, 800 - (level-1) * 40);
      gameOver = false;
    }
  }

  function drawBlock(x,y,color){
    const xpx = x * (canvas.width/DPR / COLS);
    const ypx = y * (canvas.height/DPR / ROWS);
    const size = canvas.width/DPR / COLS;
    // subtle 3D effect
    ctx.fillStyle = color;
    roundRect(ctx, xpx+1, ypx+1, size-2, size-2, 4);
    ctx.fill();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(xpx+2, ypx+2, size-6, (size-6)/2);
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,320,640);

    // draw arena
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const cell = arena[y][x];
        if(cell){
          drawBlock(x,y,COLORS[cell]);
        }
      }
    }
    // draw player
    player.matrix.forEach((row,y)=>{
      row.forEach((value,x)=>{
        if(value){
          drawBlock(player.pos.x + x, player.pos.y + y, COLORS[player.type]);
        }
      });
    });
  }

  function roundRect(ctx, x, y, w, h, r){
    const radius = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+radius, y);
    ctx.arcTo(x+w, y, x+w, y+h, radius);
    ctx.arcTo(x+w, y+h, x, y+h, radius);
    ctx.arcTo(x, y+h, x, y, radius);
    ctx.arcTo(x, y, x+w, y, radius);
    ctx.closePath();
  }

  function playerDrop(){
    player.pos.y++;
    if(collide(arena, player)){
      player.pos.y--;
      merge(arena, player);
      sweep();
      playerReset();
      updateHUD();
    }
    dropCounter = 0;
  }

  function playerMove(dir){
    player.pos.x += dir;
    if(collide(arena, player)) player.pos.x -= dir;
  }

  function playerRotate(dir){
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while(collide(arena, player)){
      player.pos.x += offset;
      offset = -(offset + (offset>0?1:-1));
      if(Math.abs(offset) > player.matrix[0].length) { rotate(player.matrix, -dir); player.pos.x = pos; return; }
    }
  }

  function hardDrop(){
    while(!collide(arena, player)) player.pos.y++;
    player.pos.y--;
    merge(arena, player);
    sweep();
    playerReset();
    updateHUD();
  }

  function updateHUD(){
    scoreEl.textContent = score;
    levelEl.textContent = level;
    drawNext();
  }

  function drawNext(){
    nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    const size = nextCanvas.width/4; // scale so pieces fit in 4x4
    const m = player.matrix; // last generated piece is in player.type
    // center it
    const offsetX = (nextCanvas.width/ DPR / 2) - (m[0].length * size/2);
    const offsetY = (nextCanvas.height/ DPR / 2) - (m.length * size/2);
    // draw
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          nctx.fillStyle = COLORS[player.type];
          nctx.fillRect(offsetX + x*size + 4, offsetY + y*size + 4, size-8, size-8);
        }
      }
    }
  }

  // Controls
  document.addEventListener('keydown', e => {
    if(e.key === 'ArrowLeft') playerMove(-1);
    else if(e.key === 'ArrowRight') playerMove(1);
    else if(e.key === 'ArrowDown') playerDrop();
    else if(e.key === 'ArrowUp') playerRotate(1);
    else if(e.code === 'Space') { e.preventDefault(); hardDrop(); }
    else if(e.key.toLowerCase() === 'p') togglePause();
    updateHUD(); draw();
  });

  document.getElementById('startBtn').addEventListener('click', () => startGame());
  document.getElementById('pauseBtn').addEventListener('click', () => togglePa