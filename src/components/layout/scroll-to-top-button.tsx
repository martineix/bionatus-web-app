import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

const SCROLL_THRESHOLD = 300

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#006426] text-white shadow-lg transition-all hover:bg-[#00501e] dark:bg-[#7DD3A2] dark:text-slate-900 dark:hover:bg-[#6BC191] ${
        visible ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
