import { createContext, useEffect, useState } from "react"
import PropTypes from "prop-types"
import useLocalStorage from "@/hooks/useLocalStorage"

const SettingContext = createContext()

const defaultSettings = {
    theme: "Dracula",
    language: "Javascript",
    fontSize: "16",
    fontFamily: "Space Mono",
    showGitHubCorner: true,
    showLineNumbers: true,
}

function SettingContextProvider({ children }) {
    const { getItem } = useLocalStorage()
    const storedSettings = JSON.parse(getItem("settings")) || {}
    const storedTheme =
        storedSettings.theme !== undefined
            ? storedSettings.theme
            : defaultSettings.theme
    const storedLanguage =
        storedSettings.language !== undefined
            ? storedSettings.language
            : defaultSettings.language
    const storedFontSize =
        storedSettings.fontSize !== undefined
            ? storedSettings.fontSize
            : defaultSettings.fontSize
    const storedFontFamily =
        storedSettings.fontFamily !== undefined
            ? storedSettings.fontFamily
            : defaultSettings.fontFamily
    const storedShowLineNumbers =
        storedSettings.showLineNumbers !== undefined
            ? storedSettings.showLineNumbers
            : defaultSettings.showLineNumbers

    // Separate state variables for each setting
    const [theme, setTheme] = useState(storedTheme)
    const [language, setLanguage] = useState(storedLanguage)
    const [fontSize, setFontSize] = useState(storedFontSize)
    const [fontFamily, setFontFamily] = useState(storedFontFamily)
    const [showLineNumbers, setShowLineNumbers] = useState(storedShowLineNumbers)


    const resetSettings = () => {
        setTheme(defaultSettings.theme)
        setLanguage(defaultSettings.language)
        setFontSize(defaultSettings.fontSize)
        setFontFamily(defaultSettings.fontFamily)
        setShowLineNumbers(defaultSettings.showLineNumbers)
    }

    useEffect(() => {
        // Save settings to local storage whenever they change
        const updatedSettings = {
            theme,
            language,
            fontSize,
            fontFamily,
            showLineNumbers,
        }
        localStorage.setItem("settings", JSON.stringify(updatedSettings))
    }, [theme, language, fontSize, fontFamily, showLineNumbers])

    return (
        <SettingContext.Provider
            value={{
                theme,
                setTheme,
                language,
                setLanguage,
                fontSize,
                setFontSize,
                fontFamily,
                setFontFamily,
                showLineNumbers,
                setShowLineNumbers,
                resetSettings,
            }}
        >
            {children}
        </SettingContext.Provider>
    )
}

SettingContextProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export { SettingContextProvider }
export default SettingContext