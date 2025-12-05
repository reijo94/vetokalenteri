document.addEventListener('DOMContentLoaded', () => {

    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT694icIRXusGqnePSLmMMYE6S30jxqBmf85L4mpo96gcdvHT_4FQp-gHneu33rCrc892s1WonRg7Iy/pub?gid=0&single=true&output=csv';

    const cardGrid = document.getElementById('card-grid');
    const messageArea = document.getElementById('message-area');
    
    // Audio & UI Elements
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const bgMusic = document.getElementById('bg-music');
    
    const adventData = {};
    let originalMessage = 'AVAA PÄIVÄN LUUKKU!'; 

    // --- 1. START SCREEN LOGIC ---
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        
        // Try to start music
        bgMusic.volume = 0.3; 
        bgMusic.play().catch(e => console.log("Music play failed:", e));
    });

    // --- 2. SOUND EFFECT HELPER ---
    function playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0; 
            sound.play().catch(e => console.log("Audio play failed:", e));
        }
    }

    // --- 3. DATA FETCHING ---
    async function fetchAdventData() {
        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            if (!response.ok) { throw new Error('Network response was not OK.'); }
            const csvText = await response.text();
            
            const rows = csvText.split('\n').filter(row => row.trim() !== '');
            
            rows.slice(1).forEach(row => {
                const splitIndex = row.indexOf(',');
                if (splitIndex === -1) return;

                const day = row.substring(0, splitIndex).trim();
                let content = row.substring(splitIndex + 1).trim();
                
                if (content.startsWith('"') && content.endsWith('"')) {
                    content = content.substring(1, content.length - 1);
                }
                content = content.replace(/""/g, '"').replace(/\r/g, '');
                
                if (day && content) {
                    adventData[day] = content;
                }
            });
            
            console.log('Data loaded successfully:', adventData);
            initializeGrid();

        } catch (error) {
            console.error('Failed to fetch data:', error);
            messageArea.textContent = 'Error loading data! (Did you use "Live Server"?)';
        }
    }

    // --- 4. GRID BUILDING ---
    function initializeGrid() {
        cardGrid.innerHTML = '';
        messageArea.textContent = originalMessage;
        
        for (let i = 1; i <= 24; i++) {
            const day = i;
            const content = adventData[day] || "No prize today.";

            const card = document.createElement('div');
            card.className = 'grid-card';
            card.dataset.day = day; 

            // Front Face
            const faceFront = document.createElement('div');
            faceFront.className = 'card__face card__face--front';
            faceFront.textContent = day; 
            
            // Back Face
            const faceBack = document.createElement('div');
            faceBack.className = 'card__face card__face--back';
            
            const contentDay = document.createElement('h2');
            contentDay.className = 'card-content-day';
            contentDay.textContent = `Day ${day}`;
            
            const contentText = document.createElement('p');
            contentText.className = 'card-content-text';
            contentText.textContent = content;
            
            faceBack.appendChild(contentDay);
            faceBack.appendChild(contentText);
            
            card.appendChild(faceFront);
            card.appendChild(faceBack);
            
            card.addEventListener('click', handleCardClick);
            cardGrid.appendChild(card);
        }
    }

    // --- 5. INTERACTION LOGIC ---
    function handleCardClick(event) {
        const clickedCard = event.currentTarget;
        const day = parseInt(clickedCard.dataset.day);
        
        const isZoomed = clickedCard.classList.contains('zoomed');
        const isFlipped = clickedCard.classList.contains('is-flipped');

        // --- REAL DATE CHECK ---
        const now = new Date();
        const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec
        const currentDay = now.getDate();
        
        let allowed = false;
        
        if (currentMonth !== 11) {
            allowed = false; 
            messageArea.textContent = "It's not December yet!";
        } else if (day > currentDay) {
            allowed = false;
            // UPDATED MESSAGE HERE:
            messageArea.textContent = `HOU HOU ÄLÄ HOPPUILE, ODOTA ETTÄ ON ${day} PÄIVÄ!`;
        } else {
            allowed = true;
        }

        if (!allowed && !isZoomed) {
            playSound('snd-deny'); 
            clickedCard.classList.add('deny');
            setTimeout(() => {
                clickedCard.classList.remove('deny');
                messageArea.textContent = originalMessage;
            }, 1500);
            return; 
        }

        // --- ZOOM / FLIP / RETURN LOGIC ---
        if (!isZoomed) {
            const currentZoomed = document.querySelector('.grid-card.zoomed');
            if (currentZoomed && currentZoomed !== clickedCard) {
                currentZoomed.style.transform = ''; 
                currentZoomed.classList.remove('zoomed');
            }

            playSound('snd-zoom'); 

            const cardRect = clickedCard.getBoundingClientRect();
            const viewportX = window.innerWidth / 2;
            const viewportY = (window.innerHeight / 2) - 30; 
            const targetHeight = 420;
            const scale = targetHeight / cardRect.height;
            
            const tx = viewportX - (cardRect.left + cardRect.width / 2);
            const ty = viewportY - (cardRect.top + cardRect.height / 2);
            
            clickedCard.dataset.tx = tx;
            clickedCard.dataset.ty = ty;
            clickedCard.dataset.scale = scale;
            
            if (isFlipped) {
                clickedCard.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotateY(180deg)`;
            } else {
                clickedCard.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
            }
            clickedCard.classList.add('zoomed');
            messageArea.textContent = `Day ${day}`;
            
        } else {
            const tx = clickedCard.dataset.tx;
            const ty = clickedCard.dataset.ty;
            const scale = clickedCard.dataset.scale;

            if (!isFlipped) {
                playSound('snd-flip'); 
                clickedCard.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotateY(180deg)`;
                clickedCard.classList.add('is-flipped'); 
            } else {
                playSound('snd-return'); 
                clickedCard.style.transform = ''; 
                clickedCard.classList.remove('zoomed');
                messageArea.textContent = originalMessage;
            }
        }
    }

    // --- 6. MONEY RAIN LOGIC ---
    function startMoneyRain() {
        setInterval(() => {
            const money = document.createElement('div');
            money.classList.add('money');
            money.innerText = '$'; // The Dollar Sign
            
            // Random positioning and style
            money.style.left = Math.random() * 100 + 'vw';
            money.style.animationDuration = Math.random() * 2 + 3 + 's'; // Fall speed between 3s and 5s
            money.style.fontSize = Math.random() * 20 + 15 + 'px'; // Random size
            money.style.opacity = Math.random() * 0.5 + 0.3; // Random opacity

            document.body.appendChild(money);

            // Cleanup after animation finishes (5 seconds)
            setTimeout(() => {
                money.remove();
            }, 5000);
        }, 50); // Create a new dollar every 50ms (Dense Rain)
    }

    // Start App & Rain
    fetchAdventData();
    startMoneyRain();

});