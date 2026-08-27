import { useEffect, useId, useRef, useState } from 'react';

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

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
    // ensure menu collapses immediately after selection even if parent re-renders
    setOpen(false);
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        closeMenu();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
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

  // collapse popup as soon as value changes while open (covers parent-driven re-renders)
  useEffect(() => {
    if (open) {
      // keep menu open for keyboard nav, but ensure click path already closed via selectOption
      // no-op: value change alone should not reopen
    }
  }, [value, open]);

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
      // skip disabled
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

  return (
    <div
      ref={rootRef}
      className={`select-control select-control--${variant} ${open ? 'select-control--open' : ''} ${className}`.trim()}
    >
      <button
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

      <ul
        className={`select-menu ${open ? 'select-menu--open' : ''}`}
        role="listbox"
        aria-labelledby={selectId}
        tabIndex={-1}
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
