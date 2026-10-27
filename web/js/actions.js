import S from './state.js';

export const rand = (a, b) => a + Math.random() * (b - a);

// Pegas: menarik pos ke target dengan efek kenyal. Mengembalikan [pos baru, kecepatan baru]
export const spring = (pos, vel, target, k, c, sec) => {
  vel += ((target - pos) * k - vel * c) * sec;
  return [pos + vel * sec, vel];
};

export function setSleep(value) {
  S.sleeping = value;
  S.bubble.style.display = value ? '' : 'none';
}

export function spawnLove() {
  const heart = new Image();
  heart.src = S.BASE + S.rig.effects.love;
  heart.className = 'layer effect';
  S.stage.appendChild(heart);
  // Random start x above the cat (image pixels), then a small drift while fading
  const x0 = Math.round(rand(-10, 10)) * S.SCALE;
  const dx = x0 + Math.round(rand(-3, 3)) * S.SCALE;
  const startY = -Math.round(S.stage.offsetHeight * S.LOVE_START_UP);
  heart
    .animate(
      [
        { transform: `translate(${x0}px, ${startY}px)`, opacity: 1 },
        { transform: `translate(${dx}px, ${startY - 3 * S.SCALE}px)`, opacity: 0 },
      ],
      { duration: 1500, easing: 'steps(8)' }
    )
    .addEventListener('finish', () => heart.remove());
}