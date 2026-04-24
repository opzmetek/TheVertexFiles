import {Game} from "/TheVertexFiles/core/state.js";
import {pointerLock} from "/TheVertexFiles/ui/ui.js";
import {startGame} from "/TheVertexFiles/app.js";

export function createStartingPanel() {
    let existing = document.getElementById('starting');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'starting';
    container.className = 'c';
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.gap = '20px';
    container.style.padding = '20px';
    container.style.background = 'linear-gradient(145deg, #0e1625, #101c33)';
    container.style.border = '2px solid #3db4ff';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 0 20px rgba(61,180,255,0.6),0 0 40px rgba(61,180,255,0.3)';

    document.body.appendChild(container);

    // --- Krok 1: zobrazíme věže ---
    function showTowers() {
        container.innerHTML = ''; // vyčistíme container
        const title = document.createElement('span');
        title.textContent = 'Select Tower';
        title.className = 'large glow';
        title.onclick = cancel;
        container.appendChild(title);

        const towerContainer = document.createElement('div');
        towerContainer.style.display = 'flex';
        towerContainer.style.gap = '15px';
        towerContainer.style.flexWrap = 'wrap';
        towerContainer.style.justifyContent = 'center';
        container.appendChild(towerContainer);

        for (let towerName in Game.manifest.levels) {
            const color = Game.manifest.levels[towerName].meta.color || '#3db4ff';
            const color2 = Game.manifest.levels[towerName].meta["alt-color"]||"#fff";
            // SVG / rectangle
            const towerDiv = document.createElement('div');
            towerDiv.style.width = '80px';
            towerDiv.style.height = '80px';
            towerDiv.style.backgroundColor = color;
            towerDiv.style.borderRadius = '12px';
            towerDiv.style.display = 'flex';
            towerDiv.style.alignItems = 'center';
            towerDiv.style.justifyContent = 'center';
            towerDiv.style.color = color2;
            towerDiv.style.fontFamily = 'DytSans';
            towerDiv.style.fontSize = '0.5rem';
            towerDiv.style.cursor = 'pointer';
            towerDiv.style.boxShadow = '0 0 10px rgba(61,180,255,0.4),0 0 20px rgba(61,180,255,0.2)';
            towerDiv.textContent = towerName;

            towerDiv.addEventListener('click', () => {
                showLevels(towerName);
            });

            towerContainer.appendChild(towerDiv);
        }
    }
    
    function cancel(){
      container.remove();
    }

    // --- Krok 2: zobrazíme levely pro vybranou věž ---
    function showLevels(towerName) {
        container.innerHTML = '';
        const title = document.createElement('span');
        title.textContent = `Select Level for ${towerName}`;
        title.className = 'large glow';
        title.onclick = cancel;
        container.appendChild(title);

        const levelsContainer = document.createElement('div');
        levelsContainer.style.display = 'flex';
        levelsContainer.style.gap = '10px';
        levelsContainer.style.flexDirection = 'column';
        levelsContainer.style.alignItems = 'center';
        container.appendChild(levelsContainer);

        const levels = Game.manifest.levels[towerName];
        const color = levels.meta.color || '#3db4ff';
        const color2= levels.meta["alt-color"]||"#fff";
        for (let levelName in levels) {
          if(levelName==="meta")continue;
            const levelDiv = document.createElement('div');
            levelDiv.style.width = '200px';
            levelDiv.style.padding = '10px';
            levelDiv.style.backgroundColor = color;
            levelDiv.style.borderRadius = '8px';
            levelDiv.style.color = color2;
            levelDiv.style.fontFamily = 'DytSans';
            levelDiv.style.fontSize = '1rem';
            levelDiv.style.textAlign = 'center';
            levelDiv.style.cursor = 'pointer';
            levelDiv.style.boxShadow = '0 0 10px rgba(61,180,255,0.4),0 0 20px rgba(61,180,255,0.2)';
            levelDiv.textContent = levelName;

            levelDiv.addEventListener('click', () => {
                // spustí hru
                startGame(towerName,levelName);
                pointerLock();
                container.remove(); // zmizí panel
            });

            levelsContainer.appendChild(levelDiv);
        }
    }

    showTowers();
}
