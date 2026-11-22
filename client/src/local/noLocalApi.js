// Zaślepka dla zwykłego buildu webowego (vite.config.js: alias 'virtual-local-api'). Tam raport liczy serwer.
export function localGet() {
  throw new Error('Lokalny backend jest tylko w aplikacji mobilnej.');
}
