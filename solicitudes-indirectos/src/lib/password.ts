export function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '!@#$%';
  const all = upper + lower + nums + special;

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = 4; i < 10; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  return chars.sort(() => Math.random() - 0.5).join('');
}
