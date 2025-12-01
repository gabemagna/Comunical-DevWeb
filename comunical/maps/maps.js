let map;
let geocoder;
const EVENT_STORAGE_KEY = 'comunical_events';
let markers = []; 
let infoWindow;
let allEvents = [];
let currentCategoryFilter = 'todos';
let currentMonthFilter = 'todos';
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

let currentMapEvent = null; 

function initMap() {
    console.log("API do Google Maps carregada.");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("Localização do usuário obtida:", userLocation);
                createMap(userLocation);
            },
            () => {
                console.warn("Geolocalização falhou. Usando localização padrão (Campinas).");
                const defaultLocation = { lat: -22.9056, lng: -47.0608 };
                createMap(defaultLocation);
            }
        );
    } else {
        console.warn("Navegador não suporta geolocalização. Usando localização padrão (Campinas).");
        const defaultLocation = { lat: -22.9056, lng: -47.0608 };
        createMap(defaultLocation); 
    }
}


function createMap(centerLocation) {
    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error("Elemento #map não encontrado!");
        return;
    }

    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();

    map = new google.maps.Map(mapElement, {
        zoom: 12,
        center: centerLocation, 
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
        }
    });

    allEvents = getEvents();

    populateCategoryFilter();
    populateMonthFilter();

    document.getElementById('categoryFilterSelect').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        loadAndRenderMarkers();
    });

    document.getElementById('monthFilterSelect').addEventListener('change', (e) => {
        currentMonthFilter = e.target.value;
        loadAndRenderMarkers();
    });

    document.getElementById('info-box-details-btn').addEventListener('click', () => {
        if (currentMapEvent) {
            window.location.href = `../eventos/index.html?openEventId=${currentMapEvent.id}`;
        }
    });
    
    document.getElementById('info-box-route-btn').addEventListener('click', () => {
        if (currentMapEvent && currentMapEvent.location) {
            let address = currentMapEvent.location.replace('📍 ', '');
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        }
    });

    handleMapLogic();
}


function getEventIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId');
}


function getEvents() {
    const events = localStorage.getItem(EVENT_STORAGE_KEY);
    return events ? JSON.parse(events) : [];
}

function handleMapLogic() {
    const eventId = getEventIdFromURL();

    if (eventId) {
        console.log("Modo: Zoom no Evento", eventId);
        const event = allEvents.find(e => e.id === eventId);
        
        if (event) {
            console.log("Mostrando evento:", event.title);
            geocodeAndPlaceMarker(event, true); 
            showInfoPanel(event); 
        } else {
            console.error("Evento não encontrado!");
            handleGeneralMap();
        }
        
    } else {
        console.log("Modo: Mapa Geralzão");
        handleGeneralMap();
    }
}

function handleGeneralMap() {
    hideInfoPanel(); 
    loadAndRenderMarkers();
}

function showInfoPanel(event) {
    currentMapEvent = event; 

    const infoPanel = document.getElementById("event-info-box");
    const filterContainer = document.querySelector(".map-filters-container");
    
    if (filterContainer) filterContainer.style.display = "none"; 
    if (infoPanel) infoPanel.style.display = "block"; 

    document.getElementById('info-box-title').textContent = event.title;
    document.getElementById('info-box-details').textContent = `${event.date} • ${event.time || 'Dia todo'}`;
}

function hideInfoPanel() {
    currentMapEvent = null; 
    
    const infoPanel = document.getElementById("event-info-box");
    const filterContainer = document.querySelector(".map-filters-container");
    
    if (filterContainer) filterContainer.style.display = "flex"; 
    if (infoPanel) infoPanel.style.display = "none"; 


    if (map) { 
        map.setZoom(12); 
    }
}


function loadAndRenderMarkers() {
    clearMarkers();
    
    const filteredEvents = allEvents.filter(event => {
        const matchesCategory = currentCategoryFilter === 'todos' || event.category === currentCategoryFilter;
        if (!matchesCategory) return false;

        if (currentMonthFilter === 'todos') return true;
        
        const [year, month] = currentMonthFilter.split('-').map(Number);
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });

    console.log(`Renderizando ${filteredEvents.length} eventos filtrados.`);
    
    filteredEvents.forEach(event => {
        geocodeAndPlaceMarker(event, false);
    });
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilterSelect');
    select.innerHTML = '';

    const categories = {
        'todos': '📅 Todos',
        'cultural': '🎭 Cultural',
        'esportivo': '⚽ Esportivo',
        'academico': '🎓 Acadêmico',
        'profissional': '💼 Profissional',
        'saude': '🩺 Saúde',
        'social': '🎉 Social'
    };

    for (const [value, text] of Object.entries(categories)) {
        const option = new Option(text, value);
        select.add(option);
    }
}

function populateMonthFilter() {
    const select = document.getElementById('monthFilterSelect');
    select.innerHTML = ''; 

    const allOption = new Option('🗓️ Todos os Meses', 'todos');
    select.add(allOption);

    const uniqueMonths = [...new Set(allEvents.map(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return `${eventDate.getFullYear()}-${eventDate.getMonth()}`;
    }))];

    uniqueMonths.sort((a, b) => new Date(a) - new Date(b));

    uniqueMonths.forEach(monthYear => {
        const [year, month] = monthYear.split('-').map(Number);
        const date = new Date(year, month);
        
        const optionText = `${monthNames[month]} ${year.toString().slice(-2)}`;
        const option = new Option(optionText, monthYear);
        select.add(option);
    });
}

function geocodeAndPlaceMarker(event, isSpecificEvent) {
    let address = event.location;

    if (address && address.startsWith('📍 ')) {
        address = address.substring(2);
    }
    
    if (!address) {
        console.warn('Evento sem localização:', event.title);
        return;
    }
    
    const iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'; 

    geocoder.geocode({ 'address': address, 'region': 'BR' }, (results, status) => {
        if (status === 'OK') {
            const position = results[0].geometry.location;
            
            const marker = new google.maps.Marker({
                map: map,
                position: position,
                title: event.title,
                icon: iconUrl,
                animation: google.maps.Animation.DROP
            });
            
            markers.push(marker); 
    
            marker.addListener('click', () => {
                showInfoPanel(event);
                
                map.setCenter(position);
                map.setZoom(16); 
            });

            if (isSpecificEvent) {
                map.setCenter(position);
                map.setZoom(16); 
            }

        } else {
            console.warn(`Geocode falhou para "${address}": ${status}`);
        }
    });
}

window.initMap = initMap;