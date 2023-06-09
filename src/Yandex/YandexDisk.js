import React, { useState, useEffect } from 'react';
import {Table, Button, Modal, Form, Input} from "antd";
import axios from 'axios';
import './YandexDisk.css'

const CLIENT_ID = '78ad47808eea40c298e21e0a0549a123';
const CLIENT_SECRET = '92820d6c2d6c4eb58cc48c2c5381e4e4';
const REDIRECT_URI = 'http://localhost:3000';
const SCOPE = 'cloud_api:disk.read cloud_api:disk.write';
const BASE_URL = "https://cloud-api.yandex.net/v1/disk/resources";
const UPLOAD_URL = "https://cloud-api.yandex.net/v1/disk/resources/upload";

export default function YandexDisk({allSigned,setSign, setInfo, fileToUpload, setFileToUpload, toUpload, setToUpload, fileToGet, setFileToGet, setFileToSend, searchQuery, canService}) {
    const [code, setCode] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState('');
    const [newNameModalVisible, setNewNameModalVisible] = useState(false);
    const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
    const [uploadFileModalVisible, setUploadFileModalVisible] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [newFolderForm] = Form.useForm();
    const [newNameForm] = Form.useForm();
    const [uploadFileForm] = Form.useForm();
    const [newNameRecord, setNewNameRecord] = useState(null);
    const [sizeInfo, setSizeInfo] = useState(null);
    // const [searchQuery, setSearchQuery] = useState('');
    const [searchFiles, setSearchFiles] = useState([]);

    useEffect(() => {
        if(code){
            handleGetAccessToken(code);
        }
    },[code])
    useEffect(() => {
        if(fileToUpload && toUpload){
            handleGlobalUpload();
        }
    },[fileToUpload,toUpload])
    useEffect(() => {
        if(fileToGet){
            handleGetFromGoogle();
        }
    },[fileToGet])
    useEffect(() => {
        if(accessToken) {
            getObjects();
        }
        else{
            setSign(false);
        }
    }, [accessToken,currentFolder]);
    useEffect(() => {
        if(accessToken)
            handleDiskSizeInfo();

    },[accessToken,files,folders])
    useEffect(() => {
        if (searchQuery)
            handleFileSearch();
    },[searchQuery])
    const handleLogin = () => {
        try {
            const width = 600;
            const height = 600;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);
            const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&force_confirm=yes`;
            window.open(authUrl, 'yandexAuthWindow', `width=${width},height=${height},left=${left},top=${top}`);
            window.handleAuthCallback = handleAuthCallback;
        }catch (e) {
            console.error(e);
        }
    }
    const handleAuthCallback = (code) => {
        setCode(code);
    }
    const handleGetAccessToken = async (code) => {
        try {
            const data = new URLSearchParams();
            data.append('grant_type', 'authorization_code');
            data.append('code', code);
            data.append('client_id', CLIENT_ID);
            data.append('client_secret', CLIENT_SECRET);
            await axios.post('https://oauth.yandex.ru/token',data.toString(),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(res => {
                setAccessToken(res.data.access_token);
                setSign(true);
            }).catch(err => console.error(err));
        } catch (error) {
            console.error(error);
        }
    }

    const handleLogOut = () => {
        setAccessToken(null);
        setCode(null);
        setSign(false);
    }

    const getObjects = async () => {
        try {
            let path;
            if(currentFolder)
                path = currentFolder.key;
            else
                path = 'disk:/';

            await axios.get(BASE_URL, {
                headers: {
                    'Authorization': `OAuth ${accessToken}`
                },
                params: {
                    path,
                    fields: '_embedded'
                }
            }).then(res => {
                const foldersList = res.data._embedded.items.filter(item => item.type === 'dir');
                setFolders(
                    foldersList.map((folder) => ({
                        key: folder.path,
                        name: folder.name,
                        createdTime: folder.modified,
                        size: '-',
                        type: "folder",
                    }))
                )
                const filesList = res.data._embedded.items.filter(item => item.type === 'file');
                setFiles(
                filesList.map((file) => ({
                    key: file.path,
                    name: file.name,
                    size: file.size,
                    createdTime: file.modified,
                    type: "file",
                })))
            }).catch(e => console.error(e))
        }catch (e) {
            console.error(e)
        }
    }

    const handleNavigateClick = (folder) => {
        setCurrentFolder(folder);
    };
    const handleBackClick = () => {
        setCurrentFolder(null);
    };
    const handleRenameClick = (record) => {
        setNewNameRecord(record);
        setNewNameModalVisible(true);
    };
    const handleRenameOkClick = async () => {
        try {
            const newName = newNameForm.getFieldValue('Name');
            const record = newNameRecord;
            const oldPath = record.key;
            const newPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1) + newName;
            await axios.post(`${BASE_URL}/move?from=${encodeURIComponent(oldPath)}&path=${encodeURIComponent(newPath)}`, null,
            {
                headers: {
                    'Authorization': `OAuth ${accessToken}`
                },
            }).then(res => console.log(res))
            if (record.type === "folder") {
                setFolders(
                    folders.map((folder) =>
                        folder.key === record.key ? { ...folder, name: newName } : folder
                    )
                );
            } else {
                setFiles(
                    files.map((file) => (file.key === record.key ? { ...file, name: newName } : file))
                );
            }
            newNameForm.resetFields();
            setNewNameRecord(null);
            setNewNameModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    }
    const handleRenameCancelClick = () => {
        newNameForm.resetFields();
        setNewNameRecord(null);
        setNewNameModalVisible(false);
    }
    const handleDeleteClick = async (record) => {
        try {
            await axios.delete(`${BASE_URL}?path=${record.key}`,
                {
                    headers: {
                        Authorization: `OAuth ${accessToken}`,
                    },
                }
            );
            if (record.type === "folder") {
                setFolders(folders.filter((folder) => folder.key !== record.key));
            } else {
                setFiles(files.filter((file) => file.key !== record.key));
            }
        } catch (error) {
            console.error(error);
        }
    }
    const handleNewFolderClick = () => {
        setNewFolderModalVisible(true);
    };
    const handleNewFolderOkClick = async () => {
        try {
            let path;
            if(currentFolder){
                path = currentFolder.key + "/";
            }
            else{
                path = "disk:/";
            }
            const folderName = path + newFolderForm.getFieldValue("name")
            const headers = {
                Authorization: `OAuth ${accessToken}`
            }
            await axios.put(`${BASE_URL}?path=${folderName}`,null, {
                headers
            }).then(res => setFolders([
                ...folders,
                {
                    key: folderName,
                    name: newFolderForm.getFieldValue("name"),
                    createdTime: new Date().toString(),
                    size: '-',
                    type: "folder",
                },
            ])).catch(err => console.error(err))
            newFolderForm.resetFields();
            setNewFolderModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };
    const handleNewFolderCancelClick = () => {
        newFolderForm.resetFields();
        setNewFolderModalVisible(false);
    };
    const handleUploadFileClick = () => {
        setUploadFileModalVisible(true);
    };
    const handleUploadingFileChange = (event) => {
        setUploadingFile(event.target.files[0]);
    }
    const handleUploadFileOkClick = async () => {
        try {
            let path;
            if(currentFolder){
                path = currentFolder.key + "/";
            }
            else{
                path = "disk:/";
            }
            path = path + uploadingFile.name;
            await axios.get(`${UPLOAD_URL}?path=${path}`, {
                headers: {
                    'Authorization': `OAuth ${accessToken}`
                }
            }).then(async res => {
                await axios.put(res.data.href, uploadingFile, {
                    headers: {
                        'Content-Type': uploadingFile.type,
                        'Authorization': `OAuth ${accessToken}`
                    }
                }).then(res=>{
                    setFiles([
                        ...files,
                        {
                            key: path,
                            name: uploadingFile.name,
                            createdTime: new Date().toString(),
                            size: uploadingFile.size,
                            type: "file"
                        },
                    ]);
                }).catch(e => console.log(e));;
            })
            uploadFileForm.resetFields();
            setUploadFileModalVisible(false);
            setUploadingFile(null);
        } catch (error) {
            console.error(error);
        }
    };
    const handleUploadFileCancelClick = () => {
        uploadFileForm.resetFields();
        setUploadFileModalVisible(false);
        setUploadingFile(null);
    };
    const handleGlobalUpload = async () => {
        try {
            let path;
            if (currentFolder) {
                path = currentFolder.key + "/";
            } else {
                path = "disk:/";
            }
            path = path + fileToUpload.name;
            await axios.get(`${UPLOAD_URL}?path=${path}`, {
                headers: {
                    'Authorization': `OAuth ${accessToken}`
                }
            }).then(async res => {
                await axios.put(res.data.href, fileToUpload, {
                    headers: {
                        'Content-Type': fileToUpload.type,
                        'Authorization': `OAuth ${accessToken}`
                    }
                }).then(res=>{
                    setFiles([
                        ...files,
                        {
                            key: path,
                            name: fileToUpload.name,
                            createdTime: new Date().toString(),
                            size: fileToUpload.size,
                            type: "file"
                        },
                    ]);
                }).catch(e=>console.log(e));;
            })
            setFileToUpload(null);
            setToUpload(false);
        } catch (error) {
            console.error(error);
        }
    }
    const handleSendToGoogle = async (record) => {
        try {
            const path = record.key;
            await axios.get(
                `${BASE_URL}/download?path=${encodeURIComponent(path)}`,
                {headers: {Authorization: `OAuth ${accessToken}`}}
            ).then(async res => {
                const linkFile = res.data.href;
                await axios.get(linkFile, {responseType: 'blob'}).then(result => {
                    const contentType = result.headers['content-type'];
                    const fileData = new Blob([result.data], { type: contentType });
                    const sendFile = {
                        data: fileData,
                        name: record.name
                    }
                    setFileToSend(sendFile);
                })
            })
        }catch (e){
            console.error(e);
        }
    }
    const handleDownloadClick = async (record) => {
        try {
            const path = record.key;
            await axios.get(
                `${BASE_URL}/download?path=${encodeURIComponent(path)}`,
                { headers: { Authorization: `OAuth ${accessToken}` } }
            ).then(async res => {
                await axios.get(res.data.href, { responseType: 'blob' }).then(result => {
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(new Blob([result.data]));
                    link.setAttribute('download', path.split('/').pop());
                    document.body.appendChild(link);
                    link.click();
                });
            }).catch(err => console.error(err));
        }catch(e) {
            console.error(e)
        }
    }

    const handleGetFromGoogle = async () => {
      try{
          let path;
          if (currentFolder) {
              path = currentFolder.key + "/";
          } else {
              path = "disk:/";
          }
          path = path + fileToGet.name;
          await axios.get(`${UPLOAD_URL}?path=${path}`, {
              headers: {
                  'Authorization': `OAuth ${accessToken}`
              }
          }).then(async res => {
              await axios.put(res.data.href, fileToGet.data, {
                  headers: {
                      'Content-Type': fileToGet.data.type,
                      'Authorization': `OAuth ${accessToken}`
                  }
              }).then(res => {
                  setFiles([
                      ...files,
                      {
                          key: path,
                          name: fileToGet.name,
                          createdTime: new Date().toString(),
                          size: fileToGet.data.size,
                          type: "file"
                      },
                  ]);
                  setFileToGet(null);
              })
          })

      }catch (e) {
          console.error(e);
      }
    }

    // const handleSearch = (value) => {
    //     setSearchQuery(value);
    // };
    const handleFileSearch = async () => {
        try {
            await axios.get(`${BASE_URL}/files`, {
                headers: { Authorization: `OAuth ${accessToken}` }
            }).then(res => {
                let filesSearch = res.data.items;
                const searchName = searchQuery.toLowerCase();
                filesSearch = filesSearch.filter(file => file.name.toLowerCase().includes(searchName));
                let filesList = filesSearch.filter(file => file.type === 'file');
                filesList = filesList.map((file) => ({
                    key: file.path,
                    name: file.name,
                    size: file.size,
                    createdTime: file.modified,
                    type: "file",
                }))
                setSearchFiles([
                    ...filesList
                ])
                });
        }catch (e) {
            console.error(e);
        }
    }
    const handleDiskSizeInfo = async () => {
        await axios.get(`https://cloud-api.yandex.net/v1/disk`, {
            headers: {
                'Authorization': `OAuth ${accessToken}`
            },
            params: {
                fields: 'data'
            }
        }).then(res => {
            setSizeInfo(res.data);
            setInfo(res.data);
        }).catch(err => console.error(err));
    }
    const sizeRender = (size) => {
        const sizeUnits = ['KB','MB','GB'];
        let i = -1;
        do{
            size = size / 1024;
            i++;
        }while(size > 1024);
        return Math.max(size,0.1).toFixed(1)+''+sizeUnits[i];
    }
    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            width: 300,
            render: (text, record) =>
                record.type === "folder" ? (
                    <Button className={"link-btn"} type="link" onClick={() => handleNavigateClick(record)}>{text}</Button>
                ) : (text)
        },
        {
            title: "Created Date",
            dataIndex: "createdTime",
            key: "createdTime",
            render: time => new Date(time).toLocaleString()
        },
        {
            title: "Size",
            dataIndex: "size",
            key: "size",
            render: (text, record) => record.type !== 'folder' ? (sizeRender(text)) : (text)
        },
        {
            title: "Actions",
            dataIndex: "",
            key: "actions",
            render: (text, record) => (
                <div>
                    {record.type !== 'folder'? (<Button onClick={() => handleDownloadClick(record)}>Download</Button>) : (<></>)}
                    <Button onClick={() => handleRenameClick(record)}>Rename</Button>
                    <Button onClick={() => handleDeleteClick(record)}>Delete</Button>
                    {allSigned && record.type !== 'folder' && canService &&
                        <div>
                            <Button onClick={() => handleSendToGoogle(record)}>Copy to Google</Button>
                        </div>
                    }
                </div>
            ),
        },
    ];
    return (
        <>
            {!accessToken && <Button onClick={handleLogin}>LogIn</Button>}
            {accessToken && <>
                <h2 className={"headers-position"}>{currentFolder ? currentFolder.name : "Яндекс.Диск"}</h2>
                {/*<h3 className={"headers-position"}>Limit: {sizeInfo ? sizeRender(sizeInfo.total_space) : ''}</h3>*/}
                {/*<h3 className={"headers-position"}>Usage: {sizeInfo ? sizeRender(sizeInfo.used_space) : ''}</h3>*/}
                {/*<h3 className={"headers-position"}>Free: {sizeInfo ? sizeRender(sizeInfo.total_space-sizeInfo.used_space) : ''}</h3>*/}
                {/*<Input.Search*/}
                {/*    placeholder="Search files and folders"*/}
                {/*    value={searchQuery}*/}
                {/*    onChange={e => handleSearch(e.target.value)}*/}
                {/*/>*/}
                {currentFolder && (
                    <>
                        <Button onClick={handleBackClick}>Back</Button>
                    </>
                )}
                <Button onClick={handleNewFolderClick}>New Folder</Button>
                <Button onClick={handleUploadFileClick}>Upload File</Button>
                <Modal
                    open={newFolderModalVisible}
                    onOk={handleNewFolderOkClick}
                    onCancel={handleNewFolderCancelClick}
                    title="New folder">
                    <Form form={newFolderForm}>
                        <Form.Item label="Name" name="name" rules={[{ required: true, message: "Please input folder name" }]}>
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
                <Modal
                    open={uploadFileModalVisible}
                    onOk={handleUploadFileOkClick}
                    onCancel={handleUploadFileCancelClick}
                    title="Upload file">
                    <Form form={uploadFileForm}>
                        <Form.Item label="File" name="file" rules={[{ required: true, message: "Please select file" }]}>
                            <Input type="file" onChange={handleUploadingFileChange} />
                        </Form.Item>
                    </Form>
                </Modal>
                <Modal
                    open={newNameModalVisible}
                    onOk={handleRenameOkClick}
                    onCancel={handleRenameCancelClick}
                    title="New name">
                    <Form form={newNameForm}>
                        <Form.Item label="Name" name="Name" rules={[{ required: true, message: "Please select new name" }]}>
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
                {searchQuery!=='' ? (<Table dataSource={searchFiles} columns={columns}/>) : (<Table dataSource={[...folders,...files]} columns={columns}/>)}
                <Button onClick={handleLogOut}>LogOut</Button>
            </>
            }
        </>
    );
};
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if (code) {
    window.opener.handleAuthCallback(code);
    window.close();
}
