import { nextNumeroOtrosi } from "@/lib/otrosi";

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
