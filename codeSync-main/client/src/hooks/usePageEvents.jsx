import { useEffect } from "react"
import useSetting from "./useSetting"


const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24
const FONT_SIZE_STEP = 1


function usePageEvents() {
    const { fontSize, setFontSize } = useSetting()


    useEffect(() => {
        const beforeUnloadHandler = (event) => {
            const confirmationMessage = "Changes you made may not be saved"
            event.returnValue = confirmationMessage
            return confirmationMessage
        }

        window.addEventListener("beforeunload", beforeUnloadHandler)
        
      
        return () => {
            window.removeEventListener("beforeunload", beforeUnloadHandler)
        }
    }, [])

    useEffect(() => {
        const handleWheelEvent = (event) => {
          
            if (!event.ctrlKey) return
            
        
            event.preventDefault()
            
       
            if (!event.target.closest(".cm-editor")) return

            const isScrollingDown = event.deltaY > 0
            const newFontSize = isScrollingDown 
                ? Math.max(fontSize - FONT_SIZE_STEP, MIN_FONT_SIZE)
                : Math.min(fontSize + FONT_SIZE_STEP, MAX_FONT_SIZE)
            
            setFontSize(newFontSize)
        }

      
        window.addEventListener("wheel", handleWheelEvent, { passive: false })
        
        
        return () => {
            window.removeEventListener("wheel", handleWheelEvent)
        }
    }, [fontSize, setFontSize])
}

export default usePageEvents