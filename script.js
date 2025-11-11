class _StackNode {
  constructor(value, next) {
    this.value = value;
    this.next = next;
  }
}

class Stack {
  constructor() {
    this.top = null;
    this.size = 0;
  }

  push(value) {
    const newNode = new _StackNode(value, this.top);
    this.top = newNode;
    this.size++;
  }

  pop() {
    if (this.isEmpty()) {
      return undefined;
    }
    const value = this.top.value;
    this.top = this.top.next;
    this.size--;
    return value;
  }

  peek() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.top.value;
  }

  isEmpty() {
    return this.size === 0;
  }

  getLength() {
    return this.size;
  }

  getValuesForRender() {
    const values = [];
    let current = this.top;

    while (current) {
      values.push(current.value);
      current = current.next;
    }

    return values.reverse();
  }
}

const numDiscosInput = document.getElementById('numDiscos');
const colorControls = document.getElementById('colorControls');
const generarBtn = document.getElementById('generarBtn');
const randomColorsBtn = document.getElementById('randomColorsBtn');

const stackEls = [
  document.getElementById('stack0'),
  document.getElementById('stack1'),
  document.getElementById('stack2')
];

const solveBtn = document.getElementById('solveBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const resetBtn = document.getElementById('resetBtn');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const boardEl = document.getElementById('tablero'); ;
const mensajeEl = document.getElementById('mensaje');
const moveCountEl = document.getElementById('moveCount');
const minMoveCountEl = document.getElementById('minMoveCount');
const timerEl = document.getElementById('timer');
const modalVictoriaEl = document.getElementById('modalVictoria');
const modalMoveCountEl = document.getElementById('modalMoveCount');
const modalTimeEl = document.getElementById('modalTime');
const modalTitle = document.getElementById('modalTitle');
const modalAutoSolveMsg = document.getElementById('modalAutoSolveMsg');
const modalStatsGroup = document.getElementById('modalStatsGroup');
const modalInputGroup = document.getElementById('modalInputGroup');
const modalPlayerName = document.getElementById('modalPlayerName');
const modalGuardarBtn = document.getElementById('modalGuardarBtn');
const modalErrorMsg = document.getElementById('modalErrorMsg');
const modalOmitirBtn = document.getElementById('modalOmitirBtn');
const recordsFilterSelect = document.getElementById('recordsDiskFilter');
const sortMovesBtn = document.getElementById('sortMovesBtn');
const sortTimeBtn = document.getElementById('sortTimeBtn');
const recordsTbody = document.getElementById('recordsTbody');
const recordsTitle = document.getElementById('recordsTitle');
const limit10Btn = document.getElementById('limit10Btn');
const limit100Btn = document.getElementById('limit100Btn');
const SUPABASE_URL = 'https://mdmlmtwplbxegzzskipd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fcmn9c6VyyBryB-o6Mu7ow_RKglz96d';
const supabase = window.supabase.createClient('https://mdmlmtwplbxegzzskipd.supabase.co', 'sb_publishable_fcmn9c6VyyBryB-o6Mu7ow_RKglz96d');

let numDiscos = parseInt(numDiscosInput.value, 10) || 3;

let pilas = [new Stack(), new Stack(), new Stack()];
let colores = [];
let dragSourceIndex = null;
let selectedPegIndex = null;

let moves = [];
let autoplayTimer = null;
let autoplayIndex = 0;
let autoplayPaused = false;

let moveCount = 0;
let isGameWon = false;

let timerInterval = null;
let millisecondsElapsed = 0;
let isTimerRunning = false;
let isTimerDisabled = false;

let hasSubmittedScore = false;
let currentRecordFilter = numDiscos;
let currentSortBy = 'moves';
let currentLimit = 10;

function crearControlesColor(n) {
  colorControls.innerHTML = '';
  colores = new Array(n + 1).fill('#ffffffff');
  for (let i = 1; i <= n; i++) {
    const wrapper = document.createElement('label');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.fontSize = '12px';
    wrapper.style.minWidth = '60px';

    const span = document.createElement('span');
    span.textContent = `D${i}`;
    span.style.marginBottom = '4px';

    const input = document.createElement('input');
    input.type = 'color';
    const t = (i - 1) / Math.max(1, n - 1);
    const defaultColor = hslToHex(220 - 120 * t, 70, 50);
    input.value = defaultColor;
    colores[i] = defaultColor;

    input.addEventListener('input', (e) => {
      colores[i] = e.target.value;
      renderPilas();
    });

    wrapper.appendChild(span);
    wrapper.appendChild(input);
    colorControls.appendChild(wrapper);
  }
}

function updateTimerDisplay() {
  if (isTimerDisabled) {
    timerEl.textContent = "--:--.---";
    return;
  }

  timerEl.textContent = formatTime(millisecondsElapsed);
}

function startTimer() {
  if (isTimerRunning || isTimerDisabled) return;
  isTimerRunning = true;

  let startTime = Date.now() - millisecondsElapsed; 

  timerInterval = setInterval(() => {

    millisecondsElapsed = Date.now() - startTime;
    updateTimerDisplay();
  }, 10);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  isTimerRunning = false;
}

function resetTimer() {
  stopTimer();
  millisecondsElapsed = 0;
  isTimerRunning = false;
  isTimerDisabled = false;
  updateTimerDisplay();
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function coloresAleatorios(){
  const h_start = Math.floor(Math.random() * 360);
  const h_shift_amount = 90 + Math.random() * 60; 
  const h_shift_direction = (Math.random() > 0.5 ? 1 : -1);
  const h_shift = h_shift_amount * h_shift_direction;

  const s = 70 + Math.random() * 10;
  const l = 55 + Math.random() * 10;

  for (let i = 1; i <= numDiscos; i++) {
    const t = (i - 1) / Math.max(1, numDiscos - 1);
    let current_h = (h_start + h_shift * t) % 360;

    if (current_h < 0) {
      current_h += 360;
    }

    const randomHex = hslToHex(current_h, s, l); 
    colores[i] = randomHex;
  }
  const colorInputs = colorControls.querySelectorAll('input[type="color"]');
  colorInputs.forEach((input, idx)=> {
    if (colores[idx+1]) {
      input.value = colores[idx+1];
    }
  });
  renderPilas();
}

function inicializarPilas() {
  clearAutoplay();
  pilas = [new Stack(), new Stack(), new Stack()];
  for (let i = numDiscos; i >= 1; i--) {
    pilas[0].push(i);
  }
  moves = [];
  autoplayIndex = 0;
  autoplayPaused = false;
  dragSourceIndex = null;

  if (selectedPegIndex !== null) {
    stackEls[selectedPegIndex].parentElement.classList.remove('peg-selected');
    selectedPegIndex = null;
  }

  mensajeEl.textContent = '';

  moveCount = 0;
  moveCountEl.textContent = moveCount;
  const minMoves = Math.pow(2, numDiscos) - 1;
  minMoveCountEl.textContent = minMoves;
  isGameWon = false;

  hasSubmittedScore = false;
  
  stackEls.forEach(el => {
    el.parentElement.style.pointerEvents = 'auto';
  });

  resetTimer();

  if (boardEl) {
    boardEl.style.height = 'auto'; 
  }

  updateControlButtons(true);
  renderPilas();

  setTimeout(() => {
    if (boardEl) {
      const newHeight = boardEl.offsetHeight;
      boardEl.style.height = `${newHeight}px`;
    }
  }, 0);
}

function renderPilas() {
  for (let p = 0; p < 3; p++) {
    stackEls[p].innerHTML = '';
    const pilaArray = pilas[p].getValuesForRender();
    for (let i = 0; i < pilaArray.length; i++) {
      const size = pilaArray[i];
      const diskEl = document.createElement('div');
      diskEl.className = 'disk';
      diskEl.dataset.size = size;
      diskEl.textContent = size;
      const maxWidthPercent = 90;
      const minWidthPercent = 30;
      const ratio = (size - 1) / Math.max(1, numDiscos - 1);
      const widthPercent = minWidthPercent + (maxWidthPercent - minWidthPercent) * ratio;
      diskEl.style.width = `${widthPercent}%`;

      diskEl.style.background = colores[size] || '#888';

      const isTop = (i === pilaArray.length - 1);
      if (isTop) {
        diskEl.style.cursor = 'grab';
        diskEl.draggable = true;
        diskEl.addEventListener('dragstart', (e) => {
          if (autoplayTimer !== null && !autoplayPaused) {
            e.preventDefault();
            return;
          }
          if (selectedPegIndex !== null) {
            stackEls[selectedPegIndex].parentElement.classList.remove('peg-selected');
            selectedPegIndex = null;
          }
          dragSourceIndex = p;
          e.target.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        diskEl.addEventListener('dragend', (e) => {
          e.target.classList.remove('dragging');
          stackEls.forEach(el => el.parentElement.classList.remove('drag-over', 'invalid-over'));
          dragSourceIndex = null;
        });
      } else {
        diskEl.style.opacity = '0.85';
      }

      stackEls[p].appendChild(diskEl);
    }
  }
}

function intentarMover(fromIndex, toIndex, isUserMove = false) {
  if (isUserMove) {
    isTimerDisabled = false;
    
    if (isUserMove && (autoplayTimer !== null || autoplayPaused)) {
      if (autoplayTimer !== null) {
        clearTimeout(autoplayTimer);
        autoplayTimer = null; 
      }
    autoplayPaused = true;
    moves = [];
    autoplayIndex = 0;

    updateControlButtons(); 
    }
  }

  if (pilas[fromIndex].isEmpty()) { 
    return false;
  }
  const disco = pilas[fromIndex].peek(); 
  const destTop = pilas[toIndex].peek(); 

  if (destTop !== undefined && destTop < disco) {
    return false;
  }

  if (isUserMove && !isTimerRunning && millisecondsElapsed === 0 && !isTimerDisabled) {
      startTimer();
  }

  pilas[fromIndex].pop();
  pilas[toIndex].push(disco);

  moveCount++;
  moveCountEl.textContent = moveCount;

  mensajeEl.textContent = '';
  renderPilas();
  comprobarVictoria();
  return true;
}

stackEls.forEach((stackEl, pegIndex) => {
  const pegEl = stackEl.parentElement;

    pegEl.addEventListener('dragover', (e) => {
      e.preventDefault();

      if (dragSourceIndex === null || dragSourceIndex === pegIndex) {
        return; 
      }

      // Usa .peek() para ver los discos
      const disco = pilas[dragSourceIndex].peek();
      const destTop = pilas[pegIndex].peek();

      if (destTop === undefined || destTop > disco) {
        pegEl.classList.add('drag-over');
        pegEl.classList.remove('invalid-over');
        e.dataTransfer.dropEffect = 'move';
      } else {
        pegEl.classList.add('invalid-over');
        pegEl.classList.remove('drag-over');
        e.dataTransfer.dropEffect = 'none';
      }
    });

    pegEl.addEventListener('click', () => {
      if (isGameWon || (autoplayTimer !== null && !autoplayPaused)) {
        return;
      }

      if (selectedPegIndex === null) {
        if (pilas[pegIndex].isEmpty()) {
          return;
        }
        selectedPegIndex = pegIndex;
        pegEl.classList.add('peg-selected');
      } 
      else {
        const fromIndex = selectedPegIndex;
        const toIndex = pegIndex;
        stackEls[fromIndex].parentElement.classList.remove('peg-selected');
        selectedPegIndex = null;

        if (fromIndex !== toIndex) {
          intentarMover(fromIndex, toIndex, true);
        }
      }
    });

  pegEl.addEventListener('dragleave', (e) => {
    pegEl.classList.remove('drag-over', 'invalid-over');
  });

  pegEl.addEventListener('drop', (e) => {
    e.preventDefault();
    pegEl.classList.remove('drag-over', 'invalid-over');

    if (dragSourceIndex === null || dragSourceIndex === pegIndex) {
      return;
      }
    intentarMover(dragSourceIndex, pegIndex, true);
    });
});

function generarMovimientos(n, from, to, aux, outMoves) {
  if (n === 0) return;
  generarMovimientos(n - 1, from, aux, to, outMoves);
  outMoves.push({ from, to });
  generarMovimientos(n - 1, aux, to, from, outMoves);
}

function updateControlButtons(isInitial = false) {
  if (isGameWon) {
    solveBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    resetBtn.disabled = false;

  } else if (autoplayPaused) {
    solveBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    resetBtn.disabled = false;

  } else if (autoplayTimer !== null && !autoplayPaused) {
    solveBtn.disabled = true;
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    resetBtn.disabled = false;

  } else {
    solveBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    resetBtn.disabled = isInitial ? false : false;
  }
}

function iniciarAutoplay() {
  if (autoplayTimer !== null && !autoplayPaused) return;

  inicializarPilas();

  moves = [];
  generarMovimientos(numDiscos, 0, 2, 1, moves);
  autoplayIndex = 0;
  autoplayPaused = false;
  runAutoplayStep();
  updateControlButtons();
}

function runAutoplayStep() {
  if (autoplayIndex >= moves.length) {
    clearAutoplay();
    updateControlButtons();
    return;
  }
  const ms = parseInt(speedRange.value, 10);
  autoplayTimer = setTimeout(() => {
    const mv = moves[autoplayIndex];
    intentarMover(mv.from, mv.to, false);
    autoplayIndex++;
    if (!autoplayPaused) runAutoplayStep(); 
  }, ms);
}

let movesQueue = [];

function pausarAutoplay() {
  if (autoplayTimer !== null) {
    clearTimeout(autoplayTimer);
  }
  autoplayPaused = true;
  stopTimer();
  updateControlButtons();
}

function reanudarAutoplay() {
  if (!autoplayPaused) return;
  autoplayPaused = false;
  startTimer();
  updateControlButtons();
  runAutoplayStep();
}

function clearAutoplay() {
  if (autoplayTimer !== null) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
  autoplayPaused = false;
  autoplayIndex = 0;
  moves = [];
  updateControlButtons();
}

async function comprobarVictoria() {
  if (!isGameWon && (pilas[1].getLength() === numDiscos || pilas[2].getLength() === numDiscos)) {
    isGameWon = true;
    clearAutoplay();
    stopTimer();

    stackEls.forEach(el => {
      el.parentElement.style.pointerEvents = 'none';
    });

    modalMoveCountEl.textContent = moveCount;
    const timeString = formatTime(millisecondsElapsed); 
    modalTimeEl.textContent = timeString;

    if (isTimerDisabled) {
      modalTitle.classList.add('hide');
      modalAutoSolveMsg.classList.remove('hide');
      modalInputGroup.classList.add('hide');
      modalGuardarBtn.classList.add('hide');
      
      modalOmitirBtn.textContent = 'Aceptar';
      modalStatsGroup.classList.remove('hide');
      modalTimeEl.textContent = `${timeString} (Solución Auto.)`;

    } else {
      modalTitle.classList.remove('hide');
      modalTitle.textContent = '¡Felicidades!';
      modalAutoSolveMsg.classList.add('hide');
      modalInputGroup.classList.remove('hide');
      modalGuardarBtn.classList.remove('hide');

      modalOmitirBtn.textContent = 'Omitir';
      modalPlayerName.value = '';
      modalErrorMsg.textContent = '';
      modalStatsGroup.classList.remove('hide');
    }

    modalVictoriaEl.classList.add('visible');
  }
}

function updateSliderFill() {
  const value = parseInt(speedRange.value, 10);
  const min = parseInt(speedRange.min, 10);
  const max = parseInt(speedRange.max, 10);
  const percent = ((value - min) / (max - min)) * 100;
  speedRange.style.setProperty('--slider-fill-percent', `${percent}%`);
}

function findDisk(diskNum) {

    for (let i = 0; i < pilas.length; i++) {
        let valoresEnPila = pilas[i].getValuesForRender(); 

        if (valoresEnPila.includes(diskNum)) {
            return i;
        }
    }
    
    console.error(`Error: No se pudo encontrar el disco ${diskNum} en la variable 'pilas'`);
    return -1;
}

function generarMovimientosDesdeEstado(n, targetPeg) {
  if (n === 0) {
    return;
  }
  let sourcePeg = findDisk(n);
  if (sourcePeg === targetPeg) {
    generarMovimientosDesdeEstado(n - 1, targetPeg);
  } else {
    let auxPeg = 3 - sourcePeg - targetPeg; 
    generarMovimientosDesdeEstado(n - 1, auxPeg);
    movesQueue.push({ from: sourcePeg, to: targetPeg });
    generarMovimientos(n - 1, auxPeg, targetPeg, sourcePeg, movesQueue);
    }
}

async function saveRecord(newRecord) {
  try {
    const { data, error } = await supabase
      .from('records')
      .insert([newRecord]);
    if (error) {
      console.error('Error al guardar el récord:', error.message);
      alert('Error al guardar el récord: ' + error.message);
    }
  } catch (err) {
    console.error('Error inesperado al guardar:', err);
  }
}

function formatTime(totalMilliseconds) {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = totalMilliseconds % 1000; 
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

async function renderRecords() {
  recordsTitle.textContent = `Top ${currentLimit} puntajes`;
  recordsTbody.innerHTML = '<tr><td colspan="4">Cargando récords...</td></tr>';

  let query = supabase
    .from('records')
    .select('*')
    .eq('disks', currentRecordFilter)
    .limit(currentLimit);

  if (currentSortBy === 'moves') {
    query = query.order('moves', { ascending: true }).order('time', { ascending: true });
  } else {
    query = query.order('time', { ascending: true }).order('moves', { ascending: true });
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('Error al cargar récords:', error.message);
    recordsTbody.innerHTML = `<tr><td colspan="4">Error al cargar récords.</td></tr>`;
    return;
  }

  if (currentSortBy === 'moves') {
    sortMovesBtn.classList.add('active');
    sortTimeBtn.classList.remove('active');
  } else {
    sortMovesBtn.classList.remove('active');
    sortTimeBtn.classList.add('active');
  }

  if (currentLimit === 10) {
    limit10Btn.classList.add('active');
    limit100Btn.classList.remove('active');
  } else {
    limit10Btn.classList.remove('active');
    limit100Btn.classList.add('active');
  }

  if (!records || records.length === 0) {
    recordsTbody.innerHTML = `<tr><td colspan="4">No hay récords para esta cantidad de discos.</td></tr>`;
    return;
  }
  
  recordsTbody.innerHTML = ''; 
  
  records.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Pos.:">${index + 1}</td>
      <td data-label="Nombre:">${escapeHTML(r.name)}</td>
      <td data-label="Movimientos:">${r.moves}</td>
      <td data-label="Tiempo:">${formatTime(r.time)}</td>
    `;
    recordsTbody.appendChild(tr);
  });
}

function populateFilterSelect() {
  recordsFilterSelect.innerHTML = '';
  const min = 3;
  const max = 10;
  for (let i = min; i <= max; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i} Discos`;
    recordsFilterSelect.appendChild(option);
  }
  recordsFilterSelect.value = currentRecordFilter;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

generarBtn.addEventListener('click', async () => {
  const val = parseInt(numDiscosInput.value, 10);
  if (isNaN(val) || val < 3 || val > 10) {
    mensajeEl.textContent = '*Ingresa un número de discos entre 3 y 10.*';
    return;
  }
  numDiscos = val;
  crearControlesColor(numDiscos);
  inicializarPilas();

  currentRecordFilter = numDiscos;
  recordsFilterSelect.value = numDiscos;
  await renderRecords();
});

numDiscosInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {

    e.preventDefault(); 
    generarBtn.click(); 
  }
});

randomColorsBtn.addEventListener('click', () => {
  coloresAleatorios();
});

solveBtn.addEventListener('click', () => {
    pausarAutoplay(); 
    
    stopTimer();
    isTimerDisabled = true;
    updateTimerDisplay();

    movesQueue = [];
    let numDiscos = parseInt(document.getElementById('numDiscos').value);
    let targetPeg = 2;

    generarMovimientosDesdeEstado(numDiscos, targetPeg); 

    moves = movesQueue; 
    autoplayIndex = 0;
    autoplayPaused = false;

    runAutoplayStep();
    updateControlButtons();
});

pauseBtn.addEventListener('click', () => {
  pausarAutoplay();
});

resumeBtn.addEventListener('click', () => {
    pausarAutoplay(); 

    stopTimer();
    isTimerDisabled = true;
    updateTimerDisplay();
    
    movesQueue = []; 
    let numDiscos = parseInt(document.getElementById('numDiscos').value);
    let targetPeg = 2; 

    generarMovimientosDesdeEstado(numDiscos, targetPeg); 
    
    moves = movesQueue;
    autoplayIndex = 0;
    autoplayPaused = false;
    
    runAutoplayStep();
    updateControlButtons();
});

resetBtn.addEventListener('click', () => {
  clearAutoplay();
  inicializarPilas();
});

speedRange.addEventListener('input', () => {
  speedValue.textContent = speedRange.value;
  updateSliderFill();
});

modalGuardarBtn.addEventListener('click', async () => {
  if (hasSubmittedScore) return;

  const playerName = modalPlayerName.value.trim();
  modalErrorMsg.textContent = '';

  if (playerName.length < 3 || playerName.length > 10) {
     modalErrorMsg.textContent = 'El nombre debe tener entre 3 y 10 caracteres.';
    return;
  }

  hasSubmittedScore = true;

  const record = {
    name: playerName,
    disks: numDiscos,
    moves: moveCount,
    time: millisecondsElapsed
  };

  await saveRecord(record);
  modalVictoriaEl.classList.remove('visible');
  await renderRecords();
});

modalOmitirBtn.addEventListener('click', async () => {
  modalVictoriaEl.classList.remove('visible');
  await renderRecords();
});

recordsFilterSelect.addEventListener('change', async (e) => {
  currentRecordFilter = parseInt(e.target.value, 10);
  await renderRecords();
});

sortMovesBtn.addEventListener('click', async () => {
  currentSortBy = 'moves';
  await renderRecords();
});

sortTimeBtn.addEventListener('click', async () => {
  currentSortBy = 'time';
  await renderRecords();
});

sortTimeBtn.addEventListener('click', async () => {
  currentSortBy = 'time';
  await renderRecords();
});

limit10Btn.addEventListener('click', async () => {
  currentLimit = 10;
  await renderRecords();
});

limit100Btn.addEventListener('click', async () => {
  currentLimit = 100;
  await renderRecords();
});

window.addEventListener('load', async () => {
  crearControlesColor(numDiscos);
  inicializarPilas();
  updateSliderFill();
  
  populateFilterSelect();
  currentRecordFilter = numDiscos;
  recordsFilterSelect.value = numDiscos;
  await renderRecords();
});
