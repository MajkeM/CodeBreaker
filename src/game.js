import { scenes } from './scenes.js';

let currentScene = 'start';

function renderScene(sceneKey) {
  const scene = scenes[sceneKey];
  const sceneContainer = document.getElementById('scene');
  sceneContainer.innerHTML = `<h2>${scene.description}</h2>`;
  const objectsDiv = document.createElement('div');
  scene.objects.forEach(obj => {
    const btn = document.createElement('button');
    btn.textContent = obj.label;
    btn.onclick = () => {
      if (obj.nextScene) {
        currentScene = obj.nextScene;
        renderScene(currentScene);
      } else if (obj.action) {
        alert(obj.action);
      }
    };
    objectsDiv.appendChild(btn);
  });
  sceneContainer.appendChild(objectsDiv);
}

document.addEventListener('DOMContentLoaded', () => {
  renderScene(currentScene);
});
