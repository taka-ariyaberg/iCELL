import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

type NumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const WRAPPER_STYLE_KEYS = [
  'width',
  'minWidth',
  'maxWidth',
  'flex',
  'flexBasis',
  'flexGrow',
  'flexShrink',
] as const;

function splitStyles(style?: React.CSSProperties) {
  if (!style) {
    return {
      inputStyle: undefined,
      wrapperStyle: undefined,
    };
  }

  const inputStyle: React.CSSProperties = { ...style };
  const wrapperStyle: React.CSSProperties = {};

  WRAPPER_STYLE_KEYS.forEach((key) => {
    const value = inputStyle[key];
    if (value !== undefined) {
      wrapperStyle[key] = value;
      delete inputStyle[key];
    }
  });

  return { inputStyle, wrapperStyle };
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    className,
    disabled,
    id,
    name,
    readOnly,
    style,
    ...rest
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => {
    if (!inputRef.current) {
      throw new Error('NumberInput ref is not available.');
    }
    return inputRef.current;
  }, []);

  const { inputStyle, wrapperStyle } = useMemo(() => splitStyles(style), [style]);

  const mergedInputStyle = useMemo<React.CSSProperties | undefined>(() => {
    return {
      ...(inputStyle ?? {}),
      paddingRight: '2.4rem',
    };
  }, [inputStyle]);

  const dispatchInputEvent = () => {
    const input = inputRef.current;
    if (!input) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };

  const handleStep = (direction: 'up' | 'down') => {
    const input = inputRef.current;
    if (!input || disabled || readOnly) return;

    if (direction === 'up') {
      input.stepUp();
    } else {
      input.stepDown();
    }

    dispatchInputEvent();
  };

  const fieldName = name || id || 'value';

  return (
    <span
      className="number-input-wrapper"
      style={wrapperStyle}
    >
      <input
        {...rest}
        ref={inputRef}
        id={id}
        name={name}
        type="number"
        disabled={disabled}
        readOnly={readOnly}
        className={['number-input-field', className].filter(Boolean).join(' ')}
        style={mergedInputStyle}
      />
      <span className="number-input-steppers">
        <button
          type="button"
          className="number-input-step number-input-step-up"
          aria-label={`Increase ${fieldName}`}
          disabled={disabled || readOnly}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleStep('up')}
        >
          ▲
        </button>
        <button
          type="button"
          className="number-input-step number-input-step-down"
          aria-label={`Decrease ${fieldName}`}
          disabled={disabled || readOnly}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleStep('down')}
        >
          ▼
        </button>
      </span>
    </span>
  );
});
