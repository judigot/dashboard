import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./DevBubble.module.css";

interface IDevBubbleProps {
  /** URL to load in the fullscreen iframe (e.g. https://opencode.judigot.com) */
  url?: string;
  /** Title shown in the fullscreen header */
  title?: string;
}

interface IPosition {
  x: number;
  y: number;
}

export function DevBubble({
  url = "https://opencode.judigot.com",
  title = "OpenCode",
}: IDevBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<IPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<IPosition>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  /* Initialize position to bottom-right corner */
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 84,
        y: window.innerHeight - 84,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isOpen) {
        return;
      }
      setIsDragging(true);
      setHasDragged(false);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [isOpen, position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      setHasDragged(true);
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 60, e.clientX - dragStart.x),
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 60, e.clientY - dragStart.y),
      );
      setPosition({ x: newX, y: newY });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isOpen) {
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        setIsDragging(true);
        setHasDragged(false);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
      }
    },
    [isOpen, position],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) {
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        setHasDragged(true);
        const newX = Math.max(
          0,
          Math.min(window.innerWidth - 60, touch.clientX - dragStart.x),
        );
        const newY = Math.max(
          0,
          Math.min(window.innerHeight - 60, touch.clientY - dragStart.y),
        );
        setPosition({ x: newX, y: newY });
      }
    },
    [isDragging, dragStart],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleClick = () => {
    if (!hasDragged) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={styles.container}>
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>{title}</span>
            <button
              className={styles.minimizeButton}
              onClick={() => {
                setIsOpen(false);
              }}
              aria-label={`Minimize ${title}`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M19 13H5v-2h14v2z" />
              </svg>
            </button>
          </div>
          <iframe
            src={url}
            className={styles.iframe}
            title={title}
            allow="clipboard-read; clipboard-write; microphone"
          />
        </div>
      )}

      {!isOpen && (
        <button
          ref={bubbleRef}
          className={`${styles.bubble} ${isDragging ? styles.dragging : ""}`}
          style={{
            left: `${String(position.x)}px`,
            top: `${String(position.y)}px`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          aria-label={`Open ${title}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="28"
            height="28"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        </button>
      )}
    </div>
  );
}
