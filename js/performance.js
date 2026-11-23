'use strict';
// Métricas locais para o F3. Não envia dados a serviços externos.
const PrismaPerf = (() => {
  class FrameHistory {
    constructor(capacity = 600) {
      this.capacity = Math.max(30, Math.min(1800, Math.trunc(capacity) || 600));
      this.values = new Float32Array(this.capacity);
      this.cursor = 0;
      this.count = 0;
    }
    push(seconds) {
      // Suspender navegador, trocar aba ou pausar a partida não é um frame lento.
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 2) return false;
      this.values[this.cursor] = seconds * 1000;
      this.cursor = (this.cursor + 1) % this.capacity;
      this.count = Math.min(this.count + 1, this.capacity);
      return true;
    }
    reset() { this.cursor = 0; this.count = 0; }
    snapshot() {
      if (!this.count) return {samples:0, averageFPS:0, low1FPS:0, p95Ms:0, avgMs:0};
      const data = Array.from(this.values.subarray(0, this.count));
      const total = data.reduce((s, n) => s + n, 0);
      data.sort((a, b) => a - b);
      const slowCount = Math.max(1, Math.ceil(this.count / 100));
      const slowAvg = data.slice(-slowCount).reduce((s, n) => s + n, 0) / slowCount;
      return {
        samples:this.count,
        averageFPS:Math.round(1000 * this.count / total),
        low1FPS:Math.round(1000 / slowAvg),
        p95Ms:+data[Math.min(this.count - 1, Math.ceil(this.count * .95) - 1)].toFixed(1),
        avgMs:+(total / this.count).toFixed(1),
      };
    }
  }
  return { FrameHistory };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PrismaPerf;
