document.addEventListener('DOMContentLoaded', () => {
    // --- STAV HRY (rozšířený) ---
    const loadGameState = () => {
        const savedState = localStorage.getItem('itStudentGameState');
        if (savedState) {
            return JSON.parse(savedState);
        }
        // Výchozí stav pro úplně novou hru
        return {
            inventory: [],
            completedStories: [], // Seznam ID dokončených příběhů
            selectedStory: null,  // Jaký příběh hráč vybral
            isStoryConfirmed: false // Zda si sbalil batoh po výběru
        };
    };
    const saveGameState = (state) => localStorage.setItem('itStudentGameState', JSON.stringify(state));
    const resetGame = () => saveGameState({ inventory: [], completedStories: [], selectedStory: null, isStoryConfirmed: false });
    let gameState = loadGameState();

    // --- DATABÁZE PŘÍBĚHŮ ---
    // Zde si definuj své příběhy a kam směřují
    const stories = {
        story1: { id: 'story1', title: 'Příběh 1: Klasické ráno a útok viru', destination: 'school.html', requires: null },
        // Přidej další příběhy zde, pokud je budeš mít
        // story2: { id: 'story2', title: 'Příběh 2: Tajemná USB klíčenka', destination: 'library.html', requires: 'story1' },
        // story3: { id: 'story3', title: 'Příběh 3: Finální projekt', destination: 'lab.html', requires: 'story2' }
    };

    // --- UI ELEMENTY ---
    const inventoryContainer = document.getElementById('inventory-items');
    const dialogueBox = document.getElementById('dialogue-box');
    const messageTextElement = document.getElementById('message-text');
    const mapIcon = document.getElementById('map-icon');
    const modalOverlay = document.getElementById('story-modal-overlay');
    const modalChoicesContainer = document.getElementById('story-choices');
    const closeModalButton = document.getElementById('close-modal');

    // --- FUNKCE PRO ZOBRAZENÍ ZPRÁVY ---
    let messageTimeout;
    const showMessage = (text, duration = 4000) => {
        if (!dialogueBox || !messageTextElement) return;
        messageTextElement.textContent = text;
        dialogueBox.style.display = 'block';
        clearTimeout(messageTimeout);
        if (duration > 0) {
            messageTimeout = setTimeout(() => {
                dialogueBox.style.display = 'none';
            }, duration);
        }
    };
    
    // --- INVENTÁŘ ---
    const renderInventory = () => {
        if (!inventoryContainer) return;
        inventoryContainer.innerHTML = '';
        gameState.inventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.title = item.name;
            itemDiv.style.backgroundImage = `url(${item.image})`;
            inventoryContainer.appendChild(itemDiv);
        });
    };

    // --- AKTUALIZACE STAVU UI ---
    const updateUI = () => {
        if (mapIcon) {
            if (gameState.isStoryConfirmed) {
                mapIcon.classList.add('active');
                mapIcon.title = "Vyrazit do školy";
            } else {
                mapIcon.classList.remove('active');
                mapIcon.title = "Mapa (nejprve si vyber úkol a sbal se)";
            }
        }
        renderInventory();
    };

    // --- OTEVŘENÍ MODÁLNÍHO OKNA S PŘÍBĚHY ---
    const openStoryModal = () => {
        if (!modalOverlay || !modalChoicesContainer) return;
        modalChoicesContainer.innerHTML = ''; // Vyčistit předchozí volby

        Object.values(stories).forEach(story => {
            const isLocked = story.requires && !gameState.completedStories.includes(story.requires);
            const button = document.createElement('button');
            button.className = 'btn story-choice';
            button.textContent = story.title;
            button.dataset.storyId = story.id;

            if (isLocked) {
                button.classList.add('locked');
                button.disabled = true;
            } else {
                button.onclick = () => {
                    gameState.selectedStory = story.id;
                    gameState.isStoryConfirmed = false; // Výběr příběhu zruší potvrzení
                    gameState.inventory = []; // Vyprázdní inventář pro nový příběh
                    saveGameState(gameState);
                    updateUI();
                    showMessage(`Příběh "${story.title}" vybrán. Teď si sbal batoh a můžeme vyrazit.`, 4000);
                    modalOverlay.classList.add('hidden');
                };
            }
            modalChoicesContainer.appendChild(button);
        });
        modalOverlay.classList.remove('hidden');
    };

    // --- ZAVŘENÍ MODÁLNÍHO OKNA ---
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    }

    // --- LOGIKA PRO JEDNOTLIVÉ STRÁNKY ---

    // 1. index.html - ÚVODNÍ MENU
    const startButton = document.getElementById('start-game');
    if (startButton) {
        startButton.addEventListener('click', () => {
            resetGame(); // Vždy resetuje stav při startu z menu
            window.location.href = 'home.html';
        });
    }

    // 2. home.html - SCÉNA DOMA
    const hotspotNotebook = document.getElementById('notebook');
    const hotspotBackpack = document.getElementById('backpack');
    
    if (hotspotNotebook) {
        hotspotNotebook.addEventListener('click', openStoryModal);
    }

    if (hotspotBackpack) {
        hotspotBackpack.addEventListener('click', () => {
            if (!gameState.selectedStory) {
                showMessage("Musím si nejprve na notebooku vybrat, co budu dnes dělat.", 3000);
                return;
            }
            // Kontrola, zda batoh ještě není v inventáři
            if (!gameState.inventory.find(item => item.id === 'backpack')) {
                gameState.inventory.push({
                    id: 'backpack', name: 'Sbalený batoh', image: 'png/backpack.png'
                });
                gameState.isStoryConfirmed = true; // Potvrzení výběru příběhu
                saveGameState(gameState);
                updateUI();
                showMessage("Batoh sbalen. Jsem připraven. Klikni na mapu a vyraz.", 4000);
            } else {
                showMessage("Batoh už mám sbalený.", 3000);
            }
        });
    }

    if (mapIcon) {
        mapIcon.addEventListener('click', () => {
            if (gameState.isStoryConfirmed) {
                const story = stories[gameState.selectedStory];
                if (story) {
                    window.location.href = story.destination;
                }
            } else {
                showMessage("Ještě nejsem připravený vyrazit. Musím si vybrat úkol a sbalit batoh.", 4000);
            }
        });
    }

    // 3. school.html - SCÉNA VE ŠKOLE
    const faceVirusBtn = document.getElementById('face-virus');
    const virusOverlay = document.getElementById('virus-overlay');
    if (faceVirusBtn) {
        showMessage('Konečně ve škole...', 3000);
        setTimeout(() => showMessage('Učitel: "Dobrý den třído, dnes se podíváme na..."', 4000), 4000);
        setTimeout(() => {
            showMessage('SYSTÉMOVÁ CHYBA: DETEKOVÁN VIRUS!', 0); // Zůstane zobrazeno
            if (virusOverlay) virusOverlay.classList.remove('hidden');
            faceVirusBtn.classList.remove('hidden');
        }, 9000);
    }

    // 4. minigame.html - MINIHRY
    const clickerArea = document.getElementById('clicker-area');
    const codePuzzleArea = document.getElementById('code-puzzle-area');
    const minigameMessage = document.getElementById('minigame-message');
    
    if (clickerArea) {
        let virusesToClick = 5;
        minigameMessage.textContent = `Znič ${virusesToClick} virových fragmentů!`;
        const createVirus = () => {
            // Zastaví vytváření virů, pokud už jsou všechny splněny nebo došlo k chybě
            if (virusesToClick === 0 || document.getElementsByClassName('virus-object').length >= virusesToClick) return; 
            
            const virus = document.createElement('div');
            virus.className = 'virus-object';
            virus.style.left = `${Math.random() * (clickerArea.offsetWidth - 40)}px`;
            virus.style.top = `${Math.random() * (clickerArea.offsetHeight - 40)}px`;
            
            virus.addEventListener('click', () => {
                virus.remove();
                virusesToClick--;
                minigameMessage.textContent = `Zbývá zničit: ${virusesToClick}`;
                if (virusesToClick === 0) {
                    minigameMessage.textContent = 'První vlna zničena! Oprav systémový kód.';
                    setTimeout(() => {
                        clickerArea.classList.add('hidden');
                        codePuzzleArea.classList.remove('hidden');
                    }, 2000);
                }
            });
            clickerArea.appendChild(virus);
        };
        // Spustí vytváření virů po krátké prodlevě
        setTimeout(() => setInterval(createVirus, 800), 1000); 
    }
    
    const solvePuzzleBtn = document.getElementById('solve-puzzle');
    if (solvePuzzleBtn) {
        const puzzleList = document.getElementById('puzzle-lines');
        let draggedItem = null;
        
        // Drag and Drop logika
        puzzleList.addEventListener('dragstart', e => { 
            if(e.target.tagName === 'LI') {
                draggedItem = e.target; 
                e.dataTransfer.effectAllowed = 'move';
            }
        });
        puzzleList.addEventListener('dragover', e => e.preventDefault());
        puzzleList.addEventListener('drop', e => {
            e.preventDefault();
            if(e.target.tagName === 'LI' && e.target !== draggedItem && puzzleList.contains(draggedItem)) {
                // Vloží předem, nebo za, podle pozice
                if(puzzleList.children.length > 1) { // Jen pokud je co přehazovat
                    puzzleList.insertBefore(draggedItem, e.target);
                }
            }
        });

        solvePuzzleBtn.addEventListener('click', () => {
            const correctOrder = ["1", "2", "3", "4"];
            let isCorrect = Array.from(puzzleList.querySelectorAll('li')).every((line, index) => line.dataset.order === correctOrder[index]);
            
            if (isCorrect) {
                minigameMessage.textContent = 'Kód opraven! Systém je čistý!';
                setTimeout(() => window.location.href = 'victory.html', 2000);
            } else {
                minigameMessage.textContent = 'Špatné pořadí! Zkus to znovu.';
            }
        });
    }

    // 5. victory.html - VÝHRA
    const backToHomeButton = document.getElementById('back-to-home');
    if (backToHomeButton) {
        // Po výhře uložíme pokrok a resetujeme stav pro další výběr
        if (gameState.selectedStory && !gameState.completedStories.includes(gameState.selectedStory)) {
            gameState.completedStories.push(gameState.selectedStory);
        }
        gameState.selectedStory = null;
        gameState.isStoryConfirmed = false;
        gameState.inventory = []; // Inventář se resetuje pro nový příběh
        saveGameState(gameState);

        backToHomeButton.addEventListener('click', () => {
            window.location.href = 'home.html'; // Vracíme se do pokoje pro nový výběr
        });
    }

    // --- INICIALIZACE ---
    updateUI(); // Zavolá se na každé stránce pro správné zobrazení UI
});