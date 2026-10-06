'use client'
import { createContext, useContext, useState, type ReactNode } from "react";

interface PageContextValue {
 page: number
 setPage: (page: number | ((current: number) => number)) => void
}

const PageContext = createContext<PageContextValue | undefined>(undefined);

export const PageProvider = ({ children }: { children?: ReactNode }) => {
 const [page, setPage] = useState(0);

 return (
 <PageContext.Provider value={{ page, setPage }}>
 {children}
 </PageContext.Provider>
 );
};

export const usePage = () => {
 const context = useContext(PageContext);
 if (!context) {
 throw new Error("usePage must be used within PageProvider");
 }
 return context;
};
