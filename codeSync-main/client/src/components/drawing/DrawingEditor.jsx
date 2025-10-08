import useAppContext from "@/hooks/useAppContext"
import useSocket from "@/hooks/useSocket"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import ACTIONS from "@/utils/actions"
import { useCallback, useEffect } from "react"
import { Tldraw, useEditor } from "tldraw"

function DrawingEditor() {
    const { isMobile } = useWindowDimensions()

    return (
        <div className="relative w-full h-full">
            <Tldraw
                inferDarkMode
                forceMobile={isMobile}
                defaultName="Editor"
                className="z-0"
            >
                <ReachEditor />
            </Tldraw>
            <CanvasControls />
        </div>
    )
}

// Minimal controls component
function CanvasControls() {
    const editor = useEditor()

    const clearCanvas = () => {
        editor.clear()
    }

    const undo = () => {
        editor.undo()
    }

    const redo = () => {
        editor.redo()
    }

    return (
        <div className="absolute top-4 left-4 flex gap-2 bg-white p-2 rounded shadow">
            <button onClick={undo} className="px-2 py-1 bg-gray-200 rounded">Undo</button>
            <button onClick={redo} className="px-2 py-1 bg-gray-200 rounded">Redo</button>
            <button onClick={clearCanvas} className="px-2 py-1 bg-red-200 rounded">Clear</button>
            <span className="ml-2 text-sm text-gray-700">
                Shapes: {Object.keys(editor.store?.document?.pages?.[editor.store.currentPageId]?.shapes || {}).length}
            </span>
        </div>
    )
}

function ReachEditor() {
    const editor = useEditor()
    const { drawingData, setDrawingData } = useAppContext()
    const { socket } = useSocket()

    const handleChangeEvent = useCallback(
        (change) => {
            const snapshot = change.changes
            setDrawingData(editor.store.getSnapshot())
            socket.emit(ACTIONS.DRAWING_UPDATE, { snapshot })
        },
        [editor.store, setDrawingData, socket],
    )

    const handleRemoteDrawing = useCallback(
        ({ snapshot }) => {
            editor.store.mergeRemoteChanges(() => {
                const { added, updated, removed } = snapshot

                for (const record of Object.values(added)) editor.store.put([record])
                for (const [, to] of Object.values(updated)) editor.store.put([to])
                for (const record of Object.values(removed)) editor.store.remove([record.id])
            })

            setDrawingData(editor.store.getSnapshot())
        },
        [editor.store, setDrawingData],
    )

    useEffect(() => {
        if (drawingData && Object.keys(drawingData).length > 0) {
            editor.store.loadSnapshot(drawingData)
        }
    }, [])

    useEffect(() => {
        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            source: "user",
            scope: "document",
        })
        socket.on(ACTIONS.DRAWING_UPDATE, handleRemoteDrawing)

        return () => {
            cleanupFunction()
            socket.off(ACTIONS.DRAWING_UPDATE)
        }
    }, [drawingData, editor.store, handleChangeEvent, handleRemoteDrawing, socket])

    return null
}

export default DrawingEditor
