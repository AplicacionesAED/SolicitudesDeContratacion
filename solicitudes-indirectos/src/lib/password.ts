export function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '!@#$%';
  const all = upper + lower + nums + special;

  function randomIndex(max: number): number {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  const chars = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    nums[randomIndex(nums.length)],
    special[randomIndex(special.length)],
  ];

  for (let i = 4; i < 10; i++) {
    chars.push(all[randomIndex(all.length)]);
  }

  // Fisher-Yates shuffle with crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
