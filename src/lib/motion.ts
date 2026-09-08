export function scrollToPageTop() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  window.scrollTo({
    behavior: reduceMotion ? "auto" : "smooth",
    top: 0,
  });
}
