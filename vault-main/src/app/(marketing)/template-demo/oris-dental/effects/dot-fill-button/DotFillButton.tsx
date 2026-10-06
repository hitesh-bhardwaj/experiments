'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'

interface DotFillButtonProps {
    text?: string
    href?: string
    className?: string
    onClick?: (e?: React.MouseEvent) => void
}

export default function DotFillButton({
    text = 'Book Appointment',
    href = '#oris-form',
    className = '',
    onClick,
}: DotFillButtonProps) {
    const textRef = useRef<HTMLSpanElement | null>(null)
    const [hovered, setHovered] = useState(false)

    useEffect(() => {
        const el = textRef.current
        if (!el) return

        el.innerHTML = ''
        const chars = text.split('')

        chars.forEach((char, index) => {
            const span = document.createElement('span')
            span.textContent = char
            span.style.display = 'inline-block'
            span.style.position = 'relative'
            span.style.textShadow = '0px 1.3em currentColor'
            span.style.transform = hovered
                ? 'translateY(-1.3em) rotate(0.001deg)'
                : 'translateY(0em) rotate(0.001deg)'
            span.style.transition = `transform 0.55s cubic-bezier(0.625, 0.05, 0, 1) ${index * 0.012}s, color 0.4s ease`
            span.style.willChange = 'transform'

            if (char === ' ') {
                span.style.whiteSpace = 'pre'
            }

            el.appendChild(span)
        })
    }, [text, hovered])

    return (
        <Link
            href={href}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`group relative inline-flex max-md:scale-100! items-center justify-center gap-[0.7vw] max-[1025px]:gap-2 rounded-full overflow-hidden whitespace-nowrap bg-[#3365e2] border border-[#3365e2] text-white select-none transition-colors duration-500 cursor-pointer pl-[1.8vw] pr-[1.5vw] py-[0.9vw] max-[1025px]:pl-5 max-[1025px]:pr-4 max-[1025px]:py-4 max-md:py-2 ${className}`}
            style={{
                color: hovered ? '#3365e2' : '#ffffff',
            }}
        >
            {/* Overflow-masked text container */}
            <span className="relative z-20 flex items-center overflow-hidden h-[1.3em] leading-[1.3] pointer-events-none">
                <span
                    ref={textRef}
                    className="relative inline-flex items-center leading-[1.3] font-medium"
                >
                    {text}
                </span>
            </span>

            {/* In-flow perfectly centered dot wrapper */}
            <span className="relative z-10 flex items-center justify-center w-[0.45vw] h-[0.45vw] max-[1025px]:w-2 max-[1025px]:h-2 pointer-events-none shrink-0">
                <span
                    aria-hidden="true"
                    className="w-full h-full rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] will-change-transform"
                    style={{
                        transform: hovered ? 'scale(120)' : 'scale(1)',
                    }}
                />
            </span>
        </Link>
    )
}
