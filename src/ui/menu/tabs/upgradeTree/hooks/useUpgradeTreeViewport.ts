import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { Layout, Vec2, Viewport } from '../upgradeTreeTypes';
import { clamp } from '../utils/math';
import type { UpgradeId } from '../../../../../progression/upgrades';

type DragState = { pointerId: number; lastClient: Vec2 };

export function useUpgradeTreeViewport(args: {
    wrapRef: RefObject<HTMLDivElement | null>;
    layout: Layout;
    savedViewport: Viewport | null;
    setSavedViewport: (v: Viewport) => void;
}) {
    const { wrapRef, layout, savedViewport, setSavedViewport } = args;

    const [viewport, setViewport] = useState<Viewport>(savedViewport ?? { tx: 0, ty: 0, scale: 1 });
    const viewportRef = useRef<Viewport>(savedViewport ?? { tx: 0, ty: 0, scale: 1 });
    const didAutoInitRef = useRef<boolean>(savedViewport != null);
    const wheelSaveTimerRef = useRef<number | null>(null);

    // Pointer move events can arrive faster than React renders. If we store drag state in useState,
    // the handler can observe stale `drag.lastClient`, causing accumulated deltas (jerky + "too fast" pan).
    // Keep drag state in a ref so it's updated synchronously per event.
    const dragRef = useRef<DragState | null>(null);

    // If we already have a saved camera, restore it (e.g. after leaving the run back to menu).
    useEffect(() => {
        if (!savedViewport) return;
        didAutoInitRef.current = true;
        viewportRef.current = savedViewport;
        setViewport(savedViewport);
    }, [savedViewport?.tx, savedViewport?.ty, savedViewport?.scale]);

    // Keep ref in sync so event handlers always see latest viewport without relying on functional updaters.
    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport.tx, viewport.ty, viewport.scale]);

    const commitViewportLocal = (next: Viewport) => {
        const cur = viewportRef.current;
        if (cur.tx === next.tx && cur.ty === next.ty && cur.scale === next.scale) return;
        viewportRef.current = next;
        setViewport(next);
    };

    const saveViewport = (next: Viewport) => {
        setSavedViewport(next);
    };

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const resize = () => {
            const rect = el.getBoundingClientRect();

            // Center root as the main hub; fallback to layout bounds center if missing.
            const hubId: UpgradeId = 'weapon_damage';
            const hub = layout.nodeCenter[hubId] ?? {
                x: (layout.bounds.minX + layout.bounds.maxX) / 2,
                y: (layout.bounds.minY + layout.bounds.maxY) / 2
            };

            const targetScale = 1;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const tx = cx - hub.x * targetScale;
            const ty = cy - hub.y * targetScale;

            // Important: do NOT recenter if user already positioned the camera.
            // This prevents viewport reset when the layout container size changes (e.g. after purchase message appears).
            if (savedViewport) return;
            // ResizeObserver can fire multiple times during initial layout; only auto-center once per mount
            // (until we have a saved viewport).
            if (didAutoInitRef.current) return;
            const next = { tx, ty, scale: targetScale };
            didAutoInitRef.current = true;
            commitViewportLocal(next);
            saveViewport(next);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        return () => ro.disconnect();
    }, [
        layout.bounds.maxX,
        layout.bounds.maxY,
        layout.bounds.minX,
        layout.bounds.minY,
        layout.nodeCenter,
        savedViewport,
        setSavedViewport,
        wrapRef
    ]);

    // IMPORTANT: React attaches 'wheel' listeners as passive, so calling preventDefault inside onWheel
    // triggers "Unable to preventDefault inside passive event listener". We attach a native listener
    // with { passive: false } to support smooth zoom without page scroll.
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const onWheelNative = (e: globalThis.WheelEvent) => {
            e.preventDefault();

            const rect = el.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            const v = viewportRef.current;
            const zoomIntensity = 0.0012;
            const factor = Math.exp(-e.deltaY * zoomIntensity);
            const nextScale = clamp(v.scale * factor, 0.45, 2.6);

            // Zoom around cursor.
            const wx = (sx - v.tx) / v.scale;
            const wy = (sy - v.ty) / v.scale;
            const nextTx = sx - wx * nextScale;
            const nextTy = sy - wy * nextScale;
            const next = { tx: nextTx, ty: nextTy, scale: nextScale };
            commitViewportLocal(next);

            // Persist with a small debounce to avoid hammering the global store on every wheel tick.
            if (wheelSaveTimerRef.current != null) window.clearTimeout(wheelSaveTimerRef.current);
            wheelSaveTimerRef.current = window.setTimeout(() => {
                wheelSaveTimerRef.current = null;
                saveViewport(viewportRef.current);
            }, 120);
        };

        el.addEventListener('wheel', onWheelNative, { passive: false });
        return () => {
            el.removeEventListener('wheel', onWheelNative);
            if (wheelSaveTimerRef.current != null) window.clearTimeout(wheelSaveTimerRef.current);
            wheelSaveTimerRef.current = null;
        };
    }, [wrapRef]);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        // Pan with LMB or RMB.
        if (e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        dragRef.current = { pointerId: e.pointerId, lastClient: { x: e.clientX, y: e.clientY } };
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (e.pointerId !== drag.pointerId) return;
        e.preventDefault();
        const next = { x: e.clientX, y: e.clientY };
        const dx = next.x - drag.lastClient.x;
        const dy = next.y - drag.lastClient.y;
        drag.lastClient = next;
        const v = viewportRef.current;
        commitViewportLocal({ ...v, tx: v.tx + dx, ty: v.ty + dy });
    };

    const onPointerUpOrCancel = () => {
        dragRef.current = null;
        // Persist only once after drag ends (prevents React nested updates during pointermove).
        saveViewport(viewportRef.current);
    };

    return {
        viewport,
        onPointerDown,
        onPointerMove,
        onPointerUpOrCancel
    };
}


