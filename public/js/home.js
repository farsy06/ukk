document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll("[data-counter]");
  counters.forEach((el) => {
    const target = parseInt(el.getAttribute("data-counter") || "0", 10);
    if (Number.isNaN(target)) return;

    const duration = 700;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = String(value);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = String(target);
      }
    };

    requestAnimationFrame(tick);
  });
});
