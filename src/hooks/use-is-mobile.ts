import { useEffect, useState } from "react"

export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  )

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handleChange = () => setIsMobile(query.matches)

    handleChange()
    query.addEventListener("change", handleChange)
    return () => query.removeEventListener("change", handleChange)
  }, [breakpoint])

  return isMobile
}
