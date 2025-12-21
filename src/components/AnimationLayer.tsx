import { useSettingsStore } from '../store/settingsStore';
import { MatrixRain } from './MatrixRain';
import { FireAnimation } from './FireAnimation';
import { OceanAnimation } from './OceanAnimation';
import { NeonAnimation } from './NeonAnimation';
import { GlitchAnimation } from './GlitchAnimation';

/**
 * AnimationLayer - A non-interactive overlay for theme animations
 * Sits above all content but doesn't block interactions or create scrolling
 * 
 * Themes can target this layer with CSS like:
 * .animation-layer-matrix { ... }
 * .animation-layer-retro { ... }
 */
export function AnimationLayer() {
  const settings = useSettingsStore((state) => state.settings);
  const themeId = settings.appearance?.theme ?? 'light';

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
        willChange: 'transform, opacity', // Optimize for animations
      }}
    >
      {themeId === 'matrix' && <MatrixRain />}
      {themeId === 'fire' && <FireAnimation />}
      {themeId === 'ocean' && <OceanAnimation />}
      {themeId === 'neon' && <NeonAnimation />}
    </div>
  );
}
