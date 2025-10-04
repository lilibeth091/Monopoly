// Módulo para centralizar todas las llamadas al backend
const MonopolyAPI = {
  // URL base del backend Flask
  BASE_URL: 'http://127.0.0.1:5000',

  //Función helper para hacer requests con manejo de errores
  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  /*Obtener lista de países
   GET /countries*/
  async getCountries() {
    return this.request('/countries');
  },

  /*Obtener estructura del tablero
   GET /board*/
  async getBoard() {
    return this.request('/board');
  },

  /*Obtener ranking de jugadores
  GET /ranking*/
  async getRanking() {
    return this.request('/ranking');
  },

  /*Guardar puntaje de un jugador
   * POST /score-recorder
   * @param {string} nickName - Nickname del jugador
   * @param {number} score - Puntaje obtenido
   * @param {string} countryCode - Código del país (ej: "co")
   */
  async saveScore(nickName, score, countryCode) {
    return this.request('/score-recorder', {
      method: 'POST',
      body: JSON.stringify({
        nick_name: nickName,
        score: score,
        country_code: countryCode
      })
    });
  },

  //Obtener una carta aleatoria de Caja de Comunidad
  async getCommunityChestCard() {
    const board = await this.getBoard();
    const cards = board.community_chest;
    return cards[Math.floor(Math.random() * cards.length)];
  },

  //Obtener una carta aleatoria de Sorpresa
  async getChanceCard() {
    const board = await this.getBoard();
    const cards = board.chance;
    return cards[Math.floor(Math.random() * cards.length)];
  }
};

// Hacer disponible globalmente
window.MonopolyAPI = MonopolyAPI;