import useFileSystem from "@/hooks/useFileSystem"
import useTab from "@/hooks/useTabs"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { getIconClassName } from "@/utils/getIconClassName"
import { Icon } from "@iconify/react"
import { useRef, useState } from "react"
import { MdDelete } from "react-icons/md"
import { PiPencilSimpleFill } from "react-icons/pi"
import FileEditor from "./FileEditor"

function FileSystem() {
    const filesContentRef = useRef(null)
    const { files, currentFile, openFile, deleteFile, createFile } = useFileSystem()
    const [editingFileId, setEditingFileId] = useState(null)
    const { setIsSidebarOpen } = useTab()
    const { isMobile } = useWindowDimensions()

    const handleRenameFile = (e, id) => {
        e.stopPropagation()
        setEditingFileId(id)
    }

    const handleCreateNewFile = () => {
        const id = createFile("Untitled")
        setEditingFileId(id)
    }

    const handleDeleteFile = (e, id, name) => {
        e.stopPropagation()
        const isConfirmed = confirm(`Are you sure you want to delete ${name} file?`)
        if (isConfirmed) {
            deleteFile(id)
        }
    }

    const handleFileClick = (id) => {
        setEditingFileId(null)
        openFile(id)
        if (isMobile) {
            setIsSidebarOpen(false)
        }
    }

    const fileSelectedClass = (id) => {
        if (currentFile !== null && currentFile.id === id) {
            return "bg-darkHover border-l-4 border-primary"
        }
        return ""
    }

    return (
        <>
            <div className="pb-2 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Files ({files.length})</h1>
                {/* Small info icon added for future use, no logic impact */}
                <span className="text-sm text-gray-400 italic">
                    {/* Optional: quick hint */}
                    Manage your files
                </span>
            </div>

            <div
                className="max-h-[70%] min-h-[200px] flex-grow overflow-auto pl-4 pr-2 sm:min-h-0"
                onClick={(e) => e.stopPropagation()}
                ref={filesContentRef}
            >
                {files.map((file) =>
                    editingFileId !== file.id ? (
                        <div
                            key={file.id}
                            className={
                                "mb-2 flex items-center rounded-md p-2 transition-all hover:scale-[1.01] hover:bg-darkHover/90 " +
                                fileSelectedClass(file.id)
                            }
                            onClick={() => handleFileClick(file.id)}
                            title="Click to open file"
                        >
                            <Icon
                                icon={getIconClassName(file.name)}
                                fontSize={22}
                                className="mr-2 text-primary"
                            />
                            <p className="line-clamp-1 flex-grow cursor-pointer" title={file.name}>
                                {file.name}
                            </p>
                            <span className="flex gap-3">
                                <button
                                    onClick={(e) => handleRenameFile(e, file.id)}
                                    title="Rename file"
                                    className="text-blue-400 hover:text-blue-300 transition"
                                >
                                    <PiPencilSimpleFill size={17} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteFile(e, file.id, file.name)}
                                    className="text-danger hover:text-red-400 transition"
                                    title="Delete file"
                                >
                                    <MdDelete size={20} />
                                </button>
                            </span>
                        </div>
                    ) : (
                        <FileEditor
                            key={file.id}
                            editingFileId={editingFileId}
                            setEditingFileId={setEditingFileId}
                            name={file.name}
                        />
                    ),
                )}
            </div>

            <button
                className="my-2 flex w-full justify-center rounded-md bg-primary p-2 font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                onClick={handleCreateNewFile}
                title="Create a new file"
            >
                + New File
            </button>
        </>
    )
}

export default FileSystem
