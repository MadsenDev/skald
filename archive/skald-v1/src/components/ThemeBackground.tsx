import { useActiveTheme } from '../themes/useTheme';

export function ThemeBackground() {
  const { definition } = useActiveTheme();

  return (
    <div className="theme-background" aria-hidden="true">
      <div
        className="theme-background__base"
        style={{
          backgroundImage: definition.effects.gradients.join(', '),
        }}
      />
      <div className="theme-background__noise" />
      <div className="theme-background__vignette" />
    </div>
  );
}
