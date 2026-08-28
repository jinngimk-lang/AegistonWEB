'use client';

/**
 * 截图灯箱（spec §10.2）。
 *
 * 使用原生 `<dialog>` + `showModal()`：**自带 focus trap 与 Esc 关闭**，
 * 不需要自己实现一套焦点管理。
 * 支持 `←/→` 在同一产品的截图之间切换；移动端支持捏合缩放
 * （`touch-action: pinch-zoom`），桌面端 Ctrl + 滚轮缩放。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import styles from '@/components/media/Lightbox.module.css';
import type { MediaAsset } from '@/types/content';

interface Props {
  items: MediaAsset[];
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function Lightbox({ items, index, onClose, onNavigate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const open = index !== null;
  const current = index !== null ? items[index] : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    setZoom(1);
  }, [open, index]);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next < 0 || next >= items.length) return;
      onNavigate(next);
    },
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!current) {
    return <dialog ref={dialogRef} className={styles.dialog} aria-label="截图预览" />;
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="截图预览"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.shell}>
        <div className={styles.bar}>
          <span className={styles.counter}>
            {(index ?? 0) + 1} / {items.length}
          </span>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.ctrl}
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.25).toFixed(2))))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="缩小"
            >
              −
            </button>
            <button
              type="button"
              className={styles.ctrl}
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.25).toFixed(2))))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="放大"
            >
              +
            </button>
            <button
              type="button"
              className={styles.ctrl}
              onClick={() => go(-1)}
              disabled={(index ?? 0) === 0}
              aria-label="上一张"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.ctrl}
              onClick={() => go(1)}
              disabled={(index ?? 0) >= items.length - 1}
              aria-label="下一张"
            >
              →
            </button>
            <button type="button" className={styles.ctrl} onClick={onClose} aria-label="关闭预览">
              ✕
            </button>
          </div>
        </div>

        <div
          className={styles.stage}
          onWheel={(event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            setZoom((z) =>
              Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z - event.deltaY / 500).toFixed(2)))),
            );
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        <p className={styles.caption}>{current.caption ?? current.alt}</p>
      </div>
    </dialog>
  );
}
