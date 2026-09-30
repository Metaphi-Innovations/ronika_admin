import React, { useState, useRef, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerStyle?: React.CSSProperties;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = 'admin-form-input', style, containerStyle, disabled, ...props }, ref) => {
    const [isToggled, setIsToggled] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const pressStartTimeRef = useRef<number>(0);
    const wasHoldRef = useRef<boolean>(false);

    // Visible if either toggled on OR currently held down
    const isVisible = isToggled || isHolding;

    const startHold = useCallback(() => {
      if (disabled) return;
      pressStartTimeRef.current = Date.now();
      wasHoldRef.current = false;
      setIsHolding(true);
    }, [disabled]);

    const endHold = useCallback(() => {
      if (disabled) return;
      const duration = Date.now() - pressStartTimeRef.current;
      if (duration > 200) {
        // Considered a hold if held for more than 200ms
        wasHoldRef.current = true;
      }
      setIsHolding(false);
    }, [disabled]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;

        // If it was a press-and-hold release, don't toggle state again
        if (wasHoldRef.current) {
          wasHoldRef.current = false;
          return;
        }

        // Quick click toggles visibility
        setIsToggled((prev) => !prev);
      },
      [disabled]
    );

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          ...containerStyle,
        }}
      >
        <input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          className={className}
          disabled={disabled}
          style={{
            paddingRight: '2.5rem',
            width: '100%',
            ...style,
          }}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          title={isVisible ? 'Hide password' : 'Show password (click or hold to view)'}
          onClick={handleClick}
          onMouseDown={(e) => {
            e.preventDefault(); // Keep focus in the input
            startHold();
          }}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onTouchCancel={endHold}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: isVisible ? 'var(--admin-primary, #111111)' : 'var(--admin-text-muted, #888888)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            userSelect: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
