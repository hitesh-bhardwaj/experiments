import re

with open('apps/docs/src/components/LandpageV2/Tension.jsx', 'r') as f:
    content = f.read()

# 1. Add import motion
content = content.replace('import React from "react";', 'import React from "react";\nimport { motion } from "framer-motion";')

# 2. Rename MotionIcon to RawIcon
content = content.replace('const MotionIcon = ({ type }) => {', 'const RawIcon = ({ type }) => {')

# 3. Replace <svg ...> with <g> inside RawIcon
svg_pattern = r'<svg viewBox="0 0 64 64" className="size-\[7vw\] max-md:size-10 max-sm:size-9">'
content = content.replace(svg_pattern, '<g>')
content = content.replace('</svg>', '</g>')

# 4. Add new MotionIcon definition before `const cards =`
new_motion_icon = """
const MotionIcon = ({ type }) => {
  const raw = RawIcon({ type });
  const children = raw ? raw.props.children : [];
  
  return (
    <motion.svg 
      viewBox="0 0 64 64" 
      className="size-[7vw] max-md:size-10 max-sm:size-9 origin-center overflow-visible"
      variants={{
        initial: { rotate: 0 },
        hover: { rotate: 90, scale: 1.1, transition: { type: "spring", stiffness: 200, damping: 15 } }
      }}
    >
      {React.Children.map(children, (child, i) => {
        if (child && child.type === 'rect') {
          return (
            <motion.rect 
              key={i}
              {...child.props} 
              variants={{
                initial: { rx: 0, scale: 1 },
                hover: { 
                  rx: 4, 
                  scale: 0.5, 
                  transition: { type: "spring", stiffness: 300, damping: 12, delay: i * 0.02 } 
                }
              }} 
              style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
            />
          );
        }
        return child;
      })}
    </motion.svg>
  );
};
"""
content = content.replace('const cards = [', new_motion_icon + '\nconst cards = [')

# 5. Make the card a motion.div
card_pattern = r'<div\n              key={card\.title}\n              className="flex'
new_card = r'<motion.div\n              key={card.title}\n              whileHover="hover"\n              initial="initial"\n              className="group cursor-pointer flex'
content = re.sub(card_pattern, new_card, content)
content = content.replace('</p>\n              </div>\n            </div>', '</p>\n              </div>\n            </motion.div>')

with open('apps/docs/src/components/LandpageV2/Tension.jsx', 'w') as f:
    f.write(content)

