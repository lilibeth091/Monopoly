// Lógica de la pantalla de juego (game.html)

// Función helper para mostrar modales personalizados
function showModal(title, body, buttons, headerClass = 'bg-primary text-white') {
  return new Promise((resolve) => {
    const modal = document.getElementById('gameModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalHeader = document.getElementById('modalHeader');

    // Configurar contenido
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modalHeader.className = `modal-header ${headerClass}`;
    
    // Ocultar el botón de cerrar (X)
    const closeBtn = modalHeader.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.style.display = 'none';
    }

    // Limpiar y agregar botones
    modalFooter.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = btn.class;
      button.textContent = btn.text;
      button.onclick = () => {
        bootstrap.Modal.getInstance(modal).hide();
        resolve(btn.value);
      };
      modalFooter.appendChild(button);
    });

    // Mostrar modal con opciones que impiden cerrarlo con ESC o click fuera
    const bsModal = new bootstrap.Modal(modal, {
      backdrop: 'static',
      keyboard: false
    });
    bsModal.show();
  });
}

// Verificar si hay datos de jugadores al cargar
window.addEventListener('DOMContentLoaded', async () => {
  const playersData = localStorage.getItem('monopoly_players');
  if (!playersData) {
    await showModal(
      'Sin datos de jugadores',
      `<div class="mb-3">
        <div class="display-1">⚠️</div>
      </div>
      <p>No se encontraron datos de jugadores.</p>
      <p class="text-muted">Serás redirigido al inicio.</p>`,
      [{ text: 'Ir al inicio', class: 'btn btn-primary', value: true }],
      'bg-warning text-dark'
    );
    window.location.href = 'index.html';
  }
});

// Terminar juego y calcular ganador
document.getElementById('btnEndGame').addEventListener('click', async () => {
  if (!window.monopolyBoard) {
    await showModal(
      '⚠️ Error',
      `<div class="mb-3">
        <div class="display-1">❌</div>
      </div>
      <p>No hay juego activo.</p>`,
      [{ text: 'Entendido', class: 'btn btn-primary', value: true }],
      'bg-danger text-white'
    );
    return;
  }
  
  const confirmed = await showModal(
    'Finalizar juego',
    `<div class="mb-3">
      <div class="display-1"></div>
    </div>
    <p class="fs-5">¿Estás seguro que quieres finalizar el juego?</p>
    <p class="text-muted">Se calculará el ganador y podrás guardar los puntajes.</p>`,
    [
      { text: 'Cancelar', class: 'btn btn-secondary', value: false },
      { text: 'Finalizar', class: 'btn btn-warning', value: true }
    ],
    'bg-warning text-dark'
  );
  
  if (!confirmed) return;
  
  const players = window.monopolyBoard.players;
  
  // Calcular patrimonio de cada jugador
  const playersWithScore = players.map(player => {
    let totalValue = player.money; // Dinero disponible
    
    // Sumar valor de propiedades
    if (player.properties) {
      player.properties.forEach(prop => {
        // Buscar la propiedad en el tablero para obtener su precio
        const square = window.monopolyBoard.getSquareById(prop.id);
        
        if (square) {
          // Si NO está hipotecada, sumar su valor base
          if (!prop.mortgaged) {
            totalValue += square.price || 0;
            
            // Sumar valor de casas (100 cada una)
            if (prop.houses) {
              totalValue += prop.houses * 100;
            }
            
            // Sumar valor de hotel (200)
            if (prop.hotel) {
              totalValue += 200;
            }
          } else {
            // Si está hipotecada, restar su valor hipotecado
            totalValue -= (square.mortgage || 0);
          }
        }
      });
    }
    
    return {
      ...player,
      finalScore: totalValue
    };
  });
  
  // Ordenar por puntaje (mayor a menor)
  playersWithScore.sort((a, b) => b.finalScore - a.finalScore);
  
  // Determinar ganador
  const winner = playersWithScore[0];
  
  // Mostrar resultados
  let resultsHTML = '<div class="text-center">';
  resultsHTML += '<h4 class="mb-4">🏆 Resultados Finales</h4>';
  resultsHTML += '<div class="table-responsive"><table class="table table-striped">';
  resultsHTML += '<thead><tr><th>Posición</th><th>Jugador</th><th>Patrimonio</th></tr></thead><tbody>';
  
  playersWithScore.forEach((player, index) => {
    const flagUrl = `https://flagsapi.com/${player.country_code.toUpperCase()}/flat/32.png`;
    const rowClass = index === 0 ? 'table-success' : '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    resultsHTML += `
      <tr class="${rowClass}">
        <td><strong>${medal} ${index + 1}</strong></td>
        <td>
          <img src="${flagUrl}" alt="${player.country_code}" class="me-2">
          ${player.nick_name}
        </td>
        <td><strong>$${player.finalScore}</strong></td>
      </tr>
    `;
  });
  
  resultsHTML += '</tbody></table></div>';
  resultsHTML += `<p class="mt-3 text-success"><strong>🎉 Ganador: ${winner.nick_name} con $${winner.finalScore}</strong></p>`;
  resultsHTML += '</div>';
  
  // Crear modal para mostrar resultados
  const modalHTML = `
    <div class="modal fade" id="resultsModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content rounded-4 shadow">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">🏁 Fin del Juego</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${resultsHTML}</div>
          <div class="modal-footer d-flex justify-content-center">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">❌ Cerrar sin guardar</button>
            <button type="button" id="btnSaveAndExit" class="btn btn-success">💾 Guardar y Salir</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const resultsModal = new bootstrap.Modal(document.getElementById('resultsModal'));
  resultsModal.show();
  
  // Guardar puntajes cuando haga clic en "Guardar y Salir"
  document.getElementById('btnSaveAndExit').addEventListener('click', async () => {
    try {
      // Guardar puntajes de todos los jugadores
      for (const player of playersWithScore) {
        await MonopolyAPI.saveScore(player.nick_name, player.finalScore, player.country_code);
      }
      
      // Limpiar y redirigir directamente
      localStorage.removeItem('monopoly_players');
      window.location.href = 'index.html';
    } catch (error) {
      // Mostrar modal de error solo si falla
      await showModal(
        '❌ Error al guardar',
        `<div class="mb-3">
          <div class="display-1">❌</div>
        </div>
        <p class="text-danger">Error al guardar puntajes:</p>
        <p class="small text-muted">${error.message}</p>
        <p class="mt-3">Por favor, verifica que el backend esté funcionando.</p>`,
        [{ text: 'Entendido', class: 'btn btn-danger', value: true }],
        'bg-danger text-white'
      );
      console.error('Error completo:', error);
    }
  });
  
  // Manejar el botón "Cerrar sin guardar"
  const closeWithoutSaveBtn = document.querySelector('#resultsModal .btn-secondary');
  closeWithoutSaveBtn.addEventListener('click', () => {
    bootstrap.Modal.getInstance(document.getElementById('resultsModal')).hide();
    localStorage.removeItem('monopoly_players');
    window.location.href = 'index.html';
  });
  
  // Limpiar modal al cerrarse
  document.getElementById('resultsModal').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
});

// Botón Volver al Inicio con confirmación
document.getElementById('btnBackToHome').addEventListener('click', async () => {
  const confirmed = await showModal(
    '⚠️ Volver al inicio',
    `<div class="mb-3">
      <div class="display-1">⚠️</div>
    </div>
    <p class="fs-5">¿Estás seguro que quieres volver al inicio?</p>
    <p class="text-danger"><strong>Se perderá el progreso no guardado de la partida actual.</strong></p>
    <p class="text-muted small mt-3">Si deseas guardar tu progreso, usa el botón "Terminar Juego" primero.</p>`,
    [
      { text: 'Cancelar', class: 'btn btn-secondary', value: false },
      { text: '🏠 Ir al inicio', class: 'btn btn-danger', value: true }
    ],
    'bg-warning text-dark'
  );
  
  if (confirmed) {
    localStorage.removeItem('monopoly_players');
    window.location.href = 'index.html';
  }
});