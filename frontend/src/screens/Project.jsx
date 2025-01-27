/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-children-prop */
import React, { useState, useContext, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import { UserContext } from '../context/user.context'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js'
import 'highlight.js/styles/monokai.css'
import { getWebContainer } from '../config/webContainer';

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)
    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-')) {
            hljs.highlightElement(ref.current)
        }
    }, [props.className, props.children])
    return <code {...props} ref={ref} />
}

const Project = ({ navigate }) => {
    const location = useLocation();

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState([]);
    const [project, setProject] = useState(location.state.project);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [newFileModalOpen, setNewFileModalOpen] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [runProcess, setRunProcess] = useState(null);
    const [deleteFileModalOpen, setDeleteFileModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [renameFileModalOpen, setRenameFileModalOpen] = useState(false);
    const [fileToRename, setFileToRename] = useState(null);
    const [newFileNameForRename, setNewFileNameForRename] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);

    const { user } = useContext(UserContext);
    const messageBox = React.createRef();

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }
            return newSelectedUserId;
        });
    };

    function addCollaborators() {
        axios.put('/projects/add-user', {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        })
        .then(res => {
            console.log(res.data)
            setIsModalOpen(false)
        })
        .catch(err => console.log(err))
    }

    const send = () => {
        const messageData = JSON.stringify({ text: message }); // Wrap message in an object
        sendMessage('project-message', { message: messageData, sender: user });
        setMessages(prevMessages => [...prevMessages, { sender: user, message: messageData }]);
        setMessage('');
    }

    function WriteAiMessage(message) {
        try {
            const messageObject = JSON.parse(message);
            return (
                <div className='overflow-auto bg-slate-950 rounded p-2 text-white'>
                    <Markdown
                        children={messageObject.text || message}  // Fallback to original message if no text property
                        options={{
                            overrides: {
                                code: {
                                    component: SyntaxHighlightedCode
                                }
                            }
                        }}
                    />
                </div>
            )
        } catch (error) {
            // Fallback for non-JSON messages
            return (
                <div className='overflow-auto bg-slate-950 rounded p-2 text-white'>
                    {message}
                </div>
            )
        }
    }

    useEffect(() => {

        initializeSocket(project._id);

        if (!webContainer) {
            getWebContainer()
                .then(container => {
                    setWebContainer(container);
                    console.log("container started");

                }).catch(err => {
                    console.log(err)
                });

        }

        receiveMessage('project-message', data => {
            console.log(data);
            try {
                const message = JSON.parse(data.message);
                console.log(message);

                if (message.fileTree) {
                    setFileTree(message.fileTree);
                    webContainer?.mount(message.fileTree);
                }

                setMessages(prevMessages => [...prevMessages, data]);
            } catch (error) {
                // Handle non-JSON messages
                setMessages(prevMessages => [...prevMessages, {
                    ...data,
                    message: JSON.stringify({ text: data.message })
                }]);
            }
        });

        axios.get(`/projects/get-project/${location.state.project._id}`)
            .then(res => {
                setProject(res.data.project)
                setFileTree(res.data.project.fileTree)
            }).catch(err => {
                console.log(err)
            })

        axios.get('/users/all')
            .then(res => {
                setUsers(res.data.users)
            }).catch(err => {
                console.log(err)
            })
    }, []);

    function scrollToBottom() {
        messageBox.current.scrollTop = messageBox.current.scrollHeight;
    }

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        })
            .then(res => {
                console.log(res.data)
            }).catch(err => {
                console.log(err)
            })
    }

    const handleNewFile = () => {
        if (!newFileName.trim()) return;

        const newFileTree = {
            ...fileTree,
            [newFileName]: {
                file: {
                    contents: ''
                }
            }
        };

        setFileTree(newFileTree);
        saveFileTree(newFileTree);
        setNewFileModalOpen(false);
        setNewFileName('');
        setCurrentFile(newFileName);
        setOpenFiles([...new Set([...openFiles, newFileName])]);
    };

    const handleDeleteFile = (fileName, e) => {
        e.stopPropagation();
        setFileToDelete(fileName);
        setDeleteFileModalOpen(true);
    };

    const confirmDeleteFile = () => {
        const newFileTree = { ...fileTree };
        delete newFileTree[fileToDelete];
        setFileTree(newFileTree);
        saveFileTree(newFileTree);
        setOpenFiles(openFiles.filter(f => f !== fileToDelete));
        if (currentFile === fileToDelete) {
            setCurrentFile(null);
        }
        setDeleteFileModalOpen(false);
    };

    const handleRenameFile = (fileName, e) => {
        e.stopPropagation();
        setFileToRename(fileName);
        setNewFileNameForRename(fileName);
        setRenameFileModalOpen(true);
    };

    const confirmRenameFile = () => {
        if (!newFileNameForRename.trim() || newFileNameForRename === fileToRename) {
            setRenameFileModalOpen(false);
            return;
        }

        const newFileTree = { ...fileTree };
        newFileTree[newFileNameForRename] = newFileTree[fileToRename];
        delete newFileTree[fileToRename];
        setFileTree(newFileTree);
        saveFileTree(newFileTree);

        // Update open files
        setOpenFiles(openFiles.map(f => f === fileToRename ? newFileNameForRename : f));
        if (currentFile === fileToRename) {
            setCurrentFile(newFileNameForRename);
        }
        setRenameFileModalOpen(false);
    };

    const filteredFiles = Object.keys(fileTree).filter(file =>
        file.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleMessageChange = (e) => {
        const value = e.target.value;
        setMessage(value);
        setIsAiTyping(value.trim().startsWith('@ai'));
    };

    // Add this new function near your other handlers
    const closePreview = () => {
        setIframeUrl(null);
        if (runProcess) {
            runProcess.kill();
            setRunProcess(null);
        }
    };

    return (
        <main className='h-screen w-screen flex bg-gray-900'>
            <section className="left relative flex flex-col h-screen w-[400px] bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700/50">
                <header className='flex justify-between items-center p-4 w-full bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg'>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                            <i className="ri-robot-fill text-xl text-white animate-pulse"></i>
                        </div>
                        <div>
                            <h1 className='font-semibold text-white'>{project.name}</h1>
                            <p className='text-sm text-blue-400'>AI Assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className='px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 transition-all duration-200 group shadow-lg shadow-blue-500/20'
                        >
                            <i className='ri-user-add-line text-lg group-hover:scale-110 transition-transform'></i>
                            <span>Add</span>
                        </button>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 group'>
                            <i className='ri-group-line text-xl group-hover:scale-110 transition-transform'></i>
                        </button>
                    </div>
                </header>

                <div className="conversation-area flex-grow flex flex-col h-full relative">
                    <div ref={messageBox} 
                        className="message-box p-4 flex-grow flex flex-col gap-4 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {messages.map((msg, index) => (
                            <div key={index} 
                                className={`message-wrapper flex ${msg.sender._id === user._id.toString() ? 'justify-end' : 'justify-start'} 
                                animate-[fadeIn_0.3s_ease-out] opacity-0 [animation-fill-mode:forwards] [animation-delay:${index*0.1}s]`}>
                                <div className={`message max-w-[85%] ${msg.sender._id === 'ai' ? 'hover:shadow-xl hover:shadow-blue-500/5' : ''} 
                                    transition-all duration-300 group`}>
                                    <div className={`flex items-center gap-2 mb-1 ${msg.sender._id === user._id.toString() ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center 
                                            ${msg.sender._id === 'ai' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-700'}`}>
                                            <i className={`${msg.sender._id === 'ai' ? 'ri-robot-fill' : 'ri-user-fill'} 
                                                text-white text-sm ${msg.sender._id === 'ai' ? 'animate-pulse' : ''}`}></i>
                                        </div>
                                        <span className='text-xs text-gray-400'>{msg.sender.email}</span>
                                        <span className='text-xs text-gray-500'>
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className={`message-bubble rounded-2xl px-4 py-3 
                                        ${msg.sender._id === 'ai' 
                                            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 shadow-lg' 
                                            : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20'}`}>
                                        {msg.sender._id === 'ai' 
                                            ? <div className="prose prose-invert max-w-none">
                                                {WriteAiMessage(msg.message)}
                                              </div>
                                            : <p className='text-sm text-white'>
                                                {JSON.parse(msg.message).text || msg.message}
                                              </p>
                                        }
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {message && (
                            <div className="typing-indicator flex gap-1 items-center text-xs text-gray-400 p-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.3s]"></span>
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                                <span>{isAiTyping ? "AI is thinking..." : "User is typing..."}</span>
                            </div>
                        )}
                    </div>

                    <div className="input-field w-full p-4 bg-gradient-to-t from-gray-800 to-gray-900 border-t border-gray-700/50">
                        <div className="flex gap-2 items-center bg-gray-800/50 rounded-xl p-1 shadow-lg backdrop-blur-sm">
                            <input
                                value={message}
                                onChange={handleMessageChange}
                                onKeyDown={(e) => e.key === 'Enter' && send()}
                                className='p-2 px-3 flex-grow bg-transparent text-white placeholder-gray-400 outline-none text-sm'
                                type="text" 
                                placeholder='Type @ai to ask AI, or just type to chat...' 
                            />
                            <button
                                onClick={send}
                                className='p-2 hover:bg-white/10 rounded-lg text-blue-400 hover:text-blue-300 transition-all duration-200 group'>
                                <i className='ri-send-plane-fill text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`sidePanel flex flex-col gap-2 w-full h-full bg-gray-800 absolute transition-all duration-300 ease-in-out 
                    ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0 z-20`}>
                    <header className='flex justify-between items-center p-2 px-4 bg-gray-700'>
                        <h1 className='font-semibold text-white'>Collaborators</h1>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='p-2 text-gray-200 hover:text-white transition-colors duration-200'
                        >
                            <i className='ri-close-fill'></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2 p-2">
                        {project.users && project.users.map(user => (
                            <div key={user._id} className="user cursor-pointer hover:bg-gray-700 transition-colors duration-200 p-3 flex gap-2 items-center rounded-md">
                                <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-gray-600'>
                                    <i className='ri-user-fill absolute'></i>
                                </div>
                                <h1 className='font-semibold text-gray-200'>{user.email}</h1>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className='right flex flex-grow h-full bg-gray-900'>
                <div className="explorer h-full w-64 bg-gray-800 border border-gray-700 flex flex-col">
                    <div className="explorer-header p-3 border-b border-gray-700 flex items-center justify-between">
                        <h2 className="text-gray-200 font-medium text-sm">PROJECT EXPLORER</h2>
                        <div className="flex gap-2">
                            <button
                                className="p-1 text-gray-400 hover:text-gray-200 rounded"
                                title="New File"
                                onClick={() => setNewFileModalOpen(true)}>
                                <i className="ri-add-line"></i>
                            </button>
                        </div>
                    </div>

                    <div className="file-tree p-2 overflow-y-auto flex-grow">
                        <div className="search-box px-2 mb-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search files"
                                    className="w-full bg-gray-700 text-gray-200 text-sm rounded py-1.5 px-3 pl-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <i className="ri-search-line absolute left-2.5 top-2 text-gray-400"></i>
                            </div>
                        </div>

                        <div className="files space-y-0.5">
                            {filteredFiles.map((file, index) => {
                                const extension = file.split('.').pop();
                                const getFileIcon = (ext) => {
                                    switch (ext) {
                                        case 'js': return 'ri-javascript-line';
                                        case 'jsx': return 'ri-reactjs-line';
                                        case 'css': return 'ri-css3-line';
                                        case 'html': return 'ri-html5-line';
                                        case 'json': return 'ri-braces-line';
                                        default: return 'ri-file-text-line';
                                    }
                                };

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setCurrentFile(file);
                                            setOpenFiles([...new Set([...openFiles, file])]);
                                        }}
                                        className={`file w-full px-3 py-1.5 rounded-md flex items-center gap-2 text-sm
                                            ${currentFile === file
                                                ? 'bg-gray-700 text-white'
                                                : 'text-gray-300 hover:bg-gray-700/50'}
                                            transition-colors duration-150 group`}
                                    >
                                        <i className={`${getFileIcon(extension)} text-lg ${extension === 'js' ? 'text-yellow-500' :
                                            extension === 'jsx' ? 'text-blue-400' :
                                                extension === 'css' ? 'text-blue-500' :
                                                    extension === 'html' ? 'text-orange-500' :
                                                        'text-gray-400'
                                            }`}></i>
                                        <span className="truncate flex">{file}</span>
                                        <div className="hidden group-hover:flex ml-auto gap-1">
                                            <button
                                                onClick={(e) => handleRenameFile(file, e)}
                                                className="p-1 hover:text-blue-400"
                                                title="Rename"
                                            >
                                                <i className="ri-edit-line"></i>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteFile(file, e)}
                                                className="p-1 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <i className="ri-delete-bin-line"></i>
                                            </button>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>


                </div>

                <div className="code-editor flex flex-col flex-grow h-full">
                    <div className="top flex justify-between w-full bg-gray-800 border-b border-gray-700">
                        <div className="files flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            {openFiles.map((file, index) => (
                                <div key={index} className="flex items-center">
                                    <button
                                        onClick={() => setCurrentFile(file)}
                                        className={`open-file py-2 px-4 flex items-center gap-2 font-medium text-sm
                                            ${currentFile === file
                                                ? 'bg-gray-700 text-white'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}>
                                        <i className="ri-file-code-line"></i>
                                        <span>{file}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenFiles(openFiles.filter(f => f !== file));
                                                if (currentFile === file) {
                                                    setCurrentFile(openFiles[0]);
                                                }
                                            }}
                                            className="ml-2 hover:text-red-400">
                                            <i className="ri-close-line"></i>
                                        </button>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="actions flex gap-2 p-2">
                            <button
                                onClick={async () => {
                                    await webContainer.mount(fileTree);

                                    const installProcess = await webContainer.spawn("npm", ["install"]);

                                    installProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk)
                                        }
                                    }))

                                    if (runProcess) {
                                        runProcess.kill();
                                    }

                                    let tempRunProcess = await webContainer.spawn("npm", ["start"]);


                                    tempRunProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk);
                                        }
                                    })
                                    )

                                    setRunProcess(tempRunProcess);

                                    webContainer.on('server-ready', (port, url) => {
                                        console.log(port, url)
                                        setIframeUrl(url)
                                    })
                                }}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
                            >
                                <i className="ri-play-fill"></i>
                                Run Project
                            </button>
                        </div>
                    </div>

                    <div className="bottom flex flex-grow max-w-full shrink overflow-hidden">
                        {fileTree[currentFile] ? (
                            <div className='code-editor-area h-full w-full overflow-auto bg-gray-900 relative'>
                                <div className="flex">
                                    <div className="line-numbers px-4 py-4 text-right bg-gray-800 text-gray-500 select-none font-mono">
                                        {fileTree[currentFile].file.contents.split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <pre className='hljs h-full flex-1'>
                                        <code
                                            className='hljs h-full outline-none p-4 block'
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                const updatedContent = e.target.innerText;
                                                const ft = {
                                                    ...fileTree,
                                                    [currentFile]: {
                                                        ...fileTree[currentFile],
                                                        file: {
                                                            ...fileTree[currentFile].file,
                                                            contents: updatedContent
                                                        }
                                                    }
                                                }
                                                setFileTree(ft);
                                                saveFileTree(ft);
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: hljs.highlight(
                                                    currentFile.split('.').pop(),
                                                    fileTree[currentFile].file.contents
                                                ).value
                                            }}
                                        />
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full w-full bg-gray-900 text-gray-400">
                                <div className="text-center">
                                    <i className="ri-file-code-line text-4xl mb-2"></i>
                                    <p>Select a file to edit</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {iframeUrl && webContainer && (
                    <div className='flex flex-col h-full min-w-96 bg-gray-800 border-l border-gray-700'>
                        <div className="browser-header bg-gray-800 border-b border-gray-700 p-2">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="window-controls flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="browser-tabs flex-1">
                                        <div className="tab bg-gray-700 text-gray-300 text-sm px-3 py-1 rounded-t-md inline-flex items-center gap-2">
                                            <i className="ri-chrome-fill"></i>
                                            Preview
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={closePreview}
                                    className="p-1 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-all duration-200"
                                    title="Close preview"
                                >
                                    <i className="ri-close-line text-lg"></i>
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <div className="browser-controls flex gap-1">
                                    <button className="p-1.5 text-gray-400 hover:text-gray-200 rounded">
                                        <i className="ri-arrow-left-line"></i>
                                    </button>
                                    <button className="p-1.5 text-gray-400 hover:text-gray-200 rounded">
                                        <i className="ri-arrow-right-line"></i>
                                    </button>
                                    <button
                                        onClick={() => setIframeUrl(iframeUrl)}
                                        className="p-1.5 text-gray-400 hover:text-gray-200 rounded">
                                        <i className="ri-refresh-line"></i>
                                    </button>
                                </div>
                                <div className="address-bar flex-1 flex items-center bg-gray-700 rounded px-2">
                                    <i className="ri-lock-line text-green-500 mr-2"></i>
                                    <input
                                        type='text'
                                        onChange={(e) => setIframeUrl(e.target.value)}
                                        value={iframeUrl}
                                        className='w-full p-1.5 bg-transparent text-gray-200 text-sm focus:outline-none'
                                    />
                                </div>
                                <button
                                    onClick={() => window.open(iframeUrl, '_blank')}
                                    className="p-1.5 text-gray-400 hover:text-gray-200 rounded"
                                    title="Open in new window">
                                    <i className="ri-external-link-line"></i>
                                </button>
                            </div>
                        </div>
                        <div className="iframe-container flex-1 bg-white relative">
                            <iframe
                                src={iframeUrl}
                                className='h-full w-full'
                                title="Preview"
                            />

                        </div>
                    </div>
                )}

            </section>


            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center animate-fadeIn">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full relative shadow-xl animate-scaleIn">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold text-white'>Select User</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2 text-gray-300 hover:text-white transition-colors duration-200'>
                                <i className='ri-close-fill'></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserClick(user._id)}
                                    className={`user cursor-pointer transition-colors duration-200 
                                    ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-gray-600' : 'hover:bg-gray-700'} 
                                    p-3 flex gap-2 items-center rounded-md`}
                                >
                                    <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-gray-600'>
                                        <i className='ri-user-fill absolute'></i>
                                    </div>
                                    <h1 className='font-semibold text-gray-200'>{user.email}</h1>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white py-2 px-6 rounded-md'>
                            Add Collaborators
                        </button>
                    </div>
                </div>
            )}

            {newFileModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center animate-fadeIn">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full shadow-xl animate-scaleIn">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold text-white'>New File</h2>
                            <button
                                onClick={() => setNewFileModalOpen(false)}
                                className='p-2 text-gray-300 hover:text-white transition-colors duration-200'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            placeholder="Enter file name (e.g., index.js)"
                            className="w-full bg-gray-700 text-gray-200 rounded p-2 mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleNewFile()}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setNewFileModalOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white">
                                Cancel
                            </button>
                            <button
                                onClick={handleNewFile}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteFileModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center animate-fadeIn">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full shadow-xl animate-scaleIn">
                        <h2 className="text-xl font-semibold text-white mb-4">Delete File</h2>
                        <p className="text-gray-300 mb-4">Are you sure you want to delete &quot;{fileToDelete}&quot;?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteFileModalOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteFile}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {renameFileModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center animate-fadeIn">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full shadow-xl animate-scaleIn">
                        <h2 className="text-xl font-semibold text-white mb-4">Rename File</h2>
                        <input
                            type="text"
                            value={newFileNameForRename}
                            onChange={(e) => setNewFileNameForRename(e.target.value)}
                            className="w-full bg-gray-700 text-gray-200 rounded p-2 mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && confirmRenameFile()}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setRenameFileModalOpen(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRenameFile}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project