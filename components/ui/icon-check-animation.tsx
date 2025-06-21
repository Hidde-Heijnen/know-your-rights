import React, { useEffect, useState } from "react";

import type { LucideIcon } from "lucide-react";
import { type Variants, motion } from "motion/react";

const checkVariant: Variants = {
  default: { pathLength: 0, opacity: 0 },
  active: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: 0.2, type: "spring", duration: 0.6, bounce: 0 },
      opacity: { delay: 0.2, duration: 0.01 },
    },
  },
};

const blinkVariant: Variants = {
  default: { pathLength: 0, opacity: 0, pathOffset: 1 },
  active: {
    pathLength: [1, 0],
    pathOffset: 0,
    opacity: [1, 0],
    transition: {
      pathLength: { delay: 0.1, type: "spring", duration: 0.6, bounce: 0 },
      pathOffset: { delay: 0.1, type: "spring", duration: 0.6, bounce: 0 },
      opacity: { delay: 0.6, duration: 0.2 },
    },
  },
};

const iconVariant: Variants = {
  default: {
    scale: 1,
    transition: { delay: 0.2, type: "spring", duration: 0.6 },
  },
  active: { scale: 0, transition: { type: "spring", duration: 0.6 } },
};

export function useCopyAnimation(
  text: string,
  duration = 3000
): [boolean, () => void] {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isCopied, duration]);

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
    });
  };

  return [isCopied, copy];
}

const blinkPaths = [
  "M12 0.75V6.25",
  "M12 23.25V17.75",
  "M2.2572 17.625L7.02034 14.875",
  "M2.2572 6.375L7.02034 9.125",
  "M21.7427 6.37501L16.9796 9.12501",
  "M21.7427 17.625L16.9796 14.875",
];

export interface IconCheckAnimationProps
  extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  isActive: boolean;
}

const IconCheckAnimation = React.forwardRef<
  HTMLDivElement,
  IconCheckAnimationProps
>(({ icon: Icon, isActive, className, ...props }, ref) => {
  return (
    <div
      className="relative flex items-center justify-center"
      {...props}
      ref={ref}
    >
      <motion.div
        className="absolute size-4"
        variants={iconVariant}
        initial="default"
        animate={isActive ? "active" : "default"}
      >
        <Icon strokeWidth={1.5} className="absolute size-4" />
      </motion.div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Copy Icon</title>
        <motion.path
          d="M6.75 12.75L9.9999 16.25L17.25 6.75"
          strokeWidth="1.5"
          variants={checkVariant}
          initial="default"
          animate={isActive ? "active" : "default"}
        />
        {/* Animate each "boom" path with a delay */}
        {blinkPaths.map((d, index) => (
          <motion.path
            key={index}
            d={d}
            strokeWidth={1.5}
            variants={blinkVariant}
            initial="default"
            animate={isActive ? "active" : "default"}
          />
        ))}
      </svg>
    </div>
  );
});
IconCheckAnimation.displayName = "CopyButton";

export default IconCheckAnimation;
