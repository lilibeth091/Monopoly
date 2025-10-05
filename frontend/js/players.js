// colores disponibles para las fichas de los jugadores
const colors = [
  {id: 'red', label: 'Rojo', hex: '#d9534f'},
  {id: 'blue', label: 'Azul', hex: '#0d6efd'},
  {id: 'green', label: 'Verde', hex: '#198754'},
  {id: 'yellow', label: 'Amarillo', hex: '#ffc107'},
  {id: 'purple', label: 'Morado', hex: '#6f42c1'},
  {id: 'orange', label: 'Naranja', hex: '#fd7e14'},
  {id: 'black', label: 'Negro', hex: '#212529'},
  {id: 'pink', label: 'Rosa', hex: '#e83e8c'}
];

// almacena los países cargados del backend para no tener que pedirlos varias veces
let countriesCache = null;

// guarda los colores que ya están siendo usados por los jugadores
let selectedColors = new Set();

// cuando carga la página, inicializa todo
document.addEventListener('DOMContentLoaded', () => {
  initializeModals();
  setupEventListeners();
});

// crea los objetos modal de bootstrap para usarlos después
function initializeModals() {
  window.selectCountModal = new bootstrap.Modal(document.getElementById('selectCountModal'));
  window.playerConfigModal = new bootstrap.Modal(document.getElementById('playerConfigModal'));
  window.goodbyeModal = new bootstrap.Modal(document.getElementById('goodbyeModal'));
}

// configura todos los eventos de clicks y cambios en la página
function setupEventListeners() {
  const btnPlay = document.getElementById('btnPlay');
  const btnRanking = document.getElementById('btnRanking');
  const btnExit = document.getElementById('btnExit');
  const playerConfigModalEl = document.getElementById('playerConfigModal');

  // cuando le dan click a jugar, muestra el modal para elegir cantidad de jugadores
  btnPlay.addEventListener('click', () => selectCountModal.show());

  // cuando confirman la cantidad de jugadores, carga países y crea los formularios
  document.getElementById('btnCountNext').addEventListener('click', async () => {
    const count = Number(document.querySelector('input[name="playerCount"]:checked').value);
    selectCountModal.hide();
    
    showLoading('Cargando países...');
    
    try {
      await loadCountries();
      hideLoading();
      createPlayerForms(count);
      playerConfigModal.show();
    } catch (error) {
      hideLoading();
      showError('No se pudieron cargar los países. Verifica que el backend esté corriendo en http://127.0.0.1:5000');
    }
  });

  // muestra el ranking cuando le dan click al botón
  btnRanking.addEventListener('click', async () => {
    await showRanking();
  });

  // muestra el modal de despedida cuando le dan salir
  btnExit.addEventListener('click', () => {
    goodbyeModal.show();
  });

  // cuando le dan comenzar juego, guarda los datos y va a la pantalla del juego
  document.getElementById('btnStartGame').addEventListener('click', () => {
    const players = gatherPlayersData();
    localStorage.setItem('monopoly_players', JSON.stringify(players));
    playerConfigModal.hide();
    window.location.href = 'game.html';
  });

  // limpia los colores seleccionados cuando se cierra el modal de jugadores
  playerConfigModalEl.addEventListener('hidden.bs.modal', () => {
    selectedColors.clear();
  });
}

// trae la lista de países del backend y la guarda en caché
async function loadCountries() {
  if (countriesCache) {
    return countriesCache;
  }

  const data = await MonopolyAPI.getCountries();
  const out = [];

  // procesa el json que viene del backend en diferentes formatos posibles
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => {
          if (item[k]) {
            out.push({code: k, name: item[k]});
          }
        });
      }
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(k => {
      if (data[k]) {
        out.push({code: k, name: data[k]});
      }
    });
  }

  if (out.length === 0) {
    throw new Error('No se encontraron países en la respuesta del backend');
  }

  // ordena los países alfabéticamente y los guarda
  countriesCache = out.sort((a, b) => a.name.localeCompare(b.name));
  return countriesCache;
}

// crea las tarjetas de formulario para cada jugador con todos sus campos
function createPlayerForms(count) {
  const container = document.getElementById('playersContainer');
  container.innerHTML = '';
  selectedColors.clear();

  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">Jugador ${idx}</h6>
        <small class="text-muted">Dinero inicial: $1500</small>
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label">Nickname <span class="required">*</span></label>
          <input type="text" class="form-control player-nickname" data-player="${i}" placeholder="Escribe un nickname">
        </div>
        <div class="col-md-6">
          <label class="form-label">País <span class="required">*</span></label>
          <select class="form-select player-country" data-player="${i}">
            <option value="">Cargando países...</option>
          </select>
        </div>
        <div class="col-12 mt-2">
          <label class="form-label">Color de ficha <span class="required">*</span></label>
          <div class="d-flex flex-wrap gap-2 player-colors" data-player="${i}"></div>
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  populateCountrySelects();
  populateColorOptions();

  // valida en tiempo real cuando escriben o cambian algo
  container.querySelectorAll('.player-nickname').forEach(input => {
    input.addEventListener('input', validateAndToggleStart);
    input.addEventListener('blur', validateAndToggleStart);
  });
  
  container.querySelectorAll('.player-country').forEach(select => {
    select.addEventListener('change', validateAndToggleStart);
  });
}

// llena los selectores de países con la lista cargada
function populateCountrySelects() {
  const selects = document.querySelectorAll('.player-country');
  
  selects.forEach(select => {
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Selecciona un país...';
    select.appendChild(defaultOpt);

    if (!countriesCache || countriesCache.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No se pudo cargar la lista de países';
      select.appendChild(opt);
      return;
    }

    countriesCache.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  });
}

// crea los botones de radio para elegir color de ficha
function populateColorOptions() {
  const containers = document.querySelectorAll('.player-colors');
  
  containers.forEach(container => {
    container.innerHTML = '';
    const idx = container.dataset.player;

    colors.forEach(col => {
      const id = `color_${col.id}_${idx}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check';
      wrapper.classList.add('me-2');
      wrapper.innerHTML = `
        <input class="form-check-input color-radio" type="radio" name="color_player_${idx}" id="${id}" value="${col.id}" data-hex="${col.hex}">
        <label class="form-check-label color-option-label" for="${id}">
          <span class="color-swatch color-${col.id}" data-hex="${col.hex}"></span>
          ${col.label}
        </label>
      `;
      container.appendChild(wrapper);
    });
  });

  // cuando eligen un color, actualiza cuáles están disponibles
  document.querySelectorAll('.player-colors').forEach(pc => {
    pc.addEventListener('change', (ev) => {
      if (ev.target && ev.target.matches('.color-radio')) {
        updateSelectedColors();
        updateColorAvailability();
        validateAndToggleStart();
      }
    });
  });
}

// actualiza el set con los colores que ya están seleccionados
function updateSelectedColors() {
  selectedColors.clear();
  document.querySelectorAll('.color-radio:checked').forEach(r => selectedColors.add(r.value));
}

// deshabilita los colores que ya están siendo usados por otros jugadores
function updateColorAvailability() {
  document.querySelectorAll('.color-radio').forEach(r => {
    r.disabled = false;
  });

  document.querySelectorAll('.player-colors').forEach(pc => {
    const idx = pc.dataset.player;
    const otherSelected = new Set();

    document.querySelectorAll('.player-colors').forEach(inner => {
      if (inner.dataset.player !== idx) {
        const checked = inner.querySelector('.color-radio:checked');
        if (checked) otherSelected.add(checked.value);
      }
    });

    pc.querySelectorAll('.color-radio').forEach(r => {
      if (otherSelected.has(r.value)) r.disabled = true;
    });
  });
}

// valida que todos los campos estén llenos y no haya nicknames duplicados
function validateAndToggleStart() {
  const nickInputs = document.querySelectorAll('.player-nickname');
  const countrySelects = document.querySelectorAll('.player-country');
  let allOk = true;

  // verifica que todos los campos tengan algo
  nickInputs.forEach(inp => { if (!inp.value.trim()) allOk = false; });
  countrySelects.forEach(sel => { if (!sel.value) allOk = false; });
  document.querySelectorAll('.player-colors').forEach(pc => {
    const checked = pc.querySelector('.color-radio:checked');
    if (!checked) allOk = false;
  });

  // chequea que no haya nicknames repetidos
  const nicknames = Array.from(nickInputs).map(inp => inp.value.trim().toLowerCase());
  const uniqueNicks = new Set(nicknames);
  
  if (nicknames.length !== uniqueNicks.size || nicknames.some(n => n === '')) {
    allOk = false;
  }

  // marca visualmente los campos con nicknames duplicados
  nickInputs.forEach(inp => {
    const currentNick = inp.value.trim().toLowerCase();
    const duplicates = nicknames.filter(n => n === currentNick && n !== '').length;
    
    if (duplicates > 1 && currentNick !== '') {
      inp.classList.add('is-invalid');
      
      let feedback = inp.nextElementSibling;
      if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = 'Este nickname ya está en uso';
        inp.parentNode.appendChild(feedback);
      }
    } else {
      inp.classList.remove('is-invalid');
      const feedback = inp.nextElementSibling;
      if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.remove();
      }
    }
  });

  // habilita o deshabilita el botón de iniciar según si todo está ok
  document.getElementById('btnStartGame').disabled = !allOk;
}

// recopila todos los datos de los jugadores de los formularios
function gatherPlayersData() {
  const players = [];
  const cards = document.querySelectorAll('.player-card');

  cards.forEach((card, i) => {
    const nick = card.querySelector('.player-nickname').value.trim();
    const country = card.querySelector('.player-country').value;
    const colorEl = card.querySelector('.color-radio:checked');
    const color = colorEl ? colorEl.value : null;
    const colorHex = colorEl ? colorEl.dataset.hex : null;

    players.push({
      nick_name: nick,
      country_code: country,
      color: color,
      color_hex: colorHex,
      money: 1500,
      position: 0,
      properties: [],
      mortgaged: [],
      
      // NUEVAS PROPIEDADES PARA CÁRCEL
      in_jail: false,
      jail_turns: 0,
      doubles_count: 0
    });
  });

  return players;
}

// obtiene el ranking del backend y lo muestra en una tabla
async function showRanking() {
  showLoading('Cargando ranking...');
  
  try {
    const ranking = await MonopolyAPI.getRanking();
    hideLoading();
    
    if (!ranking || ranking.length === 0) {
      alert('No hay jugadores en el ranking todavía.');
      return;
    }

    let html = '<div class="table-responsive"><table class="table table-striped">';
    html += '<thead><tr><th>Posición</th><th>Jugador</th><th>País</th><th>Puntaje</th></tr></thead><tbody>';
    
    ranking.forEach((player, index) => {
      const flagUrl = `https://flagsapi.com/${player.country_code.toUpperCase()}/flat/32.png`;
      html += `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td>${player.nick_name}</td>
          <td><img src="${flagUrl}" alt="${player.country_code}" class="me-2">${player.country_code.toUpperCase()}</td>
          <td><span class="badge bg-primary">${player.score}</span></td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    
    showModal('Ranking Global', html);
  } catch (error) {
    hideLoading();
    showError('No se pudo cargar el ranking. Verifica que el backend esté corriendo.');
  }
}

// muestra un overlay oscuro con un spinner de carga
function showLoading(message = 'Cargando...') {
  const loading = document.createElement('div');
  loading.id = 'loadingOverlay';
  loading.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;';
  loading.innerHTML = `<div class="spinner-border text-light" role="status"><span class="visually-hidden">${message}</span></div>`;
  document.body.appendChild(loading);
}

// quita el overlay de carga
function hideLoading() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.remove();
}

// muestra un mensaje de error con alert
function showError(message) {
  alert('❌ Error: ' + message);
}

// crea y muestra un modal dinámico con el contenido que le pases
function showModal(title, content) {
  const modal = `
    <div class="modal fade" id="dynamicModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${content}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modal);
  const modalEl = new bootstrap.Modal(document.getElementById('dynamicModal'));
  modalEl.show();
  
  // se autodestruye cuando se cierra
  document.getElementById('dynamicModal').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}