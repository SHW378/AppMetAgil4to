document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const cardsContainer = document.getElementById('cards-container');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Modal Referencias
    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalActionClose = document.getElementById('modal-action-close');
    const modalTitle = document.getElementById('modal-title');
    const modalSchedule = document.getElementById('modal-schedule');
    const modalAddress = document.getElementById('modal-address');
    const modalPhone = document.getElementById('modal-phone');
    
    // Reseñas Referencias
    const reviewsList = document.getElementById('reviews-list');
    const reviewForm = document.getElementById('review-form');
    const reviewUserInput = document.getElementById('review-user');
    const reviewTextInput = document.getElementById('review-text');
    const starRatingContainer = document.getElementById('star-rating');
    const stars = document.querySelectorAll('.star');
    const reviewRatingInput = document.getElementById('review-rating');
    let currentPlaceId = null;

    // Inicializar Mapa con Leaflet (centrado en La Salle Bajío)
    const map = L.map('map').setView([21.1526, -101.7116], 17);

    // Cargar los tiles de Google Maps
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data © Google'
    }).addTo(map);

    // Array para guardar los marcadores y poder filtrarlos
    const markers = [];

    // Función para renderizar las tarjetas
    function renderCards(filter = 'all') {
        cardsContainer.innerHTML = '';
        
        const filteredPlaces = placesData.filter(place => {
            if (filter === 'all') return true;
            return place.priceRange === filter;
        });

        if (filteredPlaces.length === 0) {
            cardsContainer.innerHTML = '<p>No se encontraron lugares para este presupuesto.</p>';
            return;
        }

        filteredPlaces.forEach(place => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.id = place.id;

            card.innerHTML = `
                <div class="card-img-container">
                    <img src="${place.image}" alt="${place.name}" class="card-img" onerror="this.src='https://via.placeholder.com/400x200?text=Sin+Foto'">
                    <span class="time-badge">📍 ${place.distanceText}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${place.name}</h3>
                    <p class="card-desc">${place.description}</p>
                    <div class="card-info">
                        <span class="price">${place.priceRange}</span>
                        <span class="schedule">🕒 ${place.schedule.split(':')[0]}</span>
                    </div>
                    <span class="category-tag">${place.category}</span>
                </div>
            `;

            // Evento para abrir modal
            card.addEventListener('click', () => openModal(place));
            
            cardsContainer.appendChild(card);
        });
    }

    // Función para renderizar los marcadores en el mapa
    function renderMapMarkers() {
        markers.forEach(marker => map.removeLayer(marker));
        markers.length = 0;

        placesData.forEach(place => {
            if (place.lat && place.lng) {
                const marker = L.marker([place.lat, place.lng]).addTo(map);
                
                marker.bindPopup(`
                    <strong>${place.name}</strong><br>
                    ${place.category}<br>
                    <button class="popup-btn" onclick="document.querySelector('.card[data-id=\\'${place.id}\\']').click()">Ver detalles</button>
                `);

                markers.push(marker);
            }
        });
    }

    // Lógica de estrellas
    function setStars(rating) {
        stars.forEach(s => {
            if (parseInt(s.dataset.value) <= rating) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
        reviewRatingInput.value = rating;
    }

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const rating = parseInt(e.target.dataset.value);
            setStars(rating);
        });
    });

    // Funciones del Modal
    function openModal(place) {
        currentPlaceId = place.id;
        modalTitle.textContent = place.name;
        modalSchedule.textContent = place.schedule;
        modalAddress.textContent = place.address;
        modalPhone.textContent = place.phone;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        currentPlaceId = null;
    }

    // Funciones de Reseñas Globales (LocalStorage)
    function getStarsHTML(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += i <= rating ? '★' : '☆';
        }
        return html;
    }

    function loadGlobalReviews() {
        reviewsList.innerHTML = '';
        const allReviews = JSON.parse(localStorage.getItem('survivor_global_reviews')) || [];

        if (allReviews.length === 0) {
            reviewsList.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">No hay reseñas todavía. ¡Sé el primero en comentar!</p>';
            return;
        }

        allReviews.forEach(review => {
            const reviewEl = document.createElement('div');
            reviewEl.classList.add('review-card');
            
            const date = new Date(review.timestamp).toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            reviewEl.innerHTML = `
                <div class="review-card-header">
                    <div class="review-user-info">
                        <div class="avatar-placeholder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <div class="review-user">${review.user}</div>
                            <div class="review-date">${date}</div>
                        </div>
                    </div>
                    <div class="review-stars">${getStarsHTML(review.rating)}</div>
                </div>
                <div class="review-text">${review.text}</div>
            `;
            reviewsList.appendChild(reviewEl);
        });
    }

    function saveGlobalReview(e) {
        e.preventDefault();
        
        const user = reviewUserInput.value.trim();
        const text = reviewTextInput.value.trim();
        const rating = parseInt(reviewRatingInput.value);

        if (user === '' || text === '') return;

        const newReview = {
            user: user,
            text: text,
            rating: rating,
            timestamp: new Date().toISOString()
        };

        const allReviews = JSON.parse(localStorage.getItem('survivor_global_reviews')) || [];
        
        // Agregar al inicio
        allReviews.unshift(newReview);
        localStorage.setItem('survivor_global_reviews', JSON.stringify(allReviews));

        reviewForm.reset();
        setStars(5);
        loadGlobalReviews();
    }

    // Event Listeners
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            const target = e.target;
            target.classList.add('active');
            
            const filter = target.dataset.filter;
            renderCards(filter);
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    modalActionClose.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    reviewForm.addEventListener('submit', saveGlobalReview);

    // Reseñas por defecto (se cargan solo la primera vez)
    function seedDefaultReviews() {
        if (localStorage.getItem('survivor_reviews_seeded')) return;

        const defaultReviews = [
            {
                user: "Oscar Romero",
                text: "Fui a la Cafetería Plaza Centenario y la verdad me sorprendió. Los precios son accesibles para estudiantes, las tortas están muy buenas y el servicio es rápido. En general la universidad tiene muy buenas opciones para comer, siempre encuentras algo diferente.",
                rating: 5,
                timestamp: "2026-06-02T14:30:00Z"
            },
            {
                user: "Angel",
                text: "Probé la pizza de Fratelo Gastronomía y está bastante decente, la masa es delgada como me gusta. El único detalle es que a veces tarda un poco cuando hay mucha gente, pero vale la pena esperar. Le doy 4 estrellas porque el precio es un poco elevado para ser pizza de campus.",
                rating: 4,
                timestamp: "2026-06-04T10:15:00Z"
            },
            {
                user: "Vidal",
                text: "El Rincón es mi lugar favorito para desayunar entre clases. Las bubas están riquísimas y los precios son los más baratos del campus. Lo recomiendo al 100% si andas corto de lana. Lo único malo es que el espacio es reducido y en horas pico está lleno.",
                rating: 4,
                timestamp: "2026-06-05T09:45:00Z"
            },
            {
                user: "Victor",
                text: "Leaf & Brew tiene el mejor café del campus sin duda. El ambiente es muy tranquilo para estudiar o hacer tareas. Eso sí, los precios son un poco altos comparados con las demás cafeterías, pero la calidad del café lo justifica. Buen lugar para darte un gusto.",
                rating: 3,
                timestamp: "2026-06-07T16:20:00Z"
            },
            {
                user: "Santiago",
                text: "Me gusta mucho Punta del Cielo en la facultad de idiomas, siempre paso por un café antes de mi clase de inglés. El frappe de moka es el mejor. Además el lugar está bien ubicado y el personal es muy amable. Se los recomiendo si les gusta el café de calidad.",
                rating: 5,
                timestamp: "2026-06-09T11:00:00Z"
            }
        ];

        localStorage.setItem('survivor_global_reviews', JSON.stringify(defaultReviews));
        localStorage.setItem('survivor_reviews_seeded', 'true');
    }

    // Inicialización
    setStars(5);
    renderCards('all');
    renderMapMarkers();
    seedDefaultReviews();
    loadGlobalReviews();
});
