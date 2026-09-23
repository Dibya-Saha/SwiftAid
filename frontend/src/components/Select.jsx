import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  id,
  className = '',
  variant = 'default',
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);

  const normalizedOptions = options.map((option) => (
    typeof option === 'string' ? { value: option, label: option } : { ...option }
  ));

  const selectedOption = normalizedOptions.find((option) => String(option.value) === String(value));
  const displayLabel = selectedOption?.label ?? placeholder;

  function emitChange(nextValue) {
    onChange?.({
      target: {
        value: String(nextValue),
      },
    });
  }

  function closeMenu() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function selectOption(option) {
    if (option.disabled) return;
    emitChange(String(option.value));
    setOpen(false);
    setActiveIndex(-1);
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    function positionMenu() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = rect.width;
      const maxHeight = variant === 'pill' ? 200 : 240;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const rowEstimate = variant === 'pill' ? 30 : 36;
      const openUp = spaceBelow < Math.min(maxHeight, 36 + normalizedOptions.length * rowEstimate) && spaceAbove > spaceBelow;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const next = {
        position: 'fixed',
        left,
        width,
        zIndex: 4000,
        maxHeight,
      };
      if (openUp) {
        next.bottom = window.innerHeight - rect.top + 6;
        next.top = 'auto';
      } else {
        next.top = rect.bottom + 6;
        next.bottom = 'auto';
      }
      setMenuStyle(next);
    }

    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open, variant, normalizedOptions.length, value]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleEscape(event) {
      if (event.key === 'Escape') closeMenu();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = normalizedOptions.findIndex((option) => String(option.value) === String(value));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, normalizedOptions, value]);

  function handleTriggerKeyDown(event) {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleListKeyDown(event) {
    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      let next = (activeIndex + 1) % normalizedOptions.length;
      for (let i = 0; i < normalizedOptions.length; i++) {
        if (!normalizedOptions[next]?.disabled) break;
        next = (next + 1) % normalizedOptions.length;
      }
      setActiveIndex(next);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      let prev = (activeIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
      for (let i = 0; i < normalizedOptions.length; i++) {
        if (!normalizedOptions[prev]?.disabled) break;
        prev = (prev - 1 + normalizedOptions.length) % normalizedOptions.length;
      }
      setActiveIndex(prev);
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const opt = normalizedOptions[activeIndex];
      if (opt && !opt.disabled) selectOption(opt);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
  }

  const isPlaceholder = !selectedOption;

  const menu = (
    <ul
      ref={menuRef}
      className={`select-menu select-menu--portal ${open ? 'select-menu--open' : ''} ${variant === 'pill' ? 'select-menu--pill' : ''}`.trim()}
      role="listbox"
      aria-labelledby={selectId}
      tabIndex={-1}
      style={menuStyle || undefined}
      onKeyDown={handleListKeyDown}
    >
      {normalizedOptions.map((option, index) => {
        const isSelected = String(option.value) === String(value);
        const isActive = index === activeIndex;
        const isDisabled = Boolean(option.disabled);

        return (
          <li
            key={`${option.value}-${option.label}`}
            role="option"
            aria-selected={isSelected}
            aria-disabled={isDisabled ? 'true' : undefined}
            className={`select-option ${isSelected ? 'select-option--selected' : ''} ${isActive ? 'select-option--active' : ''} ${isDisabled ? 'select-option--disabled' : ''}`}
            onMouseEnter={() => !isDisabled && setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!isDisabled) selectOption(option);
            }}
          >
            {option.label}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      ref={rootRef}
      className={`select-control select-control--${variant} ${open ? 'select-control--open' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`select-value ${isPlaceholder ? 'select-value--placeholder' : ''}`}>
          {displayLabel}
        </span>
        <span className="select-chevron"><ChevronIcon /></span>
      </button>

      {open && menuStyle && (typeof document !== 'undefined' ? createPortal(menu, document.body) : menu)}

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="select-native-fallback"
          value={value ?? ''}
          required
          onChange={() => {}}
        />
      )}
    </div>
  );
}
