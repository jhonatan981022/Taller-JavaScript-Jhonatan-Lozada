const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 20;

let allPokemon = [];       // Lista completa de Pokémon con detalles
let filteredPokemon = [];  // Lista filtrada según filtros actuales
let currentPage = 1;

// Referencias DOM
const pokemonGrid = document.getElementById('pokemonGrid');
const loading = document.getElementById('loading');
const totalCount = document.getElementById('totalCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const pokemonModal = document.getElementById('pokemonModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

const searchInput = document.getElementById('search');
const typeFiltersDiv = document.getElementById('typeFilters');
const generationSelect = document.getElementById('generationSelect');
const sortSelect = document.getElementById('sortSelect');
const resetFiltersBtn = document.getElementById('resetFilters');

// Tipos y Generaciones disponibles (para filtros)
const POKEMON_TYPES = [
  'normal','fire','water','electric','grass','ice','fighting','poison','ground',
  'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
];

const GENERATIONS = [
  { id: 1, name: 'Generación 1', url: `${API_BASE_URL}/generation/1` },
  { id: 2, name: 'Generación 2', url: `${API_BASE_URL}/generation/2` },
  { id: 3, name: 'Generación 3', url: `${API_BASE_URL}/generation/3` },
  { id: 4, name: 'Generación 4', url: `${API_BASE_URL}/generation/4` },
  { id: 5, name: 'Generación 5', url: `${API_BASE_URL}/generation/5` },
  { id: 6, name: 'Generación 6', url: `${API_BASE_URL}/generation/6` },
  { id: 7, name: 'Generación 7', url: `${API_BASE_URL}/generation/7` },
  { id: 8, name: 'Generación 8', url: `${API_BASE_URL}/generation/8` },
];

// Estado filtros
let selectedTypes = new Set();
let selectedGeneration = '';
let searchTerm = '';
let sortBy = 'id';

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllPokemon();
  setupFilters();
  applyFilters();
  setupEventListeners();
});

// --- Carga todos los Pokémon con detalles (hasta 898 para no sobrecargar) ---
async function loadAllPokemon() {
  showLoading(true);
  try {
    const limit = 898; // Puedes ajustar a la cantidad que quieras
    const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}`);
    const data = await response.json();

    // Cargar detalles para cada uno (con batches para no saturar)
    allPokemon = [];

    // Lo hacemos por batchs para no saturar el servidor
    const batchSize = 50;
    for (let i = 0; i < data.results.length; i += batchSize) {
      const batch = data.results.slice(i, i + batchSize);
      const batchDetails = await Promise.all(batch.map(p => fetchPokemonDetails(p.url)));
      allPokemon.push(...batchDetails.filter(p => p != null));
      updateLoadingText(`Cargando Pokémon... (${allPokemon.length}/${limit})`);
    }
  } catch (e) {
    alert('Error cargando Pokémon: ' + e.message);
  } finally {
    showLoading(false);
  }
}

// --- Obtener detalles Pokémon ---
async function fetchPokemonDetails(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error('Error fetching Pokémon details:', e);
    return null;
  }
}

// --- Setup filtros en UI ---
function setupFilters() {
  // Tipos
  POKEMON_TYPES.forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = capitalize(type);
    btn.className = `px-3 py-1 rounded text-white text-xs font-semibold ${getTypeColor(type)} hover:opacity-80`;
    btn.dataset.type = type;
    btn.addEventListener('click', () => {
      if (selectedTypes.has(type)) {
        selectedTypes.delete(type);
        btn.classList.remove('ring', 'ring-4', 'ring-offset-2', 'ring-blue-400');
      } else {
        selectedTypes.add(type);
        btn.classList.add('ring', 'ring-4', 'ring-offset-2', 'ring-blue-400');
      }
      currentPage = 1;
      applyFilters();
    });
    typeFiltersDiv.appendChild(btn);
  });

  // Generaciones
  GENERATIONS.forEach(gen => {
    const option = document.createElement('option');
    option.value = gen.id;
    option.textContent = gen.name;
    generationSelect.appendChild(option);
  });
}

// --- Aplicar filtros y ordenar ---
function applyFilters() {
  // Filtrar por nombre
  searchTerm = searchInput.value.trim().toLowerCase();

  filteredPokemon = allPokemon.filter(p => {
    // Nombre
    const nameMatch = p.name.toLowerCase().includes(searchTerm);

    // Tipos (si hay)
    const typeMatch = selectedTypes.size === 0 || p.types.some(t => selectedTypes.has(t.type.name));

    // Generación
    let genMatch = true;
    if (selectedGeneration) {
      genMatch = generationMatch(p.id, parseInt(selectedGeneration));
    }

    return nameMatch && typeMatch && genMatch;
  });

  // Ordenar
  filteredPokemon.sort((a, b) => {
    switch(sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'height': return a.height - b.height;
      case 'weight': return a.weight - b.weight;
      default: return a.id - b.id;
    }
  });

  updatePagination();
  renderCurrentPage();
}

// --- Comprobar si Pokémon pertenece a generación ---
function generationMatch(pokemonId, generationId) {
  const genRanges = {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    4: [387, 493],
    5: [494, 649],
    6: [650, 721],
    7: [722, 809],
    8: [810, 898],
  };
  const [start, end] = genRanges[generationId] || [1, 898];
  return pokemonId >= start && pokemonId <= end;
}

// --- Actualizar info paginación ---
function updatePagination() {
  const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
  pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  totalCount.textContent = filteredPokemon.length;
}

// --- Renderizar página actual ---
function renderCurrentPage() {
  pokemonGrid.innerHTML = '';
  if (filteredPokemon.length === 0) {
    pokemonGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No se encontraron Pokémon.</p>`;
    return;
  }

  const startIndex = (currentPage - 1) * POKEMON_PER_PAGE;
  const pagePokemon = filteredPokemon.slice(startIndex, startIndex + POKEMON_PER_PAGE);

  pagePokemon.forEach(pokemon => {
    const card = createPokemonCard(pokemon);
    pokemonGrid.appendChild(card);
  });
}

// --- Crear tarjeta Pokémon ---
function createPokemonCard(pokemon) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded shadow p-4 flex flex-col items-center text-center';

  card.innerHTML = `
    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-24 h-24 mb-2" />
    <h3 class="text-lg font-bold capitalize mb-1">#${pokemon.id} ${pokemon.name}</h3>
    <div class="flex justify-center gap-1 mb-2 flex-wrap">
      ${pokemon.types.map(t => `<span class="text-white text-xs px-2 py-1 rounded-full ${getTypeColor(t.type.name)}">${capitalize(t.type.name)}</span>`).join('')}
    </div>
    <button class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-id="${pokemon.id}">
      Ver Detalle
    </button>
  `;

  // Evento botón detalle
  const btn = card.querySelector('button');
  btn.addEventListener('click', () => showPokemonDetails(pokemon));

  return card;
}

// --- Mostrar modal con detalles ---
function showPokemonDetails(pokemon) {
  modalTitle.textContent = `#${pokemon.id} ${capitalize(pokemon.name)}`;
  modalContent.innerHTML = `
    <div class="text-center mb-4">
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-32 h-32 mx-auto" />
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
      <div><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</div>
      <div><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</div>
      <div><strong>Experiencia base:</strong> ${pokemon.base_experience}</div>
      <div><strong>Tipos:</strong> ${pokemon.types.map(t => capitalize(t.type.name)).join(', ')}</div>
    </div>
    <div>
      <strong>Habilidades:</strong>
      <ul class="list-disc list-inside text-sm mt-1">
        ${pokemon.abilities.map(a => `<li>${capitalize(a.ability.name)}</li>`).join('')}
      </ul>
    </div>
  `;
  pokemonModal.classList.remove('hidden');
}

// --- Cerrar modal ---
closeModal.addEventListener('click', () => {
  pokemonModal.classList.add('hidden');
});

// Cerrar modal si clic afuera del contenido
pokemonModal.addEventListener('click', e => {
  if (e.target === pokemonModal) {
    pokemonModal.classList.add('hidden');
  }
});

// --- Eventos UI ---
function setupEventListeners() {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
      updatePagination();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
      updatePagination();
    }
  });

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    applyFilters();
  });

  generationSelect.addEventListener('change', () => {
    selectedGeneration = generationSelect.value;
    currentPage = 1;
    applyFilters();
  });

  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value;
    currentPage = 1;
    applyFilters();
  });

  resetFiltersBtn.addEventListener('click', () => {
    // Limpiar filtros UI y estado
    searchInput.value = '';
    selectedTypes.clear();
    selectedGeneration = '';
    generationSelect.value = '';
    sortSelect.value = 'id';
    sortBy = 'id';

    // Quitar clases a botones de tipos
    typeFiltersDiv.querySelectorAll('button').forEach(btn => {
      btn.classList.remove('ring', 'ring-4', 'ring-offset-2', 'ring-blue-400');
    });

    currentPage = 1;
    applyFilters();
  });
}

// --- Helper: mostrar loading ---
function showLoading(show) {
  loading.classList.toggle('hidden', !show);
}

// --- Helper: actualizar texto loading ---
function updateLoadingText(text) {
  loading.querySelector('p').textContent = text;
}

// --- Helper: capitalizar string ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Helper: clase Tailwind para color por tipo ---
function getTypeColor(type) {
  // Colores para tipos (Tailwind o personalizados)
  const colors = {
    normal: 'bg-gray-400',
    fire: 'bg-red-500',
    water: 'bg-blue-500',
    electric: 'bg-yellow-400',
    grass: 'bg-green-500',
    ice: 'bg-blue-200',
    fighting: 'bg-red-700',
    poison: 'bg-purple-600',
    ground: 'bg-yellow-600',
    flying: 'bg-indigo-300',
    psychic: 'bg-pink-500',
    bug: 'bg-green-700',
    rock: 'bg-gray-600',
    ghost: 'bg-indigo-700',
    dragon: 'bg-purple-800',
    dark: 'bg-gray-800',
    steel: 'bg-gray-500',
    fairy: 'bg-pink-300',
  };
  return colors[type] || 'bg-gray-400';
}
