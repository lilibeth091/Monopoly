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
    const position = this.getGridPosition(square.id);
    squareDiv.style.gridColumn = position.column;
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
        <div class="square-icon-medium">💰</div>
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
      const playerDiv = document.createElement('div');
      playerDiv.className = `player-info ${isCurrentPlayer ? 'current-player' : ''}`;
      playerDiv.innerHTML = `
        <div class="player-token" style="background-color: ${player.color_hex}"></div>
        <div class="player-details">
          <strong>${player.nick_name}</strong>
          <div>Dinero: $${player.money}</div>
          <div>Propiedades: ${player.properties?.length || 0}</div>
        </div>
      `;
      panel.appendChild(playerDiv);
    });
  }

  /**
   * Inicializar controles del juego
   */
  initializeGameControls() {
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => this.rollDice());
    }
  }

  /**
   * Lanzar dados
   */
  rollDice() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    const diceResult = document.getElementById('diceResult');
    if (diceResult) {
      diceResult.innerHTML = `
        <div class="dice-display">
          <span class="die">${dice1}</span>
          <span class="die">${dice2}</span>
          <span class="total">Total: ${total}</span>
        </div>
      `;
    }

    // Mover el jugador actual
    this.movePlayer(this.currentPlayerIndex, total);
    
    // Agregar al log
    this.addToLog(`${this.players[this.currentPlayerIndex].nick_name} sacó ${total}`);
  }

  /**
   * Mover jugador
   */
  movePlayer(playerIndex, steps) {
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
    this.processSquare(playerIndex);

    // Guardar estado
    localStorage.setItem('monopoly_players', JSON.stringify(this.players));
  }

  /**
   * Actualizar posición visual de las fichas
   */
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

  /**
   * Procesar la casilla donde cayó el jugador
   */
  processSquare(playerIndex) {
    const player = this.players[playerIndex];
    const squareId = player.position;
    
    // Buscar la casilla en todas las secciones del tablero
    let square = null;
    for (const side of ['bottom', 'left', 'top', 'right']) {
      square = this.boardData[side]?.find(s => s.id === squareId);
      if (square) break;
    }

    if (!square) return;

    this.addToLog(`${player.nick_name} cayó en ${square.name}`);

    // Procesar según el tipo de casilla
    switch (square.type) {
      case 'property':
      case 'railroad':
        this.handlePropertySquare(playerIndex, square);
        break;
      case 'tax':
        this.handleTaxSquare(playerIndex, square);
        break;
      case 'community_chest':
        this.handleCommunityChest(playerIndex);
        break;
      case 'chance':
        this.handleChance(playerIndex);
        break;
    }

    // Cambiar al siguiente jugador
    this.nextPlayer();
  }

  /**
   * Manejar casilla de propiedad
   */
  handlePropertySquare(playerIndex, square) {
    const owner = this.getPropertyOwner(square.id);
    const player = this.players[playerIndex];

    if (!owner) {
      // Propiedad disponible
      const buy = confirm(`¿Quieres comprar ${square.name} por $${square.price}?`);
      if (buy && player.money >= square.price) {
        player.money -= square.price;
        player.properties = player.properties || [];
        player.properties.push({
          id: square.id,
          name: square.name,
          houses: 0,
          hotel: false
        });
        this.addToLog(`${player.nick_name} compró ${square.name}`);
        this.render();
      }
    } else if (owner.nick_name !== player.nick_name) {
      // Pagar renta
      const rent = square.rent?.base || 0;
      player.money -= rent;
      owner.money += rent;
      this.addToLog(`${player.nick_name} pagó $${rent} de renta a ${owner.nick_name}`);
    }

    this.renderPlayersPanel();
  }

  /**
   * Manejar casilla de impuestos
   */
  handleTaxSquare(playerIndex, square) {
    const player = this.players[playerIndex];
    player.money += square.action.money;
    this.addToLog(`${player.nick_name} ${square.action.money < 0 ? 'pagó' : 'recibió'} $${Math.abs(square.action.money)}`);
    this.renderPlayersPanel();
  }

  /**
   * Manejar Caja de Comunidad
   */
  async handleCommunityChest(playerIndex) {
    const card = await MonopolyAPI.getCommunityChestCard();
    const player = this.players[playerIndex];
    player.money += card.action.money;
    this.addToLog(`Caja de Comunidad: ${card.description}`);
    this.renderPlayersPanel();
  }

  /**
   * Manejar Sorpresa
   */
  async handleChance(playerIndex) {
    const card = await MonopolyAPI.getChanceCard();
    const player = this.players[playerIndex];
    player.money += card.action.money;
    this.addToLog(`Sorpresa: ${card.description}`);
    this.renderPlayersPanel();
  }

  /**
   * Obtener dueño de una propiedad
   */
  getPropertyOwner(squareId) {
    for (const player of this.players) {
      if (player.properties?.some(prop => prop.id === squareId)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Cambiar al siguiente jugador
   */
  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.renderPlayersPanel();
  }

  /**
   * Agregar mensaje al log
   */
  addToLog(message) {
    const log = document.getElementById('game-log');
    if (log) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = `• ${message}`;
      log.insertBefore(entry, log.firstChild);
      
      // Mantener solo los últimos 5 mensajes
      while (log.children.length > 5) {
        log.removeChild(log.lastChild);
      }
    }
  }

  /**
   * Obtener color hexadecimal de una propiedad
   */
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