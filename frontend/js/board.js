class MonopolyBoard {
  constructor() {
    this.boardData = null;
    this.players = [];
    this.currentPlayerIndex = 0;
  }

  //Inicializar el tablero con datos del backend y jugadores
  async initialize() {
    try {
      // Cargar datos del tablero desde el backend
      this.boardData = await MonopolyAPI.getBoard();
      
      // Cargar jugadores desde localStorage
      const playersData = localStorage.getItem('monopoly_players');
      if (!playersData) {
        throw new Error('No se encontraron datos de jugadores');
      }
      this.players = JSON.parse(playersData);

      // Asegurar que todos los jugadores tengan las propiedades de cárcel
      this.players.forEach(player => {
        if (player.in_jail === undefined) player.in_jail = false;
        if (player.jail_turns === undefined) player.jail_turns = 0;
        if (player.doubles_count === undefined) player.doubles_count = 0;
      });
      
      // Renderizar el tablero
      this.render();
      
      // Inicializar controles del juego
      this.initializeGameControls();
      
      console.log('Tablero inicializado correctamente', {
        casillas: this.getTotalSquares(),
        jugadores: this.players.length
      });
      
    } catch (error) {
      console.error('Error al inicializar el tablero:', error);
      alert('Error al cargar el tablero. Verifica que el backend esté corriendo.');
    }
  }

  //obtener el número total de casillas
  getTotalSquares() {
    if (!this.boardData) return 0;
    return (this.boardData.bottom?.length || 0) + 
           (this.boardData.left?.length || 0) + 
           (this.boardData.top?.length || 0) + 
           (this.boardData.right?.length || 0);
  }

  //Calcular posición en el grid según el ID de la casilla
  getGridPosition(squareId) {
    // Bottom: ids 0-9, fila 11, columnas 11 a 2 (derecha a izquierda)
    if (squareId >= 0 && squareId <= 9) {
      return {
        column: 11 - squareId,
        row: 11
      };
    }
    // Left: ids 10-20, columna 1, filas 11 a 1 (abajo a arriba)
    if (squareId >= 10 && squareId <= 20) {
      return {
        column: 1,
        row: 11 - (squareId - 10)
      };
    }
    // Top: ids 21-30, fila 1, columnas 2 a 11 (izquierda a derecha)
    if (squareId >= 21 && squareId <= 30) {
      return {
        column: 2 + (squareId - 21),
        row: 1
      };
    }
    // Right: ids 31-39, columna 11, filas 2 a 10 (arriba a abajo)
    if (squareId >= 31 && squareId <= 39) {
      return {
        column: 11,
        row: 2 + (squareId - 31)
      };
    }
    
    return { column: 1, row: 1 };
  }

  //Renderizar el tablero completo
  render() {
    const boardContainer = document.getElementById('monopoly-board');
    if (!boardContainer) {
      console.error('No se encontró el contenedor del tablero');
      return;
    }

    boardContainer.innerHTML = '';
    boardContainer.className = 'board-container';

    // Crear estructura del tablero
    const board = document.createElement('div');
    board.className = 'board';

    // Renderizar cada lado del tablero
    board.appendChild(this.renderSide('top', this.boardData.top));
    board.appendChild(this.renderSide('right', this.boardData.right));
    board.appendChild(this.renderSide('bottom', this.boardData.bottom));
    board.appendChild(this.renderSide('left', this.boardData.left));

    // Agregar centro del tablero
    board.appendChild(this.renderCenter());

    boardContainer.appendChild(board);

    // Renderizar panel de información de jugadores
    this.renderPlayersPanel();
  }

  //Renderizar un lado del tablero
  renderSide(side, squares) {
    const sideContainer = document.createElement('div');
    sideContainer.className = `board-side board-${side}`;

    squares.forEach(square => {
      const squareElement = this.createSquareElement(square);
      sideContainer.appendChild(squareElement);
    });

    return sideContainer;
  }

  //Crear elemento de casilla individual
  createSquareElement(square) {
    const squareDiv = document.createElement('div');
    squareDiv.className = 'square';
    squareDiv.dataset.squareId = square.id;
    squareDiv.dataset.squareType = square.type;
    
    // Aplicar posicionamiento grid dinámicamente
    // 1. Obtiene la posición donde debe ir el cuadrado
    const position = this.getGridPosition(square.id);
    // 2. Coloca el elemento en una columna específica
    squareDiv.style.gridColumn = position.column;
    // 3. Coloca el elemento en una fila específica
    squareDiv.style.gridRow = position.row;


    // Agregar contenido según el tipo de casilla
    switch (square.type) {
      case 'property':
        squareDiv.innerHTML = this.renderPropertySquare(square);
        break;
      case 'railroad':
        squareDiv.innerHTML = this.renderRailroadSquare(square);
        break;
      case 'special':
        squareDiv.innerHTML = this.renderSpecialSquare(square);
        break;
      case 'tax':
        squareDiv.innerHTML = this.renderTaxSquare(square);
        break;
      case 'community_chest':
        squareDiv.innerHTML = this.renderCommunityChestSquare(square);
        break;
      case 'chance':
        squareDiv.innerHTML = this.renderChanceSquare(square);
        break;
      default:
        squareDiv.innerHTML = `<div class="square-name">${square.name}</div>`;
    }

    // Agregar área para fichas de jugadores
    const tokensArea = document.createElement('div');
    tokensArea.className = 'tokens-area';
    squareDiv.appendChild(tokensArea);

    return squareDiv;
  }

  //Renderizar casilla de propiedad
  renderPropertySquare(square) {
    const owner = this.getPropertyOwner(square.id);
    const status = owner ? owner.color_hex : '#fff';
    const statusText = owner ? `Jugador: ${owner.nick_name}` : 'Disponible';

    return `
      <div class="square-color-bar" style="background-color: ${this.getColorHex(square.color)}"></div>
      <div class="square-status" style="background-color: ${status}; color: ${owner ? '#fff' : '#666'}">
        ${statusText}
      </div>
      <div class="square-content">
        <div class="square-name">${square.name}</div>
        <div class="square-price">$${square.price}</div>
        ${this.renderBuildingsInfo(square.id)}
      </div>
    `;
  }

  //Renderizar información de construcciones
  renderBuildingsInfo(squareId) {
    const property = this.players.flatMap(p => p.properties || [])
      .find(prop => prop.id === squareId);
    
    if (!property || (!property.houses && !property.hotel)) {
      return '';
    }

    if (property.hotel) {
      return '<div class="buildings">🏨 Hotel</div>';
    }

    if (property.houses > 0) {
      const houses = '🏠'.repeat(property.houses);
      return `<div class="buildings">${houses}</div>`;
    }

    return '';
  }

  //Renderizar casilla de ferrocarril
  renderRailroadSquare(square) {
    const owner = this.getPropertyOwner(square.id);
    const status = owner ? owner.color_hex : '#fff';
    const statusText = owner ? `Jugador: ${owner.nick_name}` : 'Disponible';

    return `
      <div class="square-status" style="background-color: ${status}; color: ${owner ? '#fff' : '#666'}">
        ${statusText}
      </div>
      <div class="square-content">
        <div class="square-icon-small">🚂</div>
        <div class="square-name">${square.name}</div>
        <div class="square-price">$${square.price}</div>
      </div>
    `;
  }

  //Renderizar casilla especial
  renderSpecialSquare(square) {
    let icon = '';
    switch (square.id) {
      case 0: icon = '▶️'; break;  // Salida
      case 10: icon = '👮'; break; // Cárcel
      case 20: icon = '🅿️'; break; // Parqueo
      case 30: icon = '🚔'; break; // Ve a la cárcel
    }

    return `
      <div class="square-content special">
        <div class="square-icon">${icon}</div>
        <div class="square-name">${square.name}</div>
      </div>
    `;
  }

  //Renderizar casilla de impuestos
  renderTaxSquare(square) {
    return `
      <div class="square-content">
        <div class="square-icon-small">💰</div>
        <div class="square-name">${square.name}</div>
        <div class="square-price">${square.action.money < 0 ? 'Paga' : 'Recibe'} $${Math.abs(square.action.money)}</div>
      </div>
    `;
  }

  //Renderizar casilla de Caja de Comunidad
  renderCommunityChestSquare(square) {
    return `
      <div class="square-content">
        <div class="square-icon">📦</div>
        <div class="square-name">${square.name}</div>
      </div>
    `;
  }

  //Renderizar casilla de Sorpresa
  renderChanceSquare(square) {
    return `
      <div class="square-content">
        <div class="square-icon">❓</div>
        <div class="square-name">${square.name}</div>
      </div>
    `;
  }

  //Renderizar centro del tablero
  renderCenter() {
    const center = document.createElement('div');
    center.className = 'board-center';
    center.innerHTML = `
      <h2>MONOPOLY</h2>
      <div id="game-log" class="game-log"></div>
      <div id="dice-area" class="dice-area">
        <button id="rollDiceBtn" class="btn btn-primary">🎲 Lanzar dados</button>
        <div class="mt-2">
          <input type="number" id="manualDiceInput" class="form-control form-control-sm" 
                 placeholder="Ingresa valor (1-12)" min="1" max="12" style="width: 165px; margin: 5px auto;">
        </div>
        <div id="diceResult"></div>
      </div>
    `;
    return center;
  }

  // Renderizar panel de información de jugadores
  renderPlayersPanel() {
    const panel = document.getElementById('players-panel');
    if (!panel) return;

    panel.innerHTML = '<h3>Jugadores</h3>';
    
    this.players.forEach((player, index) => {
      const isCurrentPlayer = index === this.currentPlayerIndex;

      // bandera del país (usa el country_code que guardas al crear jugadores)
    const code = (player.country_code || '').toUpperCase();
    const flagUrl = code ?  `https://flagsapi.com/${code}/flat/24.png ` : null;

    // lista de propiedades
    const props = (player.properties || []);
    const propsList = props.length
      ? `<ul class="player-props">${props.map(p => `<li>${p.name}</li>`).join('')}</ul>`
      :  `<ul class="player-props"><li><em>Sin propiedades</em></li></ul> `;

        //identificar que el jugador esta en la carcel
      const jailBadge = player.in_jail 
        ? `<span class="badge bg-danger ms-2">🚔 En cárcel (${player.jail_turns}/3)</span>`
        : '';
      

      const playerDiv = document.createElement('div');
      playerDiv.className = `player-info ${isCurrentPlayer ? 'current-player' : ''}`;

    
      playerDiv.innerHTML = `
        <div class="player-token" style="background-color: ${player.color_hex}"></div>
        <div class="player-details">
          <strong>
          ${player.nick_name}
          ${flagUrl ? `<img class="player-flag" src="${flagUrl}" alt="${code}">` : ''}
          </strong>

          ${jailBadge}
          <div>Dinero: $${player.money}</div>
         <div>Propiedades: ${props.length}</div>
        ${propsList}
        </div>
      `;
      panel.appendChild(playerDiv);
    });
  }

  // Inicializar controles del juego
  initializeGameControls() {
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => this.rollDice());
    }
  }

  //Lanzar dados
  rollDice() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    
    // Si está en cárcel, mostrar opciones primero
    if (currentPlayer.in_jail) {
      this.showJailOptions();
      return;
  }

    let dice1, dice2, total;
    const manualInput = document.getElementById('manualDiceInput');
    
    // Verificar si hay un valor manual ingresado
    if (manualInput && manualInput.value) {
      total = parseInt(manualInput.value);
      
      // Validar que esté en el rango correcto
      if (total < 1 || total > 12) {
        alert('⚠ El valor debe estar entre 1 y 12');
        return;
      }
      
      // Simular dos dados que sumen el total (para visualización)
      dice1 = Math.floor(total / 2);
      dice2 = total - dice1;
      
      // Limpiar el input después de usar
      manualInput.value = '';
    } else {
      // Lanzamiento aleatorio normal
      dice1 = Math.floor(Math.random() * 6) + 1;
      dice2 = Math.floor(Math.random() * 6) + 1;
      total = dice1 + dice2;
    }

    const isDoubles = dice1 === dice2;

    const diceResult = document.getElementById('diceResult');
    if (diceResult) {
      diceResult.innerHTML = `
        <div class="dice-display">
          <span class="die">${dice1}</span>
          <span class="die">${dice2}</span>
          <span class="total">Total: ${total}</span>
          ${isDoubles ? '<span class="doubles-badge">¡PARES!</span>' : ''}
        </div>
      `;
    }

    this.addToLog(`${currentPlayer.nick_name} sacó ${total}${isDoubles ? ' (pares)' : ''}`);
    
    if (isDoubles) {
      currentPlayer.doubles_count++;
      
      // Si saca 3 pares consecutivos, va a la cárcel
      if (currentPlayer.doubles_count >= 3) {
        this.addToLog(`${currentPlayer.nick_name} sacó 3 pares consecutivos!`);
        this.sendToJail(this.currentPlayerIndex);
        return;
      }
      
      this.movePlayer(this.currentPlayerIndex, total, true);
    } else {
      currentPlayer.doubles_count = 0;
      this.movePlayer(this.currentPlayerIndex, total, false);
    }
  }

  // OPCIONES DE CÁRCEL
  showJailOptions() {
    const player = this.players[this.currentPlayerIndex];
    const diceArea = document.getElementById('dice-area');
    
    if (!diceArea) return;
    
    let optionsHTML = `
      <div class="jail-options">
        <h5>🚔 Estás en la Cárcel</h5>
        <p>Intento ${player.jail_turns + 1} de 3</p>
        <div class="d-grid gap-2">
    `;
    
    if (player.money >= 50) {
      optionsHTML += `
        <button class="btn btn-warning btn-sm" onclick="monopolyBoard.payToLeaveJail()">
          💰 Pagar $50 y salir
        </button>
      `;
    } else {
      optionsHTML += `
        <button class="btn btn-warning btn-sm" disabled>
          💰 Pagar $50 (No tienes dinero)
        </button>
      `;
    }
    
    // Opción 2: Intentar sacar pares 
    optionsHTML += `
      <button class="btn btn-primary btn-sm" onclick="monopolyBoard.tryRollDoublesInJail()">
        🎲 Intentar sacar pares
      </button>
      `;
  
  optionsHTML += `
      </div>
      <small class="text-muted mt-2 d-block">
        Si sacas pares, sales automáticamente. Si no, pierdes el turno.
      </small>
      </div>
      `;
    
    diceArea.innerHTML = optionsHTML;
  }

  payToLeaveJail() {
    const player = this.players[this.currentPlayerIndex];
    
    if (player.money < 50) {
      alert('⚠ No tienes suficiente dinero para pagar.');
      return;
    }
    
    player.money -= 50;
    player.in_jail = false;
    player.jail_turns = 0;
    
    this.addToLog(`${player.nick_name} pagó $50 y salió de la cárcel`);
    this.renderPlayersPanel();
    this.restoreDiceButton();
    
    alert('✅ Saliste de la cárcel. Ahora puedes tirar los dados.');
  }

  tryRollDoublesInJail() {
    const player = this.players[this.currentPlayerIndex];
    
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    const isDoubles = dice1 === dice2;
    
    const diceResult = document.getElementById('diceResult');
    if (diceResult) {
      diceResult.innerHTML = `
        <div class="dice-display">
          <span class="die">${dice1}</span>
          <span class="die">${dice2}</span>
          <span class="total">Total: ${total}</span>
          ${isDoubles ? '<span class="doubles-badge">¡PARES!</span>' : ''}
        </div>
      `;
    }
    
    this.addToLog(`${player.nick_name} sacó ${total}${isDoubles ? ' (pares)' : ''}`);
    this.handleJailDiceRoll(dice1, dice2, total, isDoubles);
    
    setTimeout(() => this.restoreDiceButton(), 1000);
  }

  handleJailDiceRoll(dice1, dice2, total, isDoubles) {
    const player = this.players[this.currentPlayerIndex];
    
    if (isDoubles) {
      this.addToLog(`${player.nick_name} sacó pares y sale de la cárcel!`);
      player.in_jail = false;
      player.jail_turns = 0;
      player.doubles_count = 0;
      this.movePlayer(this.currentPlayerIndex, total, false);
    } else {
      player.jail_turns++;
      
      if (player.jail_turns >= 3) {
        this.addToLog(`${player.nick_name} falló el tercer intento. Debe pagar $50.`);
        
        if (player.money >= 50) {
          player.money -= 50;
          player.in_jail = false;
          player.jail_turns = 0;
          this.addToLog(`${player.nick_name} pagó $50 y sale de la cárcel`);
          this.movePlayer(this.currentPlayerIndex, total, false);
        } else {
          this.addToLog(`${player.nick_name} no tiene $50 para pagar!`);
          alert(`⚠ ${player.nick_name} está en bancarrota y debe hipotecar propiedades o declararse en quiebra.`);
          this.nextPlayer();
        }
      } else {
        this.addToLog(`${player.nick_name} no sacó pares. Sigue en la cárcel (intento ${player.jail_turns}/3)`);
        this.renderPlayersPanel();
        this.nextPlayer();
      }
    }
  }

  restoreDiceButton() {
    const diceArea = document.getElementById('dice-area');
    if (!diceArea) return;
    
    diceArea.innerHTML = `
      <button id="rollDiceBtn" class="btn btn-primary">🎲 Lanzar dados</button>
      <div class="mt-2">
        <input type="number" id="manualDiceInput" class="form-control form-control-sm" 
               placeholder="Ingresa valor (1-12)" min="1" max="12" style="width: 165px; margin: 5px auto;">
      </div>
      <div id="diceResult"></div>
    `;
    
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => this.rollDice());
    }
  }

  // ENVIAR A LA CÁRCEL
  sendToJail(playerIndex) {
    const player = this.players[playerIndex];
    
    player.position = 10;
    player.in_jail = true;
    player.jail_turns = 0;
    player.doubles_count = 0;
    
    this.addToLog(`${player.nick_name} fue enviado a la CÁRCEL 🚔`);
    
    this.updatePlayerTokens();
    this.renderPlayersPanel();
    localStorage.setItem('monopoly_players', JSON.stringify(this.players));
    
    this.nextPlayer();
  }

  //Mover jugador
  async movePlayer(playerIndex, steps, hasExtraTurn = false) {
    const player = this.players[playerIndex];
    const oldPosition = player.position;
    player.position = (player.position + steps) % this.getTotalSquares();

    // Si pasó por la salida
    if (player.position < oldPosition) {
      player.money += 200;
      this.addToLog(`${player.nick_name} pasó por la Salida y recibió $200`);
    }

    // Actualizar visualización
    this.updatePlayerTokens();
    this.renderPlayersPanel();

    // Procesar la casilla actual
    await this.processSquare(playerIndex);

    if (hasExtraTurn) {
      this.currentPlayerIndex = playerIndex;
      this.addToLog(`${player.nick_name} tiene un turno extra por sacar pares!`);
      this.renderPlayersPanel();
    }

    // Guardar estado
    localStorage.setItem('monopoly_players', JSON.stringify(this.players));
  }

  //Actualizar posición visual de las fichas
  updatePlayerTokens() {
    // Limpiar todas las áreas de tokens
    document.querySelectorAll('.tokens-area').forEach(area => area.innerHTML = '');

    // Colocar fichas en sus posiciones
    this.players.forEach(player => {
      const square = document.querySelector(`[data-square-id="${player.position}"]`);
      if (square) {
        const tokensArea = square.querySelector('.tokens-area');
        if (tokensArea) {
          const token = document.createElement('div');
          token.className = 'player-token';
          token.style.backgroundColor = player.color_hex;
          token.title = player.nick_name;
          tokensArea.appendChild(token);
        }
      }
    });
  }

  //Procesar la casilla donde cayó el jugador
  //Esta función coordina todas las acciones y SIEMPRE cambia de turno al final
 async  processSquare(playerIndex) {
    const player = this.players[playerIndex];
    const squareId = player.position;
    
    // Buscar la casilla en todas las secciones del tablero
    let square = null;
    for (const side of ['bottom', 'left', 'top', 'right']) {
      square = this.boardData[side]?.find(s => s.id === squareId);
      if (square) break;
    }

    if (!square) {this.nextPlayer()
      return
    };

    this.addToLog(`${player.nick_name} cayó en ${square.name}`);

    // Verificar si cayó en "Ve a la cárcel"
    if (square.id === 30) {
      this.addToLog(`${player.nick_name} debe ir a la cárcel!`);
      this.sendToJail(playerIndex);
      return;
    }

    // Procesar según el tipo de casilla
    switch (square.type) {
      case 'property':
      case 'railroad':
        await this.handlePropertySquare(playerIndex, square);
        break;
      case 'tax':
        this.handleTaxSquare(playerIndex, square);
        break;
      case 'community_chest':
        this.handleCommunityChest(playerIndex);
        break;
      case 'chance':
        await this.handleChance(playerIndex);
        break;
      default:
      //Para casillas especiales sin acciones especiales, solo pasa de turno      
    }

    // Cambiar al siguiente jugador
    this.nextPlayer();
  }

  //Manejar casilla de propiedad
  async handlePropertySquare(playerIndex, square) {
    const owner = this.getPropertyOwner(square.id);
    const player = this.players[playerIndex];

    if (!owner) {
      // Propiedad disponible - dar tiempo para ver la UI antes del confirm
    this.renderPlayersPanel();
    
    // Esperar un momento para que el usuario vea los dados y logs
    await new Promise(resolve => setTimeout(resolve, 300));

      // Propiedad disponible
     const buy = confirm(`¿Quieres comprar ${square.name} por ${square.price}?`);
      if (buy) {
        if (player.money >= square.price) {
          player.money -= square.price;
          player.properties = player.properties || [];
          player.properties.push({
            id: square.id,
            name: square.name,
            houses: 0,
            hotel: false
          });
          this.addToLog(`${player.nick_name} compró ${square.name}`);
          this.render(); // Actualizar el tablero para mostrar el nuevo dueño
          this.initializeGameControls(); // Re-inicializar los controles después de render
        } else {
          this.addToLog(`${player.nick_name} no tiene suficiente dinero`);
        }
      } else {
        this.addToLog(`${player.nick_name} no compró ${square.name}`);
      }
       this.renderPlayersPanel();

    } else if (owner.nick_name !== player.nick_name) {
      // Pagar renta al dueño
      const rent = square.rent?.base || 0;
      player.money -= rent;
      owner.money += rent;
      this.addToLog(`${player.nick_name} pagó ${rent} de renta a ${owner.nick_name}`);
       this.renderPlayersPanel();
    } else {
      // Es del jugador actual - por ahora solo informar
      this.addToLog(`${player.nick_name} cayó en su propia propiedad`);
      this.renderPlayersPanel();
    }
  }

  //Manejar casilla de impuesto
  handleTaxSquare(playerIndex, square) {
    const player = this.players[playerIndex];
    player.money += square.action.money;
    this.addToLog(`${player.nick_name} ${square.action.money < 0 ? 'pagó' : 'recibió'} $${Math.abs(square.action.money)}`);
    this.renderPlayersPanel();
  }

  //Manejar Caja de Comunidad
  async handleCommunityChest(playerIndex) {
    const card = await MonopolyAPI.getCommunityChestCard();
    const player = this.players[playerIndex];
    this.addToLog(`Caja de Comunidad: ${card.description}`);

    // Solo procesar dinero (elbackend solo maneja este caso para la carcel)
  if (card.action && card.action.money) {
    player.money += card.action.money;
  }

    this.renderPlayersPanel();
  }

  //Manejar Sorpresa
  async handleChance(playerIndex) {
    const card = await MonopolyAPI.getChanceCard();
    const player = this.players[playerIndex];
    this.addToLog(`Sorpresa: ${card.description}`);

    if (card.action && card.action.money) {
    player.money += card.action.money;
  }

    this.renderPlayersPanel();
  }

  //Obtener dueño de una propiedad
  getPropertyOwner(squareId) {
    for (const player of this.players) {
      if (player.properties?.some(prop => prop.id === squareId)) {
        return player;
      }
    }
    return null;
  }

  //Cambiar al siguiente jugador
  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.renderPlayersPanel();

    // Guardar estado después de cambiar de jugador
    localStorage.setItem('monopoly_players', JSON.stringify(this.players));
  }

  //Agregar mensaje al log
  addToLog(message) {
    const log = document.getElementById('game-log');
    if (log) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = `• ${message}`;
      log.insertBefore(entry, log.firstChild);
      
      // Mantener solo los últimos 3 mensajes
      while (log.children.length > 3) {
        log.removeChild(log.lastChild);
      }
    }
  }

  //Obtener color de una propiedad
  getColorHex(color) {
    const colors = {
      brown: '#8B4513',
      purple: '#9370DB',
      pink: '#FF69B4',
      orange: '#FFA500',
      red: '#FF0000',
      yellow: '#FFD700',
      green: '#008000',
      blue: '#0000FF'
    };
    return colors[color] || '#cccccc';
  }
}

// Inicializar el tablero cuando se cargue la página del juego
if (document.getElementById('monopoly-board')) {
  const board = new MonopolyBoard();
  board.initialize();
  
  // Hacer disponible globalmente para debugging
  window.monopolyBoard = board;
}