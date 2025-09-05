import { useEffect } from "react"
import useSetting from "./useSetting"

// Constants for font size limits
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24
const FONT_SIZE_STEP = 1

/**
 * Custom hook for handling page-level events
 * - Prevents accidental page unload
 * - Handles Ctrl+scroll font size adjustment for code editor
 */
function usePageEvents() {
    const { fontSize, setFontSize } = useSetting()

    // Prevent user from accidentally leaving the page
    useEffect(() => {
        const beforeUnloadHandler = (event) => {
            const confirmationMessage = "Changes you made may not be saved"
            event.returnValue = confirmationMessage
            return confirmationMessage
        }

        window.addEventListener("beforeunload", beforeUnloadHandler)
        
        // Cleanup function
        return () => {
            window.removeEventListener("beforeunload", beforeUnloadHandler)
        }
    }, [])

    // Handle Ctrl+scroll for font size adjustment in code editor
    useEffect(() => {
        const handleWheelEvent = (event) => {
            // Only handle Ctrl+scroll events
            if (!event.ctrlKey) return
            
            // Prevent default browser zoom behavior
            event.preventDefault()
            
            // Only apply to code editor elements
            if (!event.target.closest(".cm-editor")) return

            // Calculate new font size based on scroll direction
            const isScrollingDown = event.deltaY > 0
            const newFontSize = isScrollingDown 
                ? Math.max(fontSize - FONT_SIZE_STEP, MIN_FONT_SIZE)
                : Math.min(fontSize + FONT_SIZE_STEP, MAX_FONT_SIZE)
            
            setFontSize(newFontSize)
        }

        // Add event listener with passive: false to allow preventDefault
        window.addEventListener("wheel", handleWheelEvent, { passive: false })
        
        // Cleanup function
        return () => {
            window.removeEventListener("wheel", handleWheelEvent)
        }
    }, [fontSize, setFontSize])
}

export default usePageEvents