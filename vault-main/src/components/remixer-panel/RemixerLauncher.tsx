"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useDragControls, useSpring } from "motion/react";
import { ChevronDown, GripVertical } from "lucide-react";
import RemixerPanel from "./RemixerPanel";
import styles from "./remixer-panel.module.css";
import type { RemixerLauncherProps } from "./types";

export const remixerPanelTransition = {
  duration: 0.45,
  ease: [0.62, 0.05, 0.01, 0.99] as const,
};

const VIEWPORT_MARGIN = 16;
const TOP_LIMIT_RATIO = 0.1;

export default function RemixerLauncher({
  groups,
  values,
  onChange,
  onCopyCode,
  onReset,
  defaultOpenGroupId,
  buttonLabel = "Customize",
  buttonClassName = "",
  panelClassName = "",
  panelInnerClassName = "",
  containerClassName = "",
}: RemixerLauncherProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  // const [isHidden, setIsHidden] = useState(false);
  const [dragConstraints, setDragConstraints] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  const groupRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const dragX = useSpring(0, { stiffness: 520, damping: 42, mass: 0.55 });
  const dragY = useSpring(0, { stiffness: 520, damping: 42, mass: 0.55 });

  useEffect(() => {
    const updateDragConstraints = () => {
      const groupRect = groupRef.current?.getBoundingClientRect();
      const groupWidth = groupRect?.width ?? 0;
      const groupHeight = groupRect?.height ?? 0;
      const topOffset = window.innerHeight * TOP_LIMIT_RATIO;

      setDragConstraints({
        top: 0,
        right: 0,
        bottom: Math.max(0, window.innerHeight - topOffset - groupHeight - VIEWPORT_MARGIN),
        left: -Math.max(0, window.innerWidth - groupWidth - VIEWPORT_MARGIN),
      });
    };

    updateDragConstraints();
    window.addEventListener("resize", updateDragConstraints);

    return () => window.removeEventListener("resize", updateDragConstraints);
  }, []);

  // if (isHidden) return null;

  return (
    <div className={`${styles.launcherLayer} ${containerClassName}`}>
      <motion.div
        ref={groupRef}
        className={styles.launcherGroup}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragConstraints}
        style={{ x: dragX, y: dragY }}
      >
        <div className={styles.launcherRow}>
          <button
            type="button"
            className={styles.dragHandle}
            onPointerDown={(event) => dragControls.start(event.nativeEvent)}
            aria-label="Move controls panel"
          >
            <GripVertical className={styles.dragHandleIcon} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className={`${styles.launcherButton} ${buttonClassName}`}
            aria-expanded={isExpanded}
          >
            <span className={styles.launcherButtonText}>{buttonLabel}</span>
            <ChevronDown
              className={`${styles.launcherChevron} ${isExpanded ? styles.launcherChevronOpen : ""}`}
              aria-hidden="true"
            />
          </button>

          {/* <button
              type="button"
              onClick={() => setIsHidden(true)}
              className={styles.launcherDismissButton}
              aria-label="Hide remixer controls"
            >
              <X className={styles.launcherDismissIcon} />
            </button> */}
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : -10,
          }}
          transition={{
            height: {
              ...remixerPanelTransition,
              duration: isExpanded ? 0.48 : 0.32,
            },
            opacity: {
              duration: isExpanded ? 0.2 : 0.16,
              ease: "easeOut",
            },
            y: {
              ...remixerPanelTransition,
              duration: isExpanded ? 0.48 : 0.32,
            },
          }}
          style={{ transformOrigin: "top" }}
          className={`${styles.launcherPanel} ${styles.hideScrollbar} ${isExpanded ? styles.launcherPanelOpen : ""} ${panelClassName}`}
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          <motion.div
            initial={false}
            animate={{
              y: 0,
            }}
            transition={{
              ...remixerPanelTransition,
              duration: isExpanded ? 0.48 : 0.32,
            }}
            className={`${styles.launcherPanelInner} ${panelInnerClassName}`}
          >
            <RemixerPanel
              isExpanded={isExpanded}
              groups={groups}
              values={values}
              onChange={onChange}
              onCopyCode={onCopyCode}
              onReset={onReset}
              defaultOpenGroupId={defaultOpenGroupId}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
