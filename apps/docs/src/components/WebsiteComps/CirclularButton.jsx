'use client'
import React, { useRef } from 'react';
import Link from 'next/link';


export default function CircularButton({
    href = "/",
    type = "button",
    variant,
    children,
    className = "",
    iconClassName = "group-hover:text-black",
    fill = "",
    menuSocial = false,
    bgColor,
    onClick,
    ...rest
}) {
    const spanRef = useRef(null);
    const Icon = variant ? SOCIAL_ICONS[variant] : null;

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (spanRef.current) {
            spanRef.current.style.left = `${x}px`;
            spanRef.current.style.top = `${y}px`;
            spanRef.current.style.transform = "translate(-50%, -50%) scale(1)";
        }
    };

    const handleMouseLeave = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (spanRef.current) {
            spanRef.current.style.left = `${x}px`;
            spanRef.current.style.top = `${y}px`;
            spanRef.current.style.transform = "translate(-50%, -50%) scale(0)";
        }
    };

    const sharedClassName = `
     overflow-hidden socials cursor-pointer relative border border-white w-fit h-fit group duration-500 ease-in-out flex items-center justify-center ${menuSocial ? "menusocials" : "hover:border-[#ff5f00]"
        } ${className}`;

    const innerContent = (
        <>
            <span
                ref={spanRef}
                className="absolute aspect-square rounded-full pointer-events-none"
                style={{
                    width: "350%",
                    transform: "translate(-50%, -50%) scale(0)",
                    transition: "transform 0.3s ease",
                    backgroundColor: bgColor ?? (menuSocial ? "#ffffff" : "#ff5f00"),
                }}
            />
            <span className="relative z-2 flex items-center justify-center ">
                {Icon ? <Icon className={iconClassName} fill={fill} /> : children}
            </span>
        </>
    );

    if (onClick) {
        return (
            <button
                type={type}
                className={sharedClassName}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
                {...rest}
            >
                {innerContent}
            </button>
        );
    }

    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={sharedClassName}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...rest}
        >
            {innerContent}
        </Link>
    );
}
