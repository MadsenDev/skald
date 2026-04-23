import { useActiveTheme } from '../themes/useTheme';
import { MatrixRain } from './MatrixRain';
import { FireAnimation } from './FireAnimation';
import { OceanAnimation } from './OceanAnimation';
import { NeonAnimation } from './NeonAnimation';

/**
 * AnimationLayer - A non-interactive overlay for theme animations
 * Sits above all content but doesn't block interactions or create scrolling
 * 
 * Themes can target this layer with CSS like:
 * .animation-layer-matrix { ... }
 * .animation-layer-retro { ... }
 */
export function AnimationLayer({ disabled = false }: { disabled?: boolean }) {
  const { definition, resolved } = useActiveTheme();
  const themeId = definition.id;
  const atmosphere = definition.effects.atmosphere;
  const motionDisabled = disabled || resolved.vars['--theme-motion-scale'] === '0';

  return (
    <div
      className={`animation-layer animation-layer-${themeId}`}
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1, // Behind app content but above background
        overflow: 'hidden',
        overscrollBehavior: 'none',
        willChange: 'transform, opacity',
      }}
    >
      {!motionDisabled && atmosphere === 'grid' && <MatrixRain />}
      {!motionDisabled && atmosphere === 'glow' && themeId === 'ember-dusk' && <FireAnimation />}
      {!motionDisabled && atmosphere === 'waves' && <OceanAnimation />}
      {!motionDisabled && atmosphere === 'glow' && themeId === 'graphite-night' && <NeonAnimation />}
    </div>
  );
}
