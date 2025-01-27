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
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [runProcess, setRunProcess] = useState(null);

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
        }
        );
    };

    function addCollaborators() {
        axios.put('/projects/add-user', {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        })
            .then(res => {
                console.log(res.data)
                setIsModalOpen(false)
            }).catch(err => {
                console.log(err)
            }
            )
    }

    const send = () => {
        sendMessage('project-message', {
            message,
            sender: user
        });

        setMessages(prevMessages => [...prevMessages, { sender: user, message }]);

        setMessage('');
    }

    function WriteAiMessage(message) {
        const messageObject = JSON.parse(message);
        return (
            <div className='overflow-auto bg-slate-950 rounded p-2 text-white'>
                <Markdown
                    children={messageObject.text}
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
            console.log(data)
            const message = JSON.parse(data.message);

            console.log(message);

            webContainer?.mount(message.fileTree);

            if (message.fileTree) {
                setFileTree(message.fileTree);
            }

            setMessages(prevMessages => [...prevMessages, data]);
        });

        axios.get(`/projects/get-project/${location.state.project._id}`)
            .then(res => {
                // console.log(res.data.project)
                setProject(res.data.project)
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

    return (
        <main className='h-screen w-screen flex'>
            <section className="left relative flex flex-col h-screen min-w-80 bg-slate-300">
                <header className='flex justify-between items-center p-2 px-4 w-full bg-slate-100 rounded-b-md absolute top-0'>
                    <button className='flex gap-2' onClick={() => setIsModalOpen(true)}>
                        <i className='ri-add-fill mr-1'></i>
                        <p>Add Collaborator</p>
                    </button>
                    <button
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        className='p-2'>
                        <i className='ri-group-fill'></i>
                    </button>
                </header>

                <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">
                    <div
                        ref={messageBox}
                        className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-thin scrollbar-thumb-slate-600 scrollbar-hide">

                        {messages.map((msg, index) => (
                            <div key={index} className={`${msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'} ${msg.sender._id == user._id.toString() && 'ml-auto'} message  flex flex-col p-2 bg-slate-50 w-fit rounded-md`}>
                                <small className='opacity-65 text-xs'>{msg.sender.email}</small>
                                <p className='text-sm'>
                                    {msg.sender._id === 'ai' ?
                                        WriteAiMessage(msg.message)
                                        :
                                        msg.message
                                    }
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="input-field w-full flex absolute bottom-0">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className='p-2 px-4 border-none rounded-tl-md outline-none flex-grow'
                            type="text" placeholder='Enter message' />
                        <button
                            onClick={send}
                            className=' px-5 bg-slate-950 rounded-tr-md text-white'>
                            <i className='ri-send-plane-fill'></i>
                        </button>
                    </div>
                </div>

                <div className={`sidePanel flex flex-col gap-2 w-full h-full bg-slate-50 absolute transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0`}>
                    <header className='flex justify-between items-center p-2 px-4 bg-slate-200'>
                        <h1 className='font-semibold'>Collaborators</h1>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='p-2'
                        >
                            <i className='ri-close-fill'></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2">
                        {project.users && project.users.map(user => {
                            return (
                                <div key={user._id} className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
                                    <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className='ri-user-fill absolute'></i>
                                    </div>

                                    <h1 className='font-semibold text-[17px]'>{user.email}</h1>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className='right bg-red-50 flex flex-grow h-full'>
                <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
                    <div className="file-tree p-2 w-full">
                        {
                            Object.keys(fileTree).map((file, index) => (
                                <button
                                    onClick={() => {
                                        setCurrentFile(file)
                                        setOpenFiles([...new Set([...openFiles, file])])
                                    }}
                                    key={index} className='file p-2 flex w-full px-4 mb-1 rounded font-semibold bg-slate-300 cursor-pointer'>
                                    <p className='font-semibold text-lg'>{file}</p>
                                </button>
                            ))
                        }

                    </div>
                </div>

                <div className="code-editor flex flex-col flex-grow h-full">

                    <div className="top flex justify-between w-full">

                        <div className="files flex">
                            {
                                openFiles.map((file, index) => (
                                    <button
                                        onClick={() => setCurrentFile(file)}
                                        key={index}
                                        className={`open-file p-2 flex w-fit px-4 font-semibold bg-slate-300 cursor-pointer ${currentFile === file ? 'bg-slate-400' : ''}`}>
                                        <p className='font-semibold text-lg'>{file}</p>
                                    </button>
                                ))
                            }
                        </div>

                        <div className="actions flex gap-2">
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
                                }
                                }
                                className='p-2 px-4 bg-slate-300 rounded-md text-white'
                            >
                                run
                            </button>
                        </div>

                    </div>
                    <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
                        {
                            fileTree[currentFile] && (
                                <div className='code-editor-area h-full overflow-auto flex-grow bg-slate-50'>
                                    <pre className='hljs h-full'>
                                        <code className='hljs h-full outline-none'
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

                                                saveFileTree(ft)
                                            }}
                                            dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value }}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                paddingBottom: '25rem',
                                                counterSet: 'line-numbering'
                                            }}
                                        ></code>
                                    </pre>
                                </div>
                            )
                        }
                    </div>
                </div>

                {
                    iframeUrl && webContainer &&
                    (
                        <div className='flex flex-col h-full min-w-96'>
                            <div className="address-bar">
                                <input type='text'
                                    onChange={(e) => setIframeUrl(e.target.value)}
                                    value={iframeUrl}
                                    className='w-full p-2 px-4 bg-slate-400'></input>
                            </div>
                            <iframe src={iframeUrl} className='h-full w-full'></iframe>
                        </div>
                    )
                }

            </section>


            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold'>Select User</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2'>
                                <i className='ri-close-fill'></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-1 mb-16 max-h-96 overflow-auto">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserClick(user._id)}
                                    className={`user cursor-pointer hover:bg-slate-200 ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-slate-200' : ''} p-2 flex gap-2 items-center`}
                                >
                                    <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className='ri-user-fill absolute'></i>
                                    </div>
                                    <h1 className='font-semibold text-base'>{user.email}</h1>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white py-2 px-4 rounded-md'>
                            Add Collaborators
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}
export default Project