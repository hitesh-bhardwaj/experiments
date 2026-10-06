import React from 'react'

/**
 * @param {{
 *   textColor?: string,
 *   className?: string,
 *   as?: string,
 * }} props
 */
const ScrollBottom = ({ textColor,
  className = 'bottom-[5%] gap-[1vw]',
  as = 'p'
}) => {
  return (
    <div className={`fixed left-1/2 z-10 -translate-x-1/2 ${textColor} flex flex-col justify-center items-center  ${className}`}>
      <as>Scroll</as>
      <svg
        width="20"
        height="28"
        className="size-[1.5vw] max-[1025px]:size-[3vw] max-md:size-[4vw]"
        viewBox="0 0 20 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
                  .chev1 { animation: fadeDown 1.4s ease-in-out infinite; }
                  .chev2 { animation: fadeDown 1.4s ease-in-out 0.22s infinite; }
                  .chev3 { animation: fadeDown 1.4s ease-in-out 0.44s infinite; }
                  @keyframes fadeDown {
                    0%   { opacity: 0.08; transform: translateY(-3px); }
                    50%  { opacity: 0.55; transform: translateY(2px); }
                    100% { opacity: 0.08; transform: translateY(-3px); }
                  }
                `}</style>
        <polyline
          className="chev1 stroke-current"
          points="2,2 10,9 18,2"
          stroke="white"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className="chev2 stroke-current"
          points="2,10 10,17 18,10"
          stroke="white"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className="chev3 stroke-current"
          points="2,18 10,25 18,18"
          stroke="white"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default ScrollBottom