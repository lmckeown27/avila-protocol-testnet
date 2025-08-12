import { useEffect, useState } from 'react';
import avilaLogo from '../assets/images/logos/Avilatokenlogo.jpg';

interface LogoAdaptiveProps {
  className?: string;
  alt?: string;
}

export function LogoAdaptive({ className = "w-8 h-8", alt = "Avila Protocol Logo" }: LogoAdaptiveProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for dark class on html element
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Create observer to watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <img 
      src={avilaLogo} 
      alt={alt} 
      className={className}
      style={{ 
        filter: isDark 
          ? 'contrast(300%) brightness(0) invert(1)'
          : 'contrast(1000%) brightness(1000%)',
        mixBlendMode: isDark ? 'screen' : 'multiply'
      }}
    />
  );
} 