import { useEffect, useState } from 'react';

// ApexCharts anima la entrada de barras/lineas por defecto y no respeta
// prefers-reduced-motion por su cuenta -- PRODUCT.md lo pide en todo el
// producto, asi que cada grafico apaga esa animacion (chart.animations.enabled)
// cuando aplica.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return reduced;
}
