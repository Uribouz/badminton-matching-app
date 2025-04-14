export class XorShift {
  private state0: number;
  private state1: number;

  constructor(seed = Date.now()) {
    this.state0 = seed >>> 0;
    this.state1 = (seed * 16807) >>> 0;
    // Warm up
    for (let i = 0; i < 10; i++) this.next();
  }

  next(): number {
    let s1 = this.state0;
    const s0 = this.state1;
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;
    return (s0 + s1) >>> 0;
  }

  random(): number {
    return this.next() / 4294967296;
  }
}