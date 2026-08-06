import { nextNumeroOtrosi, pickMostRecentOtrosi } from "@/lib/otrosi";

describe("nextNumeroOtrosi", () => {
  it("returns 1 when there are no previous otrosís", () => {
    expect(nextNumeroOtrosi([])).toBe(1);
  });

  it("returns 1 when all entries are null", () => {
    expect(nextNumeroOtrosi([null, null])).toBe(1);
  });

  it("returns one more than the highest known number", () => {
    expect(nextNumeroOtrosi([1, 2, 3])).toBe(4);
  });

  it("ignores null entries mixed with numbers", () => {
    expect(nextNumeroOtrosi([null, 4, null])).toBe(5);
  });

  it("handles a historical import with a gap (only #4 was ever registered)", () => {
    expect(nextNumeroOtrosi([4])).toBe(5);
  });

  it("does not assume the input array is sorted", () => {
    expect(nextNumeroOtrosi([3, 1, 4, 1, 5])).toBe(6);
  });
});

describe("pickMostRecentOtrosi", () => {
  it("returns null when there are no candidates", () => {
    expect(pickMostRecentOtrosi([])).toBeNull();
  });

  it("picks the highest numeroOtrosi regardless of creation order", () => {
    const older = { numeroOtrosi: 4, creadoEn: new Date("2026-01-01") };
    const newer = { numeroOtrosi: 2, creadoEn: new Date("2026-06-01") };
    // "newer" was created later (e.g. imported after) but #4 is the real logical baseline
    expect(pickMostRecentOtrosi([newer, older])).toBe(older);
  });

  it("falls back to creadoEn when numeroOtrosi is null on all candidates", () => {
    const older = { numeroOtrosi: null, creadoEn: new Date("2026-01-01") };
    const newer = { numeroOtrosi: null, creadoEn: new Date("2026-06-01") };
    expect(pickMostRecentOtrosi([older, newer])).toBe(newer);
  });

  it("treats null numeroOtrosi as lower priority than any known number", () => {
    const withNumber = { numeroOtrosi: 1, creadoEn: new Date("2026-01-01") };
    const withoutNumber = { numeroOtrosi: null, creadoEn: new Date("2026-06-01") };
    expect(pickMostRecentOtrosi([withoutNumber, withNumber])).toBe(withNumber);
  });
});
