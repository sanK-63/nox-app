import React, { useState, useRef, useCallback } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({});
  const wrapperRef = useRef(null);

  const show = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pos = {};
    if (position === 'top') {
      pos.left = rect.left + rect.width / 2;
      pos.top = rect.top;
    }
    setStyle(pos);
    setVisible(true);
  }, [position]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div className="tooltip-box tooltip-top" style={{ left: style.left, top: style.top }}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
