'use client'

import React, { useState, useRef, useEffect, useId } from 'react'

const TOPICS = [
    { value: 'consultation', label: 'General Consultation' },
    { value: 'implants', label: 'Dental Implants' },
    { value: 'whitening', label: 'Teeth Whitening' },
    { value: 'orthodontics', label: 'Orthodontics & Aligners' },
    { value: 'restorative', label: 'Restorative Care' },
    { value: 'emergency', label: 'Emergency Dental' },
]

const COUNTRIES = [
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+1', flag: '🇺🇸', name: 'United States' },
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+65', flag: '🇸🇬', name: 'Singapore' },
]

export default function ContactForm() {
    const uid = useId().replace(/:/g, '')
    const nameId = `oris-name-${uid}`
    const emailId = `oris-email-${uid}`
    const phoneId = `oris-phone-${uid}`
    const topicId = `oris-topic-${uid}`
    const messageId = `oris-message-${uid}`

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        countryCode: '+91',
        phone: '',
        topic: '',
        message: '',
        terms: false,
    })

    const [countryOpen, setCountryOpen] = useState(false)
    const [topicOpen, setTopicOpen] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const countryRef = useRef<HTMLDivElement | null>(null)
    const topicRef = useRef<HTMLDivElement | null>(null)

    const selectedCountry =
        COUNTRIES.find((c) => c.code === formData.countryCode) || COUNTRIES[0]
    const selectedTopic = TOPICS.find((t) => t.value === formData.topic)

    // Outside click handlers
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
                setCountryOpen(false)
            }
            if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
                setTopicOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const [focused, setFocused] = useState<Record<string, boolean>>({})

    const handleFocus = (field: string) => {
        setFocused((prev) => ({ ...prev, [field]: true }))
    }

    const handleBlur = (field: string) => {
        setFocused((prev) => ({ ...prev, [field]: false }))
    }

    const validate = () => {
        const errs: Record<string, string> = {}
        if (!formData.name.trim()) errs.name = 'Name is required'
        if (!formData.email.trim()) {
            errs.email = 'Business Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errs.email = 'Please enter a valid email address'
        }
        if (!formData.phone.trim()) {
            errs.phone = 'Phone number is required'
        } else if (formData.phone.replace(/\D/g, '').length < 6) {
            errs.phone = 'Please enter a valid phone number'
        }
        if (!formData.topic) errs.topic = 'Please select a topic'
        if (!formData.terms) errs.terms = 'You must agree to the Terms'

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 800))
        setLoading(false)
        setSuccess(true)
        console.log('Oris Dental form submitted:', formData)
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#3365e2] flex items-center justify-center mb-4">
                    <svg
                        className="w-7 h-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h4 className="text-[1.5vw] max-md:text-xl font-medium text-oris-secondary">
                    Request Received
                </h4>
                <p className="text-gray-500 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] mt-2 max-w-xs">
                    Our care coordinator will call you back within 15 minutes to confirm your 3D scan consultation.
                </p>
                <button
                    onClick={() => {
                        setSuccess(false)
                        setFormData({
                            name: '',
                            email: '',
                            countryCode: '+91',
                            phone: '',
                            topic: '',
                            message: '',
                            terms: false,
                        })
                    }}
                    className="mt-6 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-[#3365e2] underline font-medium cursor-pointer"
                >
                    Send another request
                </button>
            </div>
        )
    }

    const isNameActive = Boolean(focused.name || formData.name)
    const isEmailActive = Boolean(focused.email || formData.email)
    const isPhoneActive = Boolean(focused.phone || formData.phone)
    const isTopicActive = Boolean(topicOpen || formData.topic)
    const isMessageActive = Boolean(focused.message || formData.message)

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            {/* Name Field */}
            <div className="w-full">
                <div className="relative w-full">
                    <label
                        htmlFor={nameId}
                        className={`absolute left-3 transition-all duration-200 z-10 pointer-events-none px-1 bg-white ${isNameActive
                                ? `top-0 -translate-y-1/2 text-xs font-medium ${focused.name ? 'text-[#3365e2]' : 'text-gray-700'}`
                                : 'top-1/2 -translate-y-1/2 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700'
                            }`}
                    >
                        Name*
                    </label>
                    <input
                        id={nameId}
                        type="text"
                        value={formData.name}
                        onFocus={() => handleFocus('name')}
                        onBlur={() => handleBlur('name')}
                        onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value })
                            if (errors.name) setErrors({ ...errors, name: '' })
                        }}
                        className={`w-full border rounded-md bg-white h-13 pl-4 pr-4 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-800 outline-none transition-all ${errors.name
                                ? 'border-red-400 focus:border-red-400'
                                : focused.name
                                    ? 'border-[#3365e2]'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                    />
                </div>
                {errors.name && <p className="mt-1 ml-3 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div className="w-full">
                <div className="relative w-full">
                    <label
                        htmlFor={emailId}
                        className={`absolute left-3 transition-all duration-200 z-10 pointer-events-none px-1 bg-white ${isEmailActive
                                ? `top-0 -translate-y-1/2 text-xs font-medium ${focused.email ? 'text-[#3365e2]' : 'text-gray-700'}`
                                : 'top-1/2 -translate-y-1/2 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700'
                            }`}
                    >
                        Business Email*
                    </label>
                    <input
                        id={emailId}
                        type="email"
                        value={formData.email}
                        onFocus={() => handleFocus('email')}
                        onBlur={() => handleBlur('email')}
                        onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value })
                            if (errors.email) setErrors({ ...errors, email: '' })
                        }}
                        className={`w-full border rounded-md bg-white h-13 pl-4 pr-4 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-800 outline-none transition-all ${errors.email
                                ? 'border-red-400 focus:border-red-400'
                                : focused.email
                                    ? 'border-[#3365e2]'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                    />
                </div>
                {errors.email && <p className="mt-1 ml-3 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Phone Field */}
            <div className="w-full">
                <div
                    className={`flex items-center w-full border rounded-md bg-white h-13 transition-all relative ${errors.phone
                            ? 'border-red-400'
                            : focused.phone
                                ? 'border-[#3365e2]'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                >
                    {/* Country select */}
                    <div className="relative shrink-0" ref={countryRef}>
                        <button
                            type="button"
                            onClick={() => setCountryOpen(!countryOpen)}
                            className="flex items-center gap-1.5 px-3 h-13 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700 transition cursor-pointer bg-transparent"
                        >
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span className="text-xs font-medium text-gray-600">{selectedCountry.code}</span>
                            <svg
                                className={`w-3.5 h-3.5 text-gray-700 transition-transform duration-200 ${countryOpen ? 'rotate-180 text-[#3365e2]' : ''
                                    }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {countryOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-xl z-50 py-1">
                                {COUNTRIES.map((c) => (
                                    <button
                                        type="button"
                                        key={c.code}
                                        onClick={() => {
                                            setFormData({ ...formData, countryCode: c.code })
                                            setCountryOpen(false)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-blue-50 text-gray-700 transition cursor-pointer"
                                    >
                                        <span>{c.flag}</span>
                                        <span className="font-medium">{c.code}</span>
                                        <span className="text-gray-500 truncate">{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-6 bg-gray-200 shrink-0" />

                    {/* Phone input & Floating Label */}
                    <div className="relative flex-1 h-full flex items-center">
                        <label
                            htmlFor={phoneId}
                            className={`absolute left-3 transition-all duration-200 z-10 pointer-events-none px-1 bg-white ${isPhoneActive
                                    ? `top-0 -translate-y-1/2 text-xs font-medium ${focused.phone ? 'text-[#3365e2]' : 'text-gray-700'}`
                                    : 'top-1/2 -translate-y-1/2 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700'
                                }`}
                        >
                            Phone*
                        </label>
                        <input
                            id={phoneId}
                            type="tel"
                            value={formData.phone}
                            onFocus={() => handleFocus('phone')}
                            onBlur={() => handleBlur('phone')}
                            onChange={(e) => {
                                setFormData({ ...formData, phone: e.target.value })
                                if (errors.phone) setErrors({ ...errors, phone: '' })
                            }}
                            className="w-full h-full px-3 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-800 outline-none bg-transparent rounded-r-md"
                        />
                    </div>
                </div>
                {errors.phone && <p className="mt-1 ml-3 text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Topic Select Field */}
            <div className="w-full" ref={topicRef}>
                <div className="relative w-full">
                    {/* Floating Label */}
                    <span
                        className={`absolute left-3 transition-all duration-200 px-1 bg-white z-10 pointer-events-none ${isTopicActive
                                ? `top-0 -translate-y-1/2 text-xs font-medium ${topicOpen ? 'text-[#3365e2]' : 'text-gray-700'}`
                                : 'top-1/2 -translate-y-1/2 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700'
                            }`}
                    >
                        Topic*
                    </span>

                    <button
                        id={topicId}
                        type="button"
                        onClick={() => setTopicOpen(!topicOpen)}
                        className={`w-full border rounded-md bg-white h-13 pl-4 pr-10 text-left text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] outline-none transition-all cursor-pointer flex items-center ${errors.topic
                                ? 'border-red-400'
                                : topicOpen
                                    ? 'border-[#3365e2]'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <span className={formData.topic ? 'text-gray-800 font-normal' : 'opacity-0'}>
                            {selectedTopic?.label || 'Topic*'}
                        </span>
                    </button>

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700">
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${topicOpen ? 'rotate-180 text-[#3365e2]' : ''
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>

                    {topicOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl z-50 py-1 overflow-hidden">
                            {TOPICS.map((topic) => (
                                <button
                                    key={topic.value}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, topic: topic.value })
                                        setTopicOpen(false)
                                        if (errors.topic) setErrors({ ...errors, topic: '' })
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] transition-all hover:bg-gray-50 cursor-pointer ${formData.topic === topic.value
                                            ? 'bg-blue-50/70 text-[#3365e2] font-medium'
                                            : 'text-gray-700'
                                        }`}
                                >
                                    {topic.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {errors.topic && <p className="mt-1 ml-3 text-xs text-red-500">{errors.topic}</p>}
            </div>

            {/* Message Field */}
            <div className="w-full">
                <div className="relative w-full">
                    <label
                        htmlFor={messageId}
                        className={`absolute left-3 transition-all duration-200 z-10 pointer-events-none px-1 bg-white ${isMessageActive
                                ? `top-0 -translate-y-1/2 text-xs font-medium ${focused.message ? 'text-[#3365e2]' : 'text-gray-700'}`
                                : 'top-4 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-700'
                            }`}
                    >
                        Your message
                    </label>
                    <textarea
                        id={messageId}
                        rows={4}
                        value={formData.message}
                        onFocus={() => handleFocus('message')}
                        onBlur={() => handleBlur('message')}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className={`w-full border rounded-md bg-white pt-3.5 pb-3 pl-4 pr-4 text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] text-gray-800 outline-none transition-all resize-none ${focused.message
                                ? 'border-[#3365e2]'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    />
                </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-1">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={formData.terms}
                        onClick={() => {
                            const next = !formData.terms
                            setFormData({ ...formData, terms: next })
                            if (errors.terms) setErrors({ ...errors, terms: '' })
                        }}
                        className={`shrink-0 w-4 h-4 rounded-full border transition-all duration-200 flex items-center justify-center cursor-pointer ${formData.terms
                            ? 'bg-[#3365e2] border-[#3365e2]'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        {formData.terms && (
                            <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                className="w-2.5 h-2.5"
                            >
                                <path
                                    d="M2.5 6l2.5 2.5 4.5-4.5"
                                    stroke="white"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        )}
                    </button>
                    <span
                        onClick={() => {
                            const next = !formData.terms
                            setFormData({ ...formData, terms: next })
                            if (errors.terms) setErrors({ ...errors, terms: '' })
                        }}
                        className="text-xs text-gray-600 cursor-pointer select-none"
                    >
                        I agree to the{' '}
                        <a
                            href="#"
                            onClick={(e) => e.stopPropagation()}
                            className="underline text-oris-secondary hover:text-black"
                        >
                            Terms
                        </a>
                        .
                    </span>
                </div>
                {errors.terms && <p className="mt-1 ml-1 text-xs text-red-500">{errors.terms}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center bg-[#3365e2] hover:bg-[#2853be] text-white text-sm max-[1025px]:text-[2vw] max-md:text-[4vw] font-medium px-8 py-3.5 rounded-full transition-all duration-300 cursor-pointer hover:scale-[0.98] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed "
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Sending...
                        </span>
                    ) : (
                        'Send Message'
                    )}
                </button>
            </div>
        </form>
    )
}
