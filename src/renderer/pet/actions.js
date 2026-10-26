const S = require('./state');

const rand = (a, b) => a + Math.random() * (b - a);

// Pegas: menarik pos ke target dengan efek kenyal. Mengembalikan [pos baru, kecepatan baru]
const spring = (pos, vel, target, k, c, sec) => {
  vel += ((target - pos) * k - vel * c) * sec;
  return [pos + vel * sec, vel];
};

function setSleep(value) {
  S.sleeping = value;
  S.bubble.style.display = value ? '' : 'none';
}

function spawnLove() {
  const heart = new Image();
  heart.src = S.BASE + S.rig.effects.love;
  heart.className = 'layer effect';
  S.stage.appendChild(heart);
  const dx = Math.round(rand(-3, 3)) * S.SCALE;
  const startY = -Math.round(S.stage.offsetHeight * S.LOVE_START_UP);
  heart
    .animate(
      [
        { transform: `translate(0px, ${startY}px)`, opacity: 1 },
        { transform: `translate(${dx}px, ${startY - 3 * S.SCALE}px)`, opacity: 0 },
      ],
      { duration: 1500, easing: 'steps(8)' }
    )
    .addEventListener('finish', () => heart.remove());
}

function updateHud() {
  const text = performance.now() < S.sayUntil ? S.sayText : S.statusText;
  S.hud.textContent = text;
  S.hud.style.display = text ? 'block' : 'none';
}

module.exports = { rand, spring, setSleep, spawnLove, updateHud };